"""
main.py — Полноценное FastAPI-приложение для кредитного конвейера Альфа-Банка.
Оборачивает core_conveyor.py и реализует все эндпоинты по MASTER_SPEC.md:
- Пресеты (God-Bar)
- FSM и жизненный цикл заявок
- Моки внешних сервисов (ЕГРЮЛ, ФНС, БКИ, Господдержка)
- АРМ андеррайтера и клиентские действия
- AI-консультант с детерминированным фоллбэком
"""

from __future__ import annotations

import os
import shutil
import uuid
from contextlib import asynccontextmanager
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.core_conveyor import (
    ALTERNATIVE_PRODUCT,
    GOV_SUPPORT_NEWS,
    PRODUCT_CATALOG,
    ActionItem,
    ActorType,
    AlfaAccountsData,
    ApplicationRequest,
    ApplicationState,
    AuditLogEntry,
    BkiData,
    CompanyProfile,
    ConveyorStateMachine,
    CreditOffer,
    Decision,
    DecisionEngine,
    DecisionResult,
    EgrulData,
    EnrichmentBundle,
    FnsData,
    GovSupportItem,
    ProductConfig,
    ProductType,
    RehabilitationPlan,
    RiskGrade,
    ScoringEngine,
    ScoringFactor,
    ScoringResult,
    SyntheticPreset,
    Trigger,
    ai_fallback_answer,
    build_presets,
    get_news_for_okved,
)

# ─────────────────────────────────────────────────────────
# Serializer helper
# ─────────────────────────────────────────────────────────

def to_dict(obj: Any) -> Any:
    """Рекурсивно превращает dataclasses, Enums, lists и dicts в JSON-совместимый вид."""
    if isinstance(obj, Enum):
        return obj.value
    if is_dataclass(obj):
        return {k: to_dict(v) for k, v in asdict(obj).items()}
    if isinstance(obj, list):
        return [to_dict(x) for x in obj]
    if isinstance(obj, dict):
        return {k: to_dict(v) for k, v in obj.items()}
    return obj


# ─────────────────────────────────────────────────────────
# In-Memory Database / State Store
# ─────────────────────────────────────────────────────────

class AppDatabase:
    def __init__(self) -> None:
        self.presets: dict[str, SyntheticPreset] = {p.preset_id: p for p in build_presets()}
        self.companies: dict[str, dict[str, Any]] = {}
        self.users: dict[str, dict[str, Any]] = {}
        self.applications: dict[str, dict[str, Any]] = {}
        self.clarifications: dict[str, dict[str, Any]] = {}
        self.documents: dict[str, dict[str, Any]] = {}
        self.active_preset_id: str = "coffee_shop_ip"
        self.scoring_engine = ScoringEngine()
        self.decision_engine = DecisionEngine()

    def clear(self) -> None:
        self.companies.clear()
        self.users.clear()
        self.applications.clear()
        self.clarifications.clear()
        self.documents.clear()

    def load_preset(self, preset_id: str) -> dict[str, Any]:
        """Сброс и активация одного из 5 пресетов."""
        if preset_id not in self.presets:
            raise KeyError(f"Пресет '{preset_id}' не найден. Доступные: {list(self.presets.keys())}")

        preset = self.presets[preset_id]
        self.active_preset_id = preset_id

        # Создаем пользователей
        owner_id = str(uuid.uuid4())
        accountant_id = str(uuid.uuid4())
        underwriter_id = str(uuid.uuid4())

        self.users[owner_id] = {
            "id": owner_id,
            "role": "OWNER",
            "name": "Алексей Смирнов (Собственник)",
            "email": "owner@company.ru",
        }
        self.users[accountant_id] = {
            "id": accountant_id,
            "role": "ACCOUNTANT",
            "name": "Елена Кузнецова (Главбух)",
            "email": "accountant@company.ru",
        }
        self.users[underwriter_id] = {
            "id": underwriter_id,
            "role": "UNDERWRITER",
            "name": "Дмитрий Морозов (Андеррайтер)",
            "email": "underwriter@alfabank.ru",
        }

        # Если пресет 5 (custom_input)
        if preset.company is None or preset.application is None:
            comp_id = str(uuid.uuid4())
            app_id = str(uuid.uuid4())
            company_data = {
                "id": comp_id,
                "inn": "",
                "ogrn": "",
                "name": "Новая компания (ручной ввод)",
                "full_name": "Новая компания (ручной ввод)",
                "legal_form": "OOO",
                "okved_main": "46.90",
                "okved_description": "Торговля оптовая неспециализированная",
                "registration_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "authorized_capital": 10000.0,
                "address": "г. Москва",
                "employee_count": 1,
                "is_active": True,
            }
            self.companies[comp_id] = company_data

            app_data = {
                "id": app_id,
                "company_id": comp_id,
                "company": company_data,
                "owner_user_id": owner_id,
                "accountant_user_id": accountant_id,
                "product_type": ProductType.WORKING_CAPITAL_LOAN.value,
                "requested_amount": 1_000_000.0,
                "requested_term_months": 12,
                "gov_program_id": None,
                "state": ApplicationState.DRAFT.value,
                "scoring_result": None,
                "decision_result": None,
                "offers": [],
                "rehabilitation_plan": None,
                "enrichment_snapshots": None,
                "audit_log": [
                    {
                        "id": str(uuid.uuid4()),
                        "application_id": app_id,
                        "from_state": None,
                        "to_state": ApplicationState.DRAFT.value,
                        "trigger": "INIT_PRESET",
                        "actor_type": ActorType.SYSTEM_CONVEYOR.value,
                        "actor_id": None,
                        "details_json": {"preset_id": preset_id},
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                ],
                "clarifications": [],
                "documents": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            self.applications[app_id] = app_data
            return {
                "preset_id": preset_id,
                "company_id": comp_id,
                "owner_user_id": owner_id,
                "accountant_user_id": accountant_id,
                "application_id": app_id,
                "current_state": ApplicationState.DRAFT.value,
            }

        # Пресеты 1-4
        comp_id = str(uuid.uuid4())
        company_data = {
            "id": comp_id,
            "inn": preset.company.inn,
            "ogrn": preset.company.ogrn,
            "name": preset.company.name,
            "full_name": preset.company.full_name,
            "legal_form": preset.company.legal_form,
            "okved_main": preset.company.okved_main,
            "okved_description": preset.company.okved_description,
            "registration_date": preset.company.registration_date,
            "authorized_capital": preset.company.authorized_capital,
            "address": preset.company.address,
            "employee_count": preset.company.employee_count,
            "is_active": preset.company.is_active,
        }
        self.companies[comp_id] = company_data

        app_id = str(uuid.uuid4())

        # Прогоняем по конвейеру
        fsm = ConveyorStateMachine()
        assert preset.enrichment is not None
        assert preset.application is not None

        final_state, scoring_res, decision_res, audit_entries = fsm.run_conveyor(
            application_id=app_id,
            request=preset.application,
            enrichment=preset.enrichment,
            scoring_engine=self.scoring_engine,
            decision_engine=self.decision_engine,
        )

        app_data = {
            "id": app_id,
            "company_id": comp_id,
            "company": company_data,
            "owner_user_id": owner_id,
            "accountant_user_id": accountant_id,
            "product_type": preset.application.product_type.value,
            "requested_amount": preset.application.requested_amount,
            "requested_term_months": preset.application.requested_term_months,
            "gov_program_id": preset.application.gov_program_id,
            "state": final_state.value,
            "scoring_result": to_dict(scoring_res) if scoring_res else None,
            "decision_result": to_dict(decision_res) if decision_res else None,
            "offers": [to_dict(o) for o in (decision_res.offers if decision_res else [])],
            "rehabilitation_plan": to_dict(decision_res.rehabilitation_plan) if (decision_res and decision_res.rehabilitation_plan) else None,
            "enrichment_snapshots": to_dict(preset.enrichment),
            "audit_log": [to_dict(e) for e in audit_entries],
            "clarifications": [],
            "documents": [],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Если пресет 3 (MANUAL_REVIEW) — добавим демонстрационный запрос уточнений для демо UI
        if preset_id == "logistics_seasonal":
            clarif_id = str(uuid.uuid4())
            sample_clarification = {
                "id": clarif_id,
                "application_id": app_id,
                "question_text": "Поясните снижение выручки в весенний период и приложите ОСВ за последние 6 месяцев.",
                "required_document_type": "OSV",
                "status": "PENDING",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "response_text": None,
                "document_ids": [],
            }
            self.clarifications[clarif_id] = sample_clarification
            app_data["clarifications"].append(sample_clarification)

        self.applications[app_id] = app_data

        return {
            "preset_id": preset_id,
            "company_id": comp_id,
            "owner_user_id": owner_id,
            "accountant_user_id": accountant_id,
            "application_id": app_id,
            "current_state": final_state.value,
        }


db = AppDatabase()

# Директория загрузки файлов
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # При старте загружаем дефолтный пресет для моментальной работы UI
    db.load_preset("coffee_shop_ip")
    yield


app = FastAPI(
    title="Alfa-Bank Smart Credit Conveyor API",
    description="Backend API для кредитного конвейера малого и микробизнеса",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Монтирование папки загруженных файлов
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


# ─────────────────────────────────────────────────────────
# Pydantic Schemas
# ─────────────────────────────────────────────────────────

class ApplicationCreateRequest(BaseModel):
    company_id: Optional[str] = None
    company_inn: Optional[str] = None
    product_type: str = "WORKING_CAPITAL_LOAN"
    requested_amount: float = 1_000_000.0
    requested_term_months: int = 12
    gov_program_id: Optional[str] = None


class TransitionPayload(BaseModel):
    selected_offer_variant: Optional[int] = None
    otp_code: Optional[str] = None


class TransitionRequest(BaseModel):
    trigger: str
    actor_type: Optional[str] = "SYSTEM_CONVEYOR"
    actor_id: Optional[str] = None
    payload: Optional[TransitionPayload] = None


class ClarificationCreateRequest(BaseModel):
    question_text: str
    required_document_type: str = "OTHER"


class ClarificationRespondRequest(BaseModel):
    response_text: str
    document_ids: list[str] = []


class UnderwriterDecisionRequest(BaseModel):
    action: str  # APPROVE | REJECT | COUNTER_OFFER | REQUEST_CLARIFICATION
    comment: Optional[str] = ""
    override_offers: Optional[list[dict[str, Any]]] = None


class AiRecommendRequest(BaseModel):
    message: str
    application_id: Optional[str] = None


class DelegateRequest(BaseModel):
    accountant_name: Optional[str] = "Главный бухгалтер"
    accountant_email: Optional[str] = "accountant@company.ru"


class SignRequest(BaseModel):
    otp_code: str = "1234"


class ApplyProgramRequest(BaseModel):
    news_item_id: str


# ─────────────────────────────────────────────────────────
# Router Implementation (Unified for /api and /api/v1)
# ─────────────────────────────────────────────────────────

router = APIRouter()


# ── Health & Info ──

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_preset": db.active_preset_id,
        "applications_count": len(db.applications),
    }


# ── Presets (God-Bar) ──

@router.get("/presets")
def get_presets():
    """Получение 5 синтетических пресетов."""
    res = []
    for p in db.presets.values():
        res.append({
            "preset_id": p.preset_id,
            "label": p.label,
            "expected_outcome": p.expected_outcome,
            "company_name": p.company.name if p.company else "Свой ввод",
            "inn": p.company.inn if p.company else None,
            "description": f"Ожидаемый исход: {p.expected_outcome}",
        })
    return {"presets": res, "active_preset_id": db.active_preset_id}


@router.post("/presets/{preset_id}/activate", status_code=status.HTTP_201_CREATED)
@router.post("/presets/{preset_id}/load", status_code=status.HTTP_201_CREATED)
def activate_preset(preset_id: str):
    """Сброс и активация пресета (God-Bar)."""
    try:
        data = db.load_preset(preset_id)
        return data
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")


# ── Applications Lifecycle ──

@router.get("/applications")
def list_applications():
    """Список всех заявок."""
    return {"applications": list(db.applications.values())}


@router.post("/applications", status_code=status.HTTP_201_CREATED)
def create_application(req: ApplicationCreateRequest):
    """Создание новой кредитной заявки."""
    app_id = str(uuid.uuid4())
    comp_id = req.company_id or str(uuid.uuid4())

    company = db.companies.get(comp_id)
    if not company:
        # Автоматически создаем компанию под указанный ИНН или мок
        company = {
            "id": comp_id,
            "inn": req.company_inn or "7799001122",
            "ogrn": "1207700112233",
            "name": f"ООО «Предприятие {req.company_inn or ''}»",
            "full_name": f"Общество с ограниченной ответственностью «Предприятие {req.company_inn or ''}»",
            "legal_form": "OOO",
            "okved_main": "46.90",
            "okved_description": "Торговля оптовая",
            "registration_date": "2021-01-15",
            "authorized_capital": 100000.0,
            "address": "г. Москва",
            "employee_count": 10,
            "is_active": True,
        }
        db.companies[comp_id] = company

    owner_id = str(uuid.uuid4())
    accountant_id = str(uuid.uuid4())

    created_at = datetime.now(timezone.utc).isoformat()
    app_data = {
        "id": app_id,
        "company_id": comp_id,
        "company": company,
        "owner_user_id": owner_id,
        "accountant_user_id": accountant_id,
        "product_type": req.product_type,
        "requested_amount": req.requested_amount,
        "requested_term_months": req.requested_term_months,
        "gov_program_id": req.gov_program_id,
        "state": ApplicationState.DRAFT.value,
        "scoring_result": None,
        "decision_result": None,
        "offers": [],
        "rehabilitation_plan": None,
        "enrichment_snapshots": None,
        "audit_log": [
            {
                "id": str(uuid.uuid4()),
                "application_id": app_id,
                "from_state": None,
                "to_state": ApplicationState.DRAFT.value,
                "trigger": "CREATE",
                "actor_type": ActorType.CLIENT_OWNER.value,
                "actor_id": owner_id,
                "details_json": req.model_dump(),
                "created_at": created_at,
            }
        ],
        "clarifications": [],
        "documents": [],
        "created_at": created_at,
        "updated_at": created_at,
    }
    db.applications[app_id] = app_data
    return {"id": app_id, "state": ApplicationState.DRAFT.value, "created_at": created_at}


@router.get("/applications/{app_id}")
def get_application(app_id: str):
    """Получение полной информации по заявке."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return app_data


@router.post("/applications/{app_id}/transition")
def transition_application(app_id: str, req: TransitionRequest):
    """Выполнение перехода в State Machine заявки."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    current_state_str = app_data["state"]
    try:
        current_state = ApplicationState(current_state_str)
        trigger = Trigger(req.trigger)
        actor_type = ActorType(req.actor_type or "SYSTEM_CONVEYOR")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Недопустимое состояние или триггер: {e}")

    fsm = ConveyorStateMachine()
    if not fsm.can_transition(current_state, trigger):
        allowed = fsm.get_available_triggers(current_state)
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый переход из '{current_state.value}' по триггеру '{trigger.value}'. Доступны: {[t.value for t in allowed]}",
        )

    details = req.payload.model_dump() if req.payload else {}
    new_state, audit_entry = fsm.transition(
        application_id=app_id,
        current_state=current_state,
        trigger=trigger,
        actor_type=actor_type,
        actor_id=req.actor_id,
        details=details,
    )

    app_data["state"] = new_state.value
    app_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    app_data["audit_log"].append(to_dict(audit_entry))

    # Дополнительная логика триггеров
    if trigger == Trigger.ACCEPT_OFFER and req.payload and req.payload.selected_offer_variant is not None:
        app_data["selected_offer_variant"] = req.payload.selected_offer_variant

    return {
        "application_id": app_id,
        "previous_state": current_state.value,
        "new_state": new_state.value,
        "trigger": trigger.value,
        "audit_log_entry_id": audit_entry.id,
    }


@router.post("/applications/{app_id}/enrich")
def enrich_application(app_id: str):
    """Обогащение заявки внешними данными (ФНС, ЕГРЮЛ, БКИ, Обороты)."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    company = app_data.get("company", {})
    inn = company.get("inn", "")

    # Ищем, есть ли пресет с таким ИНН
    matching_preset = next((p for p in db.presets.values() if p.company and p.company.inn == inn and p.enrichment), None)

    if matching_preset and matching_preset.enrichment:
        bundle = matching_preset.enrichment
    else:
        # Генерируем типовой бандл обогащения
        bundle = EnrichmentBundle(
            egrul=EgrulData(
                registration_date=company.get("registration_date", "2020-01-01"),
                authorized_capital=company.get("authorized_capital", 100000.0),
                okved_main=company.get("okved_main", "46.90"),
                is_liquidating=False,
            ),
            fns=FnsData(tax_blocks=[], tax_discrepancies=0, employee_count=company.get("employee_count", 10)),
            bki=BkiData(
                active_loans=1,
                total_monthly_payment=35000.0,
                overdue_0=True,
                overdue_30=False,
                overdue_60=False,
                overdue_90_plus=False,
                credit_history_months=36,
            ),
            alfa_accounts=AlfaAccountsData(
                monthly_revenue=[1.5e6, 1.6e6, 1.7e6, 1.65e6, 1.8e6, 1.75e6,
                                 1.9e6, 2.0e6, 1.85e6, 2.1e6, 2.2e6, 2.3e6],
                avg_balance=650000.0,
                unique_counterparties=22,
                tax_payments_regular=True,
            ),
        )

    app_data["enrichment_snapshots"] = to_dict(bundle)
    app_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    return {
        "application_id": app_id,
        "sources_fetched": ["egrul", "fns", "bki", "alfa_accounts"],
        "enrichment_snapshot_id": str(uuid.uuid4()),
        "enrichment": to_dict(bundle),
    }


@router.get("/applications/{app_id}/scoring")
def get_scoring(app_id: str):
    """Расчет и получение детального скоринга."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if app_data.get("scoring_result"):
        return app_data["scoring_result"]

    # Если обогащение не запускалось, запустим
    if not app_data.get("enrichment_snapshots"):
        enrich_application(app_id)

    bundle_dict = app_data["enrichment_snapshots"]
    bundle = EnrichmentBundle(
        egrul=EgrulData(**bundle_dict["egrul"]),
        fns=FnsData(**bundle_dict["fns"]),
        bki=BkiData(**bundle_dict["bki"]),
        alfa_accounts=AlfaAccountsData(**bundle_dict["alfa_accounts"]),
    )

    scoring_res = db.scoring_engine.score(bundle)
    app_data["scoring_result"] = to_dict(scoring_res)
    app_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    return app_data["scoring_result"]


@router.get("/applications/{app_id}/decision")
def get_decision(app_id: str):
    """Расчет и получение кредитного решения и офферов."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if app_data.get("decision_result"):
        return app_data["decision_result"]

    scoring_dict = get_scoring(app_id)
    scoring_res = ScoringResult(
        risk_score=scoring_dict["risk_score"],
        pd=scoring_dict["pd"],
        risk_grade=RiskGrade(scoring_dict["risk_grade"]),
        stop_factors=scoring_dict["stop_factors"],
        factors_breakdown=[ScoringFactor(**f) for f in scoring_dict["factors_breakdown"]],
    )

    bundle_dict = app_data["enrichment_snapshots"]
    bundle = EnrichmentBundle(
        egrul=EgrulData(**bundle_dict["egrul"]),
        fns=FnsData(**bundle_dict["fns"]),
        bki=BkiData(**bundle_dict["bki"]),
        alfa_accounts=AlfaAccountsData(**bundle_dict["alfa_accounts"]),
    )

    req = ApplicationRequest(
        company_inn=app_data["company"]["inn"],
        product_type=ProductType(app_data["product_type"]),
        requested_amount=app_data["requested_amount"],
        requested_term_months=app_data["requested_term_months"],
        gov_program_id=app_data.get("gov_program_id"),
    )

    decision_res = db.decision_engine.decide(scoring_res, req, bundle)
    app_data["decision_result"] = to_dict(decision_res)
    app_data["offers"] = [to_dict(o) for o in decision_res.offers]
    app_data["rehabilitation_plan"] = to_dict(decision_res.rehabilitation_plan) if decision_res.rehabilitation_plan else None
    app_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    return app_data["decision_result"]


@router.get("/applications/{app_id}/audit")
def get_audit_log(app_id: str):
    """История аудита по заявке."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    return {"audit_log": app_data.get("audit_log", [])}


# ── Underwriter Actions & Queue ──

@router.get("/underwriter/queue")
def get_underwriter_queue():
    """Очередь заявок для андеррайтера (в ручном разборе или требующие внимания)."""
    res = []
    for app in db.applications.values():
        if app.get("state") in (ApplicationState.MANUAL_REVIEW.value, ApplicationState.RESUBMITTED.value, ApplicationState.NEED_CLARIFICATION.value):
            scoring = app.get("scoring_result") or {}
            dec = app.get("decision_result") or {}
            res.append({
                "id": app["id"],
                "company_name": app.get("company", {}).get("name", "Не указано"),
                "inn": app.get("company", {}).get("inn", ""),
                "product_type": app.get("product_type"),
                "requested_amount": app.get("requested_amount"),
                "risk_grade": scoring.get("risk_grade", "C"),
                "risk_score": scoring.get("risk_score", 500),
                "state": app.get("state"),
                "soft_flags": dec.get("soft_flags", []),
                "created_at": app.get("created_at"),
            })
    return {"applications": res}


@router.post("/underwriter/applications/{app_id}/decide")
def underwriter_decide(app_id: str, req: UnderwriterDecisionRequest):
    """Принятие решения андеррайтером в ручном режиме."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    action = req.action.upper()
    action_map = {
        "APPROVE": (Trigger.UNDERWRITER_APPROVE, ApplicationState.APPROVED),
        "REJECT": (Trigger.UNDERWRITER_REJECT, ApplicationState.REJECTED),
        "COUNTER_OFFER": (Trigger.UNDERWRITER_COUNTER_OFFER, ApplicationState.COUNTER_OFFER),
        "REQUEST_CLARIFICATION": (Trigger.REQUEST_CLARIFICATION, ApplicationState.NEED_CLARIFICATION),
    }

    if action not in action_map:
        raise HTTPException(status_code=400, detail=f"Недопустимое действие '{action}'. Допустимые: {list(action_map.keys())}")

    trigger, target_state = action_map[action]

    current_state_str = app_data["state"]
    current_state = ApplicationState(current_state_str)

    new_state = target_state.value
    entry_id = str(uuid.uuid4())
    audit_entry = {
        "id": entry_id,
        "application_id": app_id,
        "from_state": current_state_str,
        "to_state": new_state,
        "trigger": trigger.value,
        "actor_type": ActorType.BANK_UNDERWRITER.value,
        "actor_id": "underwriter_user",
        "details_json": {"comment": req.comment, "action": action},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    app_data["state"] = new_state
    app_data["audit_log"].append(audit_entry)
    app_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if req.override_offers:
        app_data["offers"] = req.override_offers

    if action == "REQUEST_CLARIFICATION":
        clarif_id = str(uuid.uuid4())
        clarif_item = {
            "id": clarif_id,
            "application_id": app_id,
            "question_text": req.comment or "Предоставьте дополнительные пояснения",
            "required_document_type": "OTHER",
            "status": "PENDING",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "response_text": None,
            "document_ids": [],
        }
        db.clarifications[clarif_id] = clarif_item
        app_data["clarifications"].append(clarif_item)

    return {
        "application_id": app_id,
        "new_state": new_state,
        "audit_log_entry_id": entry_id,
        "action": action,
    }


# ── Clarifications & Documents ──

@router.post("/applications/{app_id}/clarifications", status_code=status.HTTP_201_CREATED)
def create_clarification(app_id: str, req: ClarificationCreateRequest):
    """Андеррайтер запрашивает уточнение у клиента."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    clarif_id = str(uuid.uuid4())
    clarif_item = {
        "id": clarif_id,
        "application_id": app_id,
        "question_text": req.question_text,
        "required_document_type": req.required_document_type,
        "status": "PENDING",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "response_text": None,
        "document_ids": [],
    }
    db.clarifications[clarif_id] = clarif_item
    app_data["clarifications"].append(clarif_item)

    # Переводим в NEED_CLARIFICATION
    if app_data["state"] in (ApplicationState.MANUAL_REVIEW.value, ApplicationState.VALIDATION.value):
        app_data["state"] = ApplicationState.NEED_CLARIFICATION.value
        app_data["audit_log"].append({
            "id": str(uuid.uuid4()),
            "application_id": app_id,
            "from_state": ApplicationState.MANUAL_REVIEW.value,
            "to_state": ApplicationState.NEED_CLARIFICATION.value,
            "trigger": Trigger.REQUEST_CLARIFICATION.value,
            "actor_type": ActorType.BANK_UNDERWRITER.value,
            "actor_id": "underwriter",
            "details_json": {"clarification_id": clarif_id, "question": req.question_text},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return {
        "clarification_id": clarif_id,
        "status": "PENDING",
        "application_new_state": app_data["state"],
    }


@router.post("/clarifications/{clarif_id}/respond")
def respond_clarification(clarif_id: str, req: ClarificationRespondRequest):
    """Клиент отвечает на уточнение (загрузка документа или текст)."""
    clarif = db.clarifications.get(clarif_id)
    if not clarif:
        raise HTTPException(status_code=404, detail="Запрос уточнения не найден")

    clarif["status"] = "RESPONDED"
    clarif["response_text"] = req.response_text
    clarif["document_ids"] = req.document_ids
    clarif["responded_at"] = datetime.now(timezone.utc).isoformat()

    app_id = clarif["application_id"]
    app_data = db.applications.get(app_id)
    if app_data:
        # Переводим в RESUBMITTED
        old_state = app_data["state"]
        app_data["state"] = ApplicationState.RESUBMITTED.value
        app_data["audit_log"].append({
            "id": str(uuid.uuid4()),
            "application_id": app_id,
            "from_state": old_state,
            "to_state": ApplicationState.RESUBMITTED.value,
            "trigger": Trigger.CLIENT_RESPONDED.value,
            "actor_type": ActorType.CLIENT_OWNER.value,
            "actor_id": "client",
            "details_json": {"clarification_id": clarif_id, "response": req.response_text},
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Обновляем в списке уточнений внутри заявки
        for c in app_data["clarifications"]:
            if c["id"] == clarif_id:
                c.update(clarif)

    return {
        "clarification_id": clarif_id,
        "status": "RESPONDED",
        "application_new_state": app_data["state"] if app_data else None,
    }


@router.post("/applications/{app_id}/documents", status_code=status.HTTP_201_CREATED)
async def upload_document(
    app_id: str,
    file: UploadFile = File(...),
    doc_type: str = Form("OTHER"),
    uploaded_by: str = Form("CLIENT_OWNER"),
):
    """Загрузка подтверждающего документа."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    file_path = UPLOAD_DIR / safe_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_entry = {
        "document_id": doc_id,
        "filename": file.filename,
        "doc_type": doc_type,
        "uploaded_by": uploaded_by,
        "url": f"/uploads/{safe_filename}",
        "size_bytes": file_path.stat().st_size,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    db.documents[doc_id] = doc_entry
    app_data["documents"].append(doc_entry)
    app_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    return doc_entry


# ── Client Delegations & Signing ──

@router.post("/applications/{app_id}/delegate")
def delegate_to_accountant(app_id: str, req: DelegateRequest):
    """Собственник делегирует заявку бухгалтеру."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    accountant_id = app_data.get("accountant_user_id") or str(uuid.uuid4())
    app_data["accountant_user_id"] = accountant_id
    app_data["delegated_to_accountant"] = True

    app_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "application_id": app_id,
        "from_state": app_data["state"],
        "to_state": app_data["state"],
        "trigger": "DELEGATE_TO_ACCOUNTANT",
        "actor_type": ActorType.CLIENT_OWNER.value,
        "actor_id": app_data.get("owner_user_id"),
        "details_json": {"accountant_name": req.accountant_name, "accountant_email": req.accountant_email},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "success": True,
        "message": f"Заявка успешно делегирована бухгалтеру ({req.accountant_name})",
        "accountant_user_id": accountant_id,
    }


@router.post("/applications/{app_id}/sign")
def sign_contract(app_id: str, req: SignRequest):
    """Подписание кредитного договора простой электронной подписью (ПЭП / SMS OTP)."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    if not req.otp_code or len(req.otp_code) < 4:
        raise HTTPException(status_code=400, detail="Неверный OTP-код подтверждения")

    old_state = app_data["state"]
    signed_state = ApplicationState.CONTRACT_SIGNED.value
    funded_state = ApplicationState.FUNDED.value
    now_iso = datetime.now(timezone.utc).isoformat()
    app_data["signed_at"] = now_iso
    app_data["disbursed_at"] = now_iso
    app_data["state"] = funded_state

    # 1. Запись подписания договора ПЭП
    app_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "application_id": app_id,
        "from_state": old_state,
        "to_state": signed_state,
        "trigger": Trigger.SIGN_CONTRACT.value,
        "actor_type": ActorType.CLIENT_OWNER.value,
        "actor_id": app_data.get("owner_user_id"),
        "details_json": {"otp_code_masked": "****", "signed_at": now_iso},
        "created_at": now_iso,
    })

    # 2. Автоматическое зачисление средств конвейером (DISBURSE)
    app_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "application_id": app_id,
        "from_state": signed_state,
        "to_state": funded_state,
        "trigger": Trigger.DISBURSE.value,
        "actor_type": ActorType.SYSTEM_CONVEYOR.value,
        "actor_id": None,
        "details_json": {"disbursed_at": now_iso, "disbursement_status": "EXECUTED"},
        "created_at": now_iso,
    })

    return {
        "application_id": app_id,
        "state": funded_state,
        "message": "Кредитный договор успешно подписан ПЭП. Финансирование зачислено на расчётный счёт.",
    }


# ── Gov Support Programs ──

@router.get("/news")
def get_gov_support_news(okved_prefix: str = "ALL"):
    """Лента программ господдержки с фильтром по ОКВЭД."""
    items = get_news_for_okved(okved_prefix)
    return {"items": [to_dict(x) for x in items]}


@router.post("/applications/{app_id}/apply-program")
def apply_gov_program(app_id: str, req: ApplyProgramRequest):
    """Применить программу господдержки к заявке."""
    app_data = db.applications.get(app_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    program = next((x for x in GOV_SUPPORT_NEWS if x.id == req.news_item_id), None)
    if not program:
        raise HTTPException(status_code=404, detail="Программа господдержки не найдена")

    rate_adjustment = 0.0
    if program.max_rate_pct is not None:
        rate_adjustment = -3.0  # Субсидирование снижает эффективную ставку

    app_data["gov_program_id"] = program.id
    app_data["gov_program_title"] = program.title
    app_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Пересчитываем офферы с субсидией
    if app_data.get("scoring_result") and app_data.get("enrichment_snapshots"):
        scoring_res = ScoringResult(
            risk_score=app_data["scoring_result"]["risk_score"],
            pd=app_data["scoring_result"]["pd"],
            risk_grade=RiskGrade(app_data["scoring_result"]["risk_grade"]),
            stop_factors=app_data["scoring_result"]["stop_factors"],
            factors_breakdown=[ScoringFactor(**f) for f in app_data["scoring_result"]["factors_breakdown"]],
        )
        bundle_dict = app_data["enrichment_snapshots"]
        bundle = EnrichmentBundle(
            egrul=EgrulData(**bundle_dict["egrul"]),
            fns=FnsData(**bundle_dict["fns"]),
            bki=BkiData(**bundle_dict["bki"]),
            alfa_accounts=AlfaAccountsData(**bundle_dict["alfa_accounts"]),
        )
        request_obj = ApplicationRequest(
            company_inn=app_data["company"]["inn"],
            product_type=ProductType(app_data["product_type"]),
            requested_amount=app_data["requested_amount"],
            requested_term_months=app_data["requested_term_months"],
            gov_program_id=program.id,
        )
        decision_res = db.decision_engine.decide(scoring_res, request_obj, bundle, gov_rate_adjustment=rate_adjustment)
        app_data["decision_result"] = to_dict(decision_res)
        app_data["offers"] = [to_dict(o) for o in decision_res.offers]

    app_data["audit_log"].append({
        "id": str(uuid.uuid4()),
        "application_id": app_id,
        "from_state": app_data["state"],
        "to_state": app_data["state"],
        "trigger": "APPLY_GOV_PROGRAM",
        "actor_type": ActorType.CLIENT_OWNER.value,
        "actor_id": app_data.get("owner_user_id"),
        "details_json": {"program_id": program.id, "title": program.title, "rate_adjustment": rate_adjustment},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "application_id": app_id,
        "gov_program_id": program.id,
        "rate_adjustment": rate_adjustment,
        "message": f"Программа «{program.title}» успешно подключена к заявке",
    }


# ── AI Advisor ──

@router.post("/ai/recommend")
@router.post("/ai/chat")
def ai_recommend(req: AiRecommendRequest):
    """Детерминированный AI-советник (мгновенный ответ без GPU и API-ключей)."""
    ans = ai_fallback_answer(req.message)

    # Если указан application_id, персонализируем ответ контекстом
    if req.application_id and req.application_id in db.applications:
        app_info = db.applications[req.application_id]
        scoring = app_info.get("scoring_result")
        if scoring:
            grade = scoring.get("risk_grade")
            ans["context_hint"] = f"Текущий кредитный рейтинг компании: Grade {grade} (Score {scoring.get('risk_score')}/1000)."

    return ans


# ── Mocks Endpoints ──

@router.get("/mocks/egrul/{inn}")
def mock_egrul(inn: str):
    """Мок ЕГРЮЛ по ИНН компании."""
    match = next((p for p in db.presets.values() if p.company and p.company.inn == inn), None)
    if match and match.company and match.enrichment:
        return {
            "inn": match.company.inn,
            "ogrn": match.company.ogrn,
            "name": match.company.name,
            "full_name": match.company.full_name,
            "legal_form": match.company.legal_form,
            "okved_main": match.company.okved_main,
            "registration_date": match.company.registration_date,
            "authorized_capital": match.company.authorized_capital,
            "employee_count": match.company.employee_count,
            "is_liquidating": match.enrichment.egrul.is_liquidating,
            "founders": match.enrichment.egrul.founders,
        }
    return {
        "inn": inn,
        "ogrn": f"1207700{inn[:6]}",
        "name": f"ООО «Партнёр-{inn[-4:]}»",
        "full_name": f"Общество с ограниченной ответственностью «Партнёр-{inn[-4:]}»",
        "legal_form": "OOO" if len(inn) == 10 else "IP",
        "okved_main": "46.90",
        "registration_date": "2020-03-10",
        "authorized_capital": 50000.0 if len(inn) == 10 else None,
        "employee_count": 15,
        "is_liquidating": False,
        "founders": [{"name": "Петров А.А.", "share_pct": 100}],
    }


@router.get("/mocks/fns/{inn}")
def mock_fns(inn: str):
    """Мок ФНС по ИНН компании."""
    match = next((p for p in db.presets.values() if p.company and p.company.inn == inn), None)
    if match and match.enrichment:
        return to_dict(match.enrichment.fns)
    return {
        "tax_blocks": [],
        "tax_discrepancies": 0,
        "employee_count": 15,
        "status": "CLEAR",
    }


@router.get("/mocks/bki/{inn}")
def mock_bki(inn: str):
    """Мок БКИ по ИНН компании."""
    match = next((p for p in db.presets.values() if p.company and p.company.inn == inn), None)
    if match and match.enrichment:
        return to_dict(match.enrichment.bki)
    return {
        "active_loans": 1,
        "total_monthly_payment": 45000.0,
        "overdue_0": True,
        "overdue_30": False,
        "overdue_60": False,
        "overdue_90_plus": False,
        "credit_history_months": 36,
    }


@router.get("/mocks/news/{okved}")
def mock_news_by_okved(okved: str):
    """Мок новостей господдержки по коду ОКВЭД."""
    items = get_news_for_okved(okved)
    return {"items": [to_dict(x) for x in items]}


# ─────────────────────────────────────────────────────────
# Register Routers (Both /api and /api/v1 for 100% compatibility)
# ─────────────────────────────────────────────────────────

app.include_router(router, prefix="/api")
app.include_router(router, prefix="/api/v1")
app.include_router(router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
