"""
core_conveyor.py — Ядро кредитного конвейера.

Содержит:
  - ScoringEngine:  risk_score → pd → grade → factors_breakdown
  - DecisionEngine: credit decision + counter-offer generation
  - ConveyorStateMachine: validated FSM transitions + audit
  - SYNTHETIC_PRESETS: 5 demo profiles with enrichment data

НЕ ИМЕЕТ внешних зависимостей кроме stdlib.
Flash-модель оборачивает в FastAPI-роуты, SQLAlchemy-модели и БД.
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from typing import Any


# ─────────────────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────────────────

class ApplicationState(str, Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    VALIDATION = "VALIDATION"
    ENRICHMENT = "ENRICHMENT"
    SCORING_AND_POLICY = "SCORING_AND_POLICY"
    APPROVED = "APPROVED"
    COUNTER_OFFER = "COUNTER_OFFER"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    NEED_CLARIFICATION = "NEED_CLARIFICATION"
    RESUBMITTED = "RESUBMITTED"
    REJECTED = "REJECTED"
    OFFER_ACCEPTED = "OFFER_ACCEPTED"
    CONTRACT_SIGNED = "CONTRACT_SIGNED"
    FUNDED = "FUNDED"
    CANCELLED = "CANCELLED"


class Trigger(str, Enum):
    SUBMIT = "SUBMIT"
    AUTO_VALIDATE = "AUTO_VALIDATE"
    VALIDATION_PASSED = "VALIDATION_PASSED"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    ENRICHMENT_COMPLETE = "ENRICHMENT_COMPLETE"
    AUTO_APPROVE = "AUTO_APPROVE"
    COUNTER_OFFER_GENERATED = "COUNTER_OFFER_GENERATED"
    NEEDS_MANUAL_REVIEW = "NEEDS_MANUAL_REVIEW"
    AUTO_REJECT = "AUTO_REJECT"
    UNDERWRITER_APPROVE = "UNDERWRITER_APPROVE"
    UNDERWRITER_REJECT = "UNDERWRITER_REJECT"
    REQUEST_CLARIFICATION = "REQUEST_CLARIFICATION"
    UNDERWRITER_COUNTER_OFFER = "UNDERWRITER_COUNTER_OFFER"
    CLIENT_RESPONDED = "CLIENT_RESPONDED"
    RE_SCORE = "RE_SCORE"
    ACCEPT_OFFER = "ACCEPT_OFFER"
    SIGN_CONTRACT = "SIGN_CONTRACT"
    DISBURSE = "DISBURSE"
    CANCEL = "CANCEL"
    OFFERS_EXPIRED = "OFFERS_EXPIRED"


class ActorType(str, Enum):
    CLIENT_OWNER = "CLIENT_OWNER"
    CLIENT_ACCOUNTANT = "CLIENT_ACCOUNTANT"
    SYSTEM_CONVEYOR = "SYSTEM_CONVEYOR"
    BANK_UNDERWRITER = "BANK_UNDERWRITER"


class ProductType(str, Enum):
    OVERDRAFT = "OVERDRAFT"
    WORKING_CAPITAL_LOAN = "WORKING_CAPITAL_LOAN"
    REVOLVING_LINE_VKL = "REVOLVING_LINE_VKL"
    INVESTMENT_LOAN = "INVESTMENT_LOAN"


class RiskGrade(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"


class Decision(str, Enum):
    APPROVED = "APPROVED"
    COUNTER_OFFER = "COUNTER_OFFER"
    MANUAL_REVIEW = "MANUAL_REVIEW"
    REJECTED = "REJECTED"


# ─────────────────────────────────────────────────────────
# Data Classes
# ─────────────────────────────────────────────────────────

@dataclass
class EgrulData:
    registration_date: str  # ISO "YYYY-MM-DD"
    authorized_capital: float | None  # None for ИП
    okved_main: str
    is_liquidating: bool
    founders: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class FnsData:
    tax_blocks: list[dict[str, str]]  # [{"type","reason","date"}]
    tax_discrepancies: int
    employee_count: int


@dataclass
class BkiData:
    active_loans: int
    total_monthly_payment: float
    overdue_0: bool   # есть кредиты и 0 дней просрочки
    overdue_30: bool
    overdue_60: bool
    overdue_90_plus: bool
    credit_history_months: int = 0


@dataclass
class AlfaAccountsData:
    monthly_revenue: list[float]  # 12 значений (помесячно)
    avg_balance: float
    unique_counterparties: int
    tax_payments_regular: bool


@dataclass
class EnrichmentBundle:
    egrul: EgrulData
    fns: FnsData
    bki: BkiData
    alfa_accounts: AlfaAccountsData


@dataclass
class ScoringFactor:
    factor_name: str
    group: str  # EGRUL | FNS | BKI | TURNOVER
    raw_value: str
    score_delta: int
    max_weight: int
    description: str


@dataclass
class ScoringResult:
    risk_score: int           # 0..1000
    pd: float                 # 0.0..1.0
    risk_grade: RiskGrade
    stop_factors: list[str]
    factors_breakdown: list[ScoringFactor]


@dataclass
class CreditOffer:
    variant_index: int        # 1, 2, 3
    product_type: ProductType
    approved_amount: float
    term_months: int
    annual_rate_pct: float
    monthly_payment: float
    collateral_required: bool
    collateral_description: str | None
    description: str


@dataclass
class ActionItem:
    action: str
    deadline_days: int
    priority: str  # HIGH | MEDIUM


@dataclass
class RehabilitationPlan:
    duration_days: int
    rejection_reasons: list[str]
    action_items: list[ActionItem]
    estimated_grade_after: str
    reapply_eligible_date: str  # ISO date


@dataclass
class DecisionResult:
    decision: Decision
    max_monthly_payment: float
    max_unsecured_limit: float
    max_secured_limit: float
    dti_ratio: float
    offers: list[CreditOffer]
    rehabilitation_plan: RehabilitationPlan | None
    soft_flags: list[str]


@dataclass
class AuditLogEntry:
    id: str
    application_id: str
    from_state: str | None
    to_state: str
    trigger: str
    actor_type: str
    actor_id: str | None
    details_json: dict[str, Any]
    created_at: str  # ISO datetime


@dataclass
class ApplicationRequest:
    company_inn: str
    product_type: ProductType
    requested_amount: float
    requested_term_months: int
    gov_program_id: str | None = None


# ─────────────────────────────────────────────────────────
# Product Catalog
# ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ProductConfig:
    code: ProductType
    min_amount: float
    max_amount: float
    min_term: int
    max_term: int
    rates: dict[str, float]  # grade → annual rate %
    collateral_threshold: float | None  # сумма, выше которой нужен залог (None = не нужен)


PRODUCT_CATALOG: dict[ProductType, ProductConfig] = {
    ProductType.OVERDRAFT: ProductConfig(
        code=ProductType.OVERDRAFT,
        min_amount=50_000, max_amount=3_000_000,
        min_term=3, max_term=12,
        rates={"A": 18.0, "B": 21.0, "C": 25.0},
        collateral_threshold=None,
    ),
    ProductType.WORKING_CAPITAL_LOAN: ProductConfig(
        code=ProductType.WORKING_CAPITAL_LOAN,
        min_amount=500_000, max_amount=30_000_000,
        min_term=6, max_term=36,
        rates={"A": 16.0, "B": 19.0, "C": 23.0},
        collateral_threshold=5_000_000,
    ),
    ProductType.REVOLVING_LINE_VKL: ProductConfig(
        code=ProductType.REVOLVING_LINE_VKL,
        min_amount=300_000, max_amount=20_000_000,
        min_term=12, max_term=36,
        rates={"A": 17.0, "B": 20.0, "C": 24.0},
        collateral_threshold=3_000_000,
    ),
    ProductType.INVESTMENT_LOAN: ProductConfig(
        code=ProductType.INVESTMENT_LOAN,
        min_amount=1_000_000, max_amount=50_000_000,
        min_term=12, max_term=60,
        rates={"A": 14.0, "B": 17.0, "C": 21.0},
        collateral_threshold=3_000_000,
    ),
}

# Альтернативные продукты для Counter-Offer #3
ALTERNATIVE_PRODUCT: dict[ProductType, ProductType] = {
    ProductType.WORKING_CAPITAL_LOAN: ProductType.REVOLVING_LINE_VKL,
    ProductType.INVESTMENT_LOAN: ProductType.WORKING_CAPITAL_LOAN,
    ProductType.REVOLVING_LINE_VKL: ProductType.WORKING_CAPITAL_LOAN,
    ProductType.OVERDRAFT: ProductType.REVOLVING_LINE_VKL,
}


# ─────────────────────────────────────────────────────────
# Scoring Engine
# ─────────────────────────────────────────────────────────

# Grade boundaries: (lower, upper, pd_low, pd_high)
GRADE_BOUNDS: list[tuple[str, int, int, float, float]] = [
    ("A", 800, 1000, 0.005, 0.020),
    ("B", 650,  799, 0.020, 0.050),
    ("C", 500,  649, 0.050, 0.120),
    ("D", 350,  499, 0.120, 0.250),
    ("E",   0,  349, 0.250, 0.990),
]


class ScoringEngine:
    """Модуль 1: Risk Scoring.
    Принимает EnrichmentBundle → возвращает ScoringResult.
    Базовый балл 500, прибавляются/вычитаются взвешенные факторы.
    """

    BASE_SCORE: int = 500
    NET_MARGIN_DEFAULT: float = 0.15

    def score(self, data: EnrichmentBundle) -> ScoringResult:
        factors: list[ScoringFactor] = []
        stop_factors: list[str] = []

        # ── EGRUL: Возраст бизнеса ──
        business_age_years = self._business_age_years(data.egrul.registration_date)
        age_delta = self._age_score(business_age_years)
        factors.append(ScoringFactor(
            factor_name="Возраст бизнеса",
            group="EGRUL",
            raw_value=f"{business_age_years:.1f} лет",
            score_delta=age_delta,
            max_weight=120,
            description=self._age_description(business_age_years),
        ))

        # Стоп-фактор: возраст < 3 месяцев
        if business_age_years < 0.25:
            stop_factors.append("Возраст бизнеса менее 3 месяцев")

        # ── EGRUL: Уставный капитал ──
        cap = data.egrul.authorized_capital
        cap_delta = self._capital_score(cap)
        factors.append(ScoringFactor(
            factor_name="Уставный капитал",
            group="EGRUL",
            raw_value=f"{cap:,.0f} ₽" if cap else "Н/Д (ИП)",
            score_delta=cap_delta,
            max_weight=40,
            description=self._capital_description(cap),
        ))

        # ── EGRUL: Ликвидация ──
        if data.egrul.is_liquidating:
            stop_factors.append("Компания в процессе ликвидации/банкротства")
            factors.append(ScoringFactor(
                factor_name="Ликвидация",
                group="EGRUL",
                raw_value="Да",
                score_delta=-200,
                max_weight=-200,
                description="Компания ликвидируется",
            ))

        # ── FNS: Налоговые блокировки ──
        if data.fns.tax_blocks:
            stop_factors.append("Налоговая блокировка счёта ФНС")
            factors.append(ScoringFactor(
                factor_name="Налоговые блокировки",
                group="FNS",
                raw_value=f"{len(data.fns.tax_blocks)} блокировок",
                score_delta=-200,
                max_weight=-200,
                description="Активная блокировка счёта",
            ))
        else:
            factors.append(ScoringFactor(
                factor_name="Налоговые блокировки",
                group="FNS",
                raw_value="Нет",
                score_delta=0,
                max_weight=-200,
                description="Отсутствуют",
            ))

        # ── FNS: Налоговые разрывы ──
        disc = data.fns.tax_discrepancies
        disc_delta = 0 if disc == 0 else (-40 if disc == 1 else -100)
        factors.append(ScoringFactor(
            factor_name="Налоговые разрывы",
            group="FNS",
            raw_value=str(disc),
            score_delta=disc_delta,
            max_weight=-100,
            description=f"{disc} расхождений",
        ))

        # ── FNS: Численность ──
        emp = data.fns.employee_count
        emp_delta = self._employee_score(emp)
        factors.append(ScoringFactor(
            factor_name="Численность сотрудников",
            group="FNS",
            raw_value=str(emp),
            score_delta=emp_delta,
            max_weight=60,
            description=f"{emp} чел.",
        ))

        # ── BKI: Кредитная история ──
        if data.bki.overdue_90_plus:
            stop_factors.append("Просрочка 90+ дней в кредитной истории")
            factors.append(ScoringFactor(
                factor_name="Просрочка 90+ дней",
                group="BKI",
                raw_value="Да",
                score_delta=-200,
                max_weight=-200,
                description="Критическая просрочка",
            ))
        if data.bki.overdue_60:
            factors.append(ScoringFactor(
                factor_name="Просрочка 60 дней",
                group="BKI",
                raw_value="Да",
                score_delta=-120,
                max_weight=-120,
                description="Существенная просрочка",
            ))
        if data.bki.overdue_30:
            factors.append(ScoringFactor(
                factor_name="Просрочка 30 дней",
                group="BKI",
                raw_value="Да",
                score_delta=-60,
                max_weight=-60,
                description="Незначительная просрочка",
            ))
        if data.bki.overdue_0 and not data.bki.overdue_30:
            factors.append(ScoringFactor(
                factor_name="Чистая кредитная история",
                group="BKI",
                raw_value="0 дней просрочки",
                score_delta=100,
                max_weight=100,
                description="Действующие кредиты без просрочек",
            ))
        elif data.bki.active_loans == 0:
            factors.append(ScoringFactor(
                factor_name="Кредитная история",
                group="BKI",
                raw_value="Нет кредитов",
                score_delta=0,
                max_weight=100,
                description="Кредитная история отсутствует",
            ))

        # ── TURNOVER: Среднемесячный оборот ──
        revenues = data.alfa_accounts.monthly_revenue
        avg_rev = sum(revenues) / len(revenues) if revenues else 0
        rev_delta = self._revenue_score(avg_rev)
        factors.append(ScoringFactor(
            factor_name="Среднемесячный оборот",
            group="TURNOVER",
            raw_value=f"{avg_rev:,.0f} ₽",
            score_delta=rev_delta,
            max_weight=100,
            description=self._revenue_description(avg_rev),
        ))

        # ── TURNOVER: Тренд ──
        trend_delta, trend_pct = self._trend_score(revenues)
        factors.append(ScoringFactor(
            factor_name="Тренд оборотов (3м vs пред.3м)",
            group="TURNOVER",
            raw_value=f"{trend_pct:+.0f}%",
            score_delta=trend_delta,
            max_weight=80,
            description=f"Изменение {trend_pct:+.1f}%",
        ))

        # ── TURNOVER: Контрагенты ──
        ctr = data.alfa_accounts.unique_counterparties
        ctr_delta = self._counterparty_score(ctr)
        factors.append(ScoringFactor(
            factor_name="Уникальные контрагенты",
            group="TURNOVER",
            raw_value=str(ctr),
            score_delta=ctr_delta,
            max_weight=50,
            description=f"{ctr} контрагентов",
        ))

        # ── TURNOVER: Регулярность налоговых платежей ──
        tax_delta = 50 if data.alfa_accounts.tax_payments_regular else -30
        factors.append(ScoringFactor(
            factor_name="Регулярность налоговых платежей",
            group="TURNOVER",
            raw_value="Регулярно" if data.alfa_accounts.tax_payments_regular else "Пропуски",
            score_delta=tax_delta,
            max_weight=50,
            description="Регулярные платежи" if data.alfa_accounts.tax_payments_regular else "Нерегулярные платежи",
        ))

        # ── Итог ──
        total = self.BASE_SCORE + sum(f.score_delta for f in factors)
        total = max(0, min(1000, total))

        # Стоп-факторы принудительно ставят грейд E
        if stop_factors:
            grade = RiskGrade.E
            pd_val = 0.99
        else:
            grade = self._grade_for_score(total)
            pd_val = self._pd_for_score(total, grade)

        return ScoringResult(
            risk_score=total,
            pd=round(pd_val, 4),
            risk_grade=grade,
            stop_factors=stop_factors,
            factors_breakdown=factors,
        )

    # ── Helpers ──

    @staticmethod
    def _business_age_years(reg_date_str: str) -> float:
        reg = date.fromisoformat(reg_date_str)
        today = date.today()
        return (today - reg).days / 365.25

    @staticmethod
    def _age_score(years: float) -> int:
        if years < 1:
            return -120
        if years < 2:
            return -60
        if years < 3:
            return 0
        if years < 5:
            return 60
        if years < 10:
            return 90
        return 120

    @staticmethod
    def _age_description(years: float) -> str:
        if years < 1:
            return "Менее 1 года — высокий риск"
        if years < 3:
            return f"{years:.1f} лет — молодой бизнес"
        if years < 10:
            return f"{years:.1f} лет — зрелый бизнес"
        return f"{years:.1f} лет — устоявшийся бизнес"

    @staticmethod
    def _capital_score(cap: float | None) -> int:
        if cap is None:
            return 0  # ИП — нейтрально
        if cap <= 10_000:
            return -20
        if cap <= 100_000:
            return 0
        if cap <= 1_000_000:
            return 10
        if cap <= 10_000_000:
            return 25
        return 40

    @staticmethod
    def _capital_description(cap: float | None) -> str:
        if cap is None:
            return "ИП — уставный капитал не применим"
        return f"{cap:,.0f} ₽"

    @staticmethod
    def _employee_score(emp: int) -> int:
        if emp == 0:
            return -60
        if emp <= 5:
            return 0
        if emp <= 20:
            return 30
        return 60

    @staticmethod
    def _revenue_score(avg: float) -> int:
        if avg < 100_000:
            return -60
        if avg < 500_000:
            return 0
        if avg < 2_000_000:
            return 40
        if avg < 10_000_000:
            return 70
        return 100

    @staticmethod
    def _revenue_description(avg: float) -> str:
        if avg < 100_000:
            return "Очень низкий оборот"
        if avg < 500_000:
            return "Низкий оборот"
        if avg < 2_000_000:
            return "Средний оборот"
        if avg < 10_000_000:
            return "Хороший оборот"
        return "Высокий оборот"

    @staticmethod
    def _trend_score(monthly: list[float]) -> tuple[int, float]:
        if len(monthly) < 6:
            return 0, 0.0
        recent_3 = sum(monthly[-3:]) / 3
        prev_3 = sum(monthly[-6:-3]) / 3
        if prev_3 == 0:
            return 0, 0.0
        pct = (recent_3 - prev_3) / prev_3 * 100
        if pct < -30:
            return -80, pct
        if pct < -10:
            return -40, pct
        if pct < 10:
            return 0, pct
        if pct < 30:
            return 40, pct
        return 80, pct

    @staticmethod
    def _counterparty_score(cnt: int) -> int:
        if cnt < 3:
            return -30
        if cnt < 10:
            return 0
        if cnt < 30:
            return 25
        return 50

    @staticmethod
    def _grade_for_score(score: int) -> RiskGrade:
        for g, lo, hi, _, _ in GRADE_BOUNDS:
            if lo <= score <= hi:
                return RiskGrade(g)
        return RiskGrade.E

    @staticmethod
    def _pd_for_score(score: int, grade: RiskGrade) -> float:
        for g, lo, hi, pd_lo, pd_hi in GRADE_BOUNDS:
            if g == grade.value:
                if hi == lo:
                    return (pd_lo + pd_hi) / 2
                # pd_hi соответствует нижней границе score, pd_lo — верхней
                return pd_hi - (score - lo) / (hi - lo) * (pd_hi - pd_lo)
        return 0.99


# ─────────────────────────────────────────────────────────
# Decision Engine
# ─────────────────────────────────────────────────────────

class DecisionEngine:
    """Модуль 2: Кредитное решение и генерация контр-офферов.
    Принимает ScoringResult + ApplicationRequest + EnrichmentBundle.
    """

    DTI_LIMIT: float = 0.50
    NET_MARGIN: float = 0.15
    SECURED_MULTIPLIER: float = 2.0

    def decide(
        self,
        scoring: ScoringResult,
        request: ApplicationRequest,
        data: EnrichmentBundle,
        gov_rate_adjustment: float = 0.0,
    ) -> DecisionResult:
        product_cfg = PRODUCT_CATALOG[request.product_type]
        grade = scoring.risk_grade

        # ── Финансовые расчёты ──
        revenues = data.alfa_accounts.monthly_revenue
        avg_monthly_revenue = sum(revenues) / len(revenues) if revenues else 0
        net_monthly_income = avg_monthly_revenue * self.NET_MARGIN
        existing_payments = data.bki.total_monthly_payment

        max_monthly_payment = max(0.0, net_monthly_income * self.DTI_LIMIT - existing_payments)
        dti = (existing_payments / net_monthly_income) if net_monthly_income > 0 else 1.0

        base_rate = product_cfg.rates.get(grade.value, product_cfg.rates.get("C", 25.0))
        effective_rate = max(1.0, base_rate + gov_rate_adjustment)

        max_unsecured = self._annuity_limit(
            max_monthly_payment, effective_rate, request.requested_term_months
        )
        max_secured = max_unsecured * self.SECURED_MULTIPLIER

        # ── Soft flags для MANUAL_REVIEW ──
        soft_flags: list[str] = []
        if self._has_seasonal_volatility(revenues):
            soft_flags.append("seasonal_volatility")
        if len(data.egrul.founders) == 1:
            soft_flags.append("single_founder")
        if data.alfa_accounts.unique_counterparties < 10:
            soft_flags.append("few_counterparties")
        if data.bki.credit_history_months < 24:
            soft_flags.append("short_credit_history")

        # ── Decision Matrix ──
        offers: list[CreditOffer] = []
        rehab: RehabilitationPlan | None = None

        # 1. Стоп-факторы → REJECTED
        if scoring.stop_factors:
            decision = Decision.REJECTED
            rehab = self._build_rehabilitation_plan(scoring.stop_factors)

        # 2. Grade D/E → REJECTED
        elif grade in (RiskGrade.D, RiskGrade.E):
            decision = Decision.REJECTED
            reasons = [f"Высокий риск: Grade {grade.value}, PD {scoring.pd*100:.1f}%"]
            rehab = self._build_rehabilitation_plan(reasons)

        # 3. Grade C + soft flags → MANUAL_REVIEW
        elif grade == RiskGrade.C and soft_flags:
            decision = Decision.MANUAL_REVIEW

        # 4. Requested ≤ max_unsecured AND grade A/B → APPROVED
        elif request.requested_amount <= max_unsecured and grade in (RiskGrade.A, RiskGrade.B):
            decision = Decision.APPROVED
            monthly = self._annuity_payment(
                request.requested_amount, effective_rate, request.requested_term_months
            )
            offers.append(CreditOffer(
                variant_index=1,
                product_type=request.product_type,
                approved_amount=request.requested_amount,
                term_months=request.requested_term_months,
                annual_rate_pct=effective_rate,
                monthly_payment=round(monthly, 2),
                collateral_required=False,
                collateral_description=None,
                description="Одобрено на запрошенных условиях",
            ))

        # 5. Requested > max_unsecured → COUNTER_OFFER
        else:
            decision = Decision.COUNTER_OFFER
            offers = self._generate_counter_offers(
                request, product_cfg, grade, effective_rate,
                max_unsecured, max_secured, max_monthly_payment,
            )

        return DecisionResult(
            decision=decision,
            max_monthly_payment=round(max_monthly_payment, 2),
            max_unsecured_limit=round(max_unsecured, 2),
            max_secured_limit=round(max_secured, 2),
            dti_ratio=round(dti, 4),
            offers=offers,
            rehabilitation_plan=rehab,
            soft_flags=soft_flags,
        )

    def _generate_counter_offers(
        self,
        req: ApplicationRequest,
        cfg: ProductConfig,
        grade: RiskGrade,
        rate: float,
        max_unsecured: float,
        max_secured: float,
        max_pmt: float,
    ) -> list[CreditOffer]:
        offers: list[CreditOffer] = []

        # Оффер 1: Сниженная сумма без залога
        amount_1 = min(max_unsecured, cfg.max_amount)
        amount_1 = max(amount_1, cfg.min_amount)
        pmt_1 = self._annuity_payment(amount_1, rate, req.requested_term_months)
        offers.append(CreditOffer(
            variant_index=1,
            product_type=req.product_type,
            approved_amount=round(amount_1, 2),
            term_months=req.requested_term_months,
            annual_rate_pct=rate,
            monthly_payment=round(pmt_1, 2),
            collateral_required=False,
            collateral_description=None,
            description="Сниженная сумма без обеспечения — доступна прямо сейчас",
        ))

        # Оффер 2: Полная сумма с обеспечением
        amount_2 = min(req.requested_amount, max_secured, cfg.max_amount)
        rate_2 = max(1.0, rate - 1.0)  # дисконт за залог
        pmt_2 = self._annuity_payment(amount_2, rate_2, req.requested_term_months)
        offers.append(CreditOffer(
            variant_index=2,
            product_type=req.product_type,
            approved_amount=round(amount_2, 2),
            term_months=req.requested_term_months,
            annual_rate_pct=rate_2,
            monthly_payment=round(pmt_2, 2),
            collateral_required=True,
            collateral_description="Залог имущества или поручительство Корпорации МСП",
            description="Запрошенная сумма под обеспечение / гарантию Корпорации МСП",
        ))

        # Оффер 3: Альтернативный продукт
        alt_product_type = ALTERNATIVE_PRODUCT.get(req.product_type, req.product_type)
        alt_cfg = PRODUCT_CATALOG[alt_product_type]
        alt_term = min(int(req.requested_term_months * 1.5), alt_cfg.max_term)
        alt_rate = alt_cfg.rates.get(grade.value, alt_cfg.rates.get("C", 25.0)) + 1.0
        alt_amount = min(req.requested_amount, alt_cfg.max_amount)
        alt_amount = max(alt_amount, alt_cfg.min_amount)
        pmt_3 = self._annuity_payment(alt_amount, alt_rate, alt_term)
        needs_collateral = alt_cfg.collateral_threshold is not None and alt_amount > alt_cfg.collateral_threshold
        offers.append(CreditOffer(
            variant_index=3,
            product_type=alt_product_type,
            approved_amount=round(alt_amount, 2),
            term_months=alt_term,
            annual_rate_pct=alt_rate,
            monthly_payment=round(pmt_3, 2),
            collateral_required=needs_collateral,
            collateral_description="Частичное обеспечение" if needs_collateral else None,
            description=self._alt_product_description(alt_product_type),
        ))

        return offers

    @staticmethod
    def _alt_product_description(pt: ProductType) -> str:
        descs = {
            ProductType.REVOLVING_LINE_VKL: "Возобновляемая линия траншами — гибкое управление оборотным капиталом",
            ProductType.WORKING_CAPITAL_LOAN: "Оборотный кредит с увеличенным сроком для снижения ежемесячного платежа",
            ProductType.OVERDRAFT: "Овердрафт — быстрый доступ к средствам",
            ProductType.INVESTMENT_LOAN: "Инвестиционный кредит на развитие бизнеса",
        }
        return descs.get(pt, "Альтернативный продукт с гибкими условиями")

    @staticmethod
    def _annuity_payment(principal: float, annual_rate_pct: float, term_months: int) -> float:
        """Ежемесячный аннуитетный платёж."""
        if principal <= 0 or term_months <= 0:
            return 0.0
        r = annual_rate_pct / 100.0 / 12.0
        if r == 0:
            return principal / term_months
        return principal * r / (1 - (1 + r) ** (-term_months))

    @staticmethod
    def _annuity_limit(max_payment: float, annual_rate_pct: float, term_months: int) -> float:
        """Максимальная сумма кредита по допустимому ежемесячному платежу."""
        if max_payment <= 0 or term_months <= 0:
            return 0.0
        r = annual_rate_pct / 100.0 / 12.0
        if r == 0:
            return max_payment * term_months
        return max_payment * (1 - (1 + r) ** (-term_months)) / r

    @staticmethod
    def _has_seasonal_volatility(monthly: list[float]) -> bool:
        """Сезонная волатильность: CoV > 25%."""
        if len(monthly) < 6:
            return False
        avg = sum(monthly) / len(monthly)
        if avg == 0:
            return True
        variance = sum((x - avg) ** 2 for x in monthly) / len(monthly)
        cv = math.sqrt(variance) / avg
        return cv > 0.25

    def _build_rehabilitation_plan(self, reasons: list[str]) -> RehabilitationPlan:
        action_items: list[ActionItem] = []
        estimated_grade = "C"

        reason_actions: dict[str, tuple[str, int, str]] = {
            "Налоговая блокировка счёта ФНС": (
                "Погасить задолженность по налогам, получить справку об отсутствии блокировок ФНС",
                14, "HIGH",
            ),
            "Просрочка 90+ дней в кредитной истории": (
                "Погасить просроченную задолженность, дождаться обновления кредитной истории в БКИ",
                30, "HIGH",
            ),
            "Возраст бизнеса менее 3 месяцев": (
                "Продолжить деятельность, накопить историю оборотов по расчётному счёту минимум 3 месяца",
                60, "MEDIUM",
            ),
            "Компания в процессе ликвидации/банкротства": (
                "Отменить процедуру ликвидации, получить актуальную выписку ЕГРЮЛ",
                30, "HIGH",
            ),
        }

        for reason in reasons:
            matched = False
            for key, (action, days, priority) in reason_actions.items():
                if key in reason:
                    action_items.append(ActionItem(action=action, deadline_days=days, priority=priority))
                    matched = True
                    break
            if not matched:
                action_items.append(ActionItem(
                    action=f"Устранить: {reason}",
                    deadline_days=30,
                    priority="MEDIUM",
                ))

        # Общие рекомендации
        action_items.append(ActionItem(
            action="Увеличить объём операций через расчётный счёт в Альфа-Банке",
            deadline_days=45,
            priority="MEDIUM",
        ))
        action_items.append(ActionItem(
            action="Обеспечить регулярность налоговых платежей через р/с",
            deadline_days=30,
            priority="MEDIUM",
        ))

        max_deadline = max(ai.deadline_days for ai in action_items) if action_items else 60
        reapply_date = (date.today() + timedelta(days=max_deadline)).isoformat()

        return RehabilitationPlan(
            duration_days=max(max_deadline, 60),
            rejection_reasons=reasons,
            action_items=action_items,
            estimated_grade_after=estimated_grade,
            reapply_eligible_date=reapply_date,
        )


# ─────────────────────────────────────────────────────────
# Conveyor State Machine
# ─────────────────────────────────────────────────────────

class ConveyorStateMachine:
    """FSM с валидируемыми переходами.
    Все допустимые переходы описаны в TRANSITIONS.
    Каждый переход логируется в audit log.
    """

    # (from_state, trigger) → to_state
    TRANSITIONS: dict[tuple[ApplicationState, Trigger], ApplicationState] = {
        (ApplicationState.DRAFT, Trigger.SUBMIT): ApplicationState.SUBMITTED,
        (ApplicationState.DRAFT, Trigger.CANCEL): ApplicationState.CANCELLED,
        (ApplicationState.SUBMITTED, Trigger.AUTO_VALIDATE): ApplicationState.VALIDATION,
        (ApplicationState.SUBMITTED, Trigger.CANCEL): ApplicationState.CANCELLED,
        (ApplicationState.VALIDATION, Trigger.VALIDATION_PASSED): ApplicationState.ENRICHMENT,
        (ApplicationState.VALIDATION, Trigger.VALIDATION_FAILED): ApplicationState.REJECTED,
        (ApplicationState.ENRICHMENT, Trigger.ENRICHMENT_COMPLETE): ApplicationState.SCORING_AND_POLICY,
        (ApplicationState.SCORING_AND_POLICY, Trigger.AUTO_APPROVE): ApplicationState.APPROVED,
        (ApplicationState.SCORING_AND_POLICY, Trigger.COUNTER_OFFER_GENERATED): ApplicationState.COUNTER_OFFER,
        (ApplicationState.SCORING_AND_POLICY, Trigger.NEEDS_MANUAL_REVIEW): ApplicationState.MANUAL_REVIEW,
        (ApplicationState.SCORING_AND_POLICY, Trigger.AUTO_REJECT): ApplicationState.REJECTED,
        (ApplicationState.MANUAL_REVIEW, Trigger.UNDERWRITER_APPROVE): ApplicationState.APPROVED,
        (ApplicationState.MANUAL_REVIEW, Trigger.UNDERWRITER_REJECT): ApplicationState.REJECTED,
        (ApplicationState.MANUAL_REVIEW, Trigger.REQUEST_CLARIFICATION): ApplicationState.NEED_CLARIFICATION,
        (ApplicationState.MANUAL_REVIEW, Trigger.UNDERWRITER_COUNTER_OFFER): ApplicationState.COUNTER_OFFER,
        (ApplicationState.NEED_CLARIFICATION, Trigger.CLIENT_RESPONDED): ApplicationState.RESUBMITTED,
        (ApplicationState.NEED_CLARIFICATION, Trigger.CANCEL): ApplicationState.CANCELLED,
        (ApplicationState.RESUBMITTED, Trigger.RE_SCORE): ApplicationState.SCORING_AND_POLICY,
        (ApplicationState.APPROVED, Trigger.ACCEPT_OFFER): ApplicationState.OFFER_ACCEPTED,
        (ApplicationState.COUNTER_OFFER, Trigger.ACCEPT_OFFER): ApplicationState.OFFER_ACCEPTED,
        (ApplicationState.COUNTER_OFFER, Trigger.CANCEL): ApplicationState.CANCELLED,
        (ApplicationState.COUNTER_OFFER, Trigger.OFFERS_EXPIRED): ApplicationState.REJECTED,
        (ApplicationState.OFFER_ACCEPTED, Trigger.SIGN_CONTRACT): ApplicationState.CONTRACT_SIGNED,
        (ApplicationState.CONTRACT_SIGNED, Trigger.DISBURSE): ApplicationState.FUNDED,
    }

    def __init__(self) -> None:
        self._audit_log: list[AuditLogEntry] = []

    @property
    def audit_log(self) -> list[AuditLogEntry]:
        return list(self._audit_log)

    def can_transition(self, current: ApplicationState, trigger: Trigger) -> bool:
        return (current, trigger) in self.TRANSITIONS

    def get_available_triggers(self, current: ApplicationState) -> list[Trigger]:
        return [t for (s, t) in self.TRANSITIONS if s == current]

    def transition(
        self,
        application_id: str,
        current_state: ApplicationState,
        trigger: Trigger,
        actor_type: ActorType,
        actor_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> tuple[ApplicationState, AuditLogEntry]:
        """Выполнить переход. Raises ValueError если переход невалиден."""
        key = (current_state, trigger)
        if key not in self.TRANSITIONS:
            allowed = self.get_available_triggers(current_state)
            raise ValueError(
                f"Недопустимый переход: {current_state.value} + {trigger.value}. "
                f"Доступные триггеры: {[t.value for t in allowed]}"
            )

        new_state = self.TRANSITIONS[key]
        entry = AuditLogEntry(
            id=str(uuid.uuid4()),
            application_id=application_id,
            from_state=current_state.value,
            to_state=new_state.value,
            trigger=trigger.value,
            actor_type=actor_type.value,
            actor_id=actor_id,
            details_json=details or {},
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        self._audit_log.append(entry)
        return new_state, entry

    def run_conveyor(
        self,
        application_id: str,
        request: ApplicationRequest,
        enrichment: EnrichmentBundle,
        scoring_engine: ScoringEngine | None = None,
        decision_engine: DecisionEngine | None = None,
        gov_rate_adjustment: float = 0.0,
    ) -> tuple[ApplicationState, ScoringResult | None, DecisionResult | None, list[AuditLogEntry]]:
        """Прогнать заявку по конвейеру автоматически от DRAFT до решения.
        Возвращает (final_state, scoring_result, decision_result, audit_entries).
        """
        se = scoring_engine or ScoringEngine()
        de = decision_engine or DecisionEngine()
        state = ApplicationState.DRAFT
        entries: list[AuditLogEntry] = []
        scoring_result: ScoringResult | None = None
        decision_result: DecisionResult | None = None

        def step(trigger: Trigger, actor: ActorType = ActorType.SYSTEM_CONVEYOR,
                 details: dict[str, Any] | None = None) -> ApplicationState:
            nonlocal state
            state, entry = self.transition(application_id, state, trigger, actor, details=details)
            entries.append(entry)
            return state

        # DRAFT → SUBMITTED
        step(Trigger.SUBMIT, ActorType.CLIENT_OWNER)

        # SUBMITTED → VALIDATION
        step(Trigger.AUTO_VALIDATE)

        # VALIDATION → ENRICHMENT (валидация проходит, т.к. данные из пресета)
        step(Trigger.VALIDATION_PASSED)

        # ENRICHMENT → SCORING_AND_POLICY
        step(Trigger.ENRICHMENT_COMPLETE)

        # Скоринг
        scoring_result = se.score(enrichment)

        # Решение
        decision_result = de.decide(scoring_result, request, enrichment, gov_rate_adjustment)

        # SCORING_AND_POLICY → финальное состояние
        decision_to_trigger: dict[Decision, Trigger] = {
            Decision.APPROVED: Trigger.AUTO_APPROVE,
            Decision.COUNTER_OFFER: Trigger.COUNTER_OFFER_GENERATED,
            Decision.MANUAL_REVIEW: Trigger.NEEDS_MANUAL_REVIEW,
            Decision.REJECTED: Trigger.AUTO_REJECT,
        }
        trigger = decision_to_trigger[decision_result.decision]
        step(trigger, details={
            "risk_score": scoring_result.risk_score,
            "risk_grade": scoring_result.risk_grade.value,
            "pd": scoring_result.pd,
            "decision": decision_result.decision.value,
        })

        return state, scoring_result, decision_result, entries


# ─────────────────────────────────────────────────────────
# Synthetic Presets (God-Bar)
# ─────────────────────────────────────────────────────────

@dataclass
class CompanyProfile:
    inn: str
    ogrn: str
    name: str
    full_name: str
    legal_form: str  # IP | OOO
    okved_main: str
    okved_description: str
    registration_date: str
    authorized_capital: float | None
    address: str
    employee_count: int
    is_active: bool


@dataclass
class SyntheticPreset:
    preset_id: str
    label: str
    expected_outcome: str
    company: CompanyProfile | None
    application: ApplicationRequest | None
    enrichment: EnrichmentBundle | None


def build_presets() -> list[SyntheticPreset]:
    """Возвращает 5 детерминированных пресетов для Demo God-Bar."""
    return [
        # ── Пресет 1: ИП «Кофейня на Покровке» — Auto-Approve ──
        SyntheticPreset(
            preset_id="coffee_shop_ip",
            label="ИП «Кофейня на Покровке» — Fast-track автоодобрение",
            expected_outcome="APPROVED",
            company=CompanyProfile(
                inn="771234567890", ogrn="321774600012345",
                name="ИП «Кофейня на Покровке»",
                full_name="Индивидуальный предприниматель Кофеева Анна Михайловна («Кофейня на Покровке»)",
                legal_form="IP",
                okved_main="56.10.1",
                okved_description="Деятельность ресторанов и кафе",
                registration_date="2019-03-15",
                authorized_capital=None,
                address="г. Москва, ул. Арбат, д. 12, пом. 1",
                employee_count=8,
                is_active=True,
            ),
            application=ApplicationRequest(
                company_inn="771234567890",
                product_type=ProductType.OVERDRAFT,
                requested_amount=500_000,
                requested_term_months=12,
            ),
            enrichment=EnrichmentBundle(
                egrul=EgrulData(
                    registration_date="2019-03-15",
                    authorized_capital=None,
                    okved_main="56.10.1",
                    is_liquidating=False,
                ),
                fns=FnsData(tax_blocks=[], tax_discrepancies=0, employee_count=8),
                bki=BkiData(
                    active_loans=0, total_monthly_payment=0,
                    overdue_0=True, overdue_30=False, overdue_60=False, overdue_90_plus=False,
                    credit_history_months=48,
                ),
                alfa_accounts=AlfaAccountsData(
                    monthly_revenue=[620e3, 580e3, 650e3, 700e3, 710e3, 680e3,
                                     720e3, 750e3, 690e3, 730e3, 760e3, 800e3],
                    avg_balance=420_000,
                    unique_counterparties=35,
                    tax_payments_regular=True,
                ),
            ),
        ),

        # ── Пресет 2: ООО «МеталлПром» — Counter-Offer ──
        SyntheticPreset(
            preset_id="manufacturing_ooo",
            label="ООО «МеталлПром» — Контр-оффер (3 альтернативы)",
            expected_outcome="COUNTER_OFFER",
            company=CompanyProfile(
                inn="7702123456", ogrn="1167746123456",
                name="ООО «МеталлПром»",
                full_name="Общество с ограниченной ответственностью «МеталлПром»",
                legal_form="OOO",
                okved_main="25.11",
                okved_description="Производство строительных металлических конструкций",
                registration_date="2016-06-20",
                authorized_capital=5_000_000,
                address="МО, г. Подольск, ул. Промышленная, д. 5",
                employee_count=42,
                is_active=True,
            ),
            application=ApplicationRequest(
                company_inn="7702123456",
                product_type=ProductType.WORKING_CAPITAL_LOAN,
                requested_amount=20_000_000,
                requested_term_months=24,
            ),
            enrichment=EnrichmentBundle(
                egrul=EgrulData(
                    registration_date="2016-06-20",
                    authorized_capital=5_000_000,
                    okved_main="25.11",
                    is_liquidating=False,
                    founders=[{"name": "Петров И.С.", "share_pct": 60},
                              {"name": "Сидоров А.В.", "share_pct": 40}],
                ),
                fns=FnsData(tax_blocks=[], tax_discrepancies=0, employee_count=42),
                bki=BkiData(
                    active_loans=2, total_monthly_payment=180_000,
                    overdue_0=True, overdue_30=False, overdue_60=False, overdue_90_plus=False,
                    credit_history_months=72,
                ),
                alfa_accounts=AlfaAccountsData(
                    monthly_revenue=[4.2e6, 4.5e6, 4.1e6, 4.8e6, 5.0e6, 4.7e6,
                                     5.2e6, 5.5e6, 5.1e6, 5.3e6, 5.6e6, 5.8e6],
                    avg_balance=2_100_000,
                    unique_counterparties=28,
                    tax_payments_regular=True,
                ),
            ),
        ),

        # ── Пресет 3: ООО «СпецТранс» — Manual Review ──
        # Calibrated for Grade C (score ~600): young biz (2.6 yrs), seasonal dip,
        # 2 tax discrepancies, tax delays in low season, few counterparties → soft_flags → MANUAL_REVIEW
        SyntheticPreset(
            preset_id="logistics_seasonal",
            label="ООО «СпецТранс» — Ручной разбор и дозапрос",
            expected_outcome="MANUAL_REVIEW",
            company=CompanyProfile(
                inn="5001234567", ogrn="1185001234567",
                name="ООО «СпецТранс»",
                full_name="Общество с ограниченной ответственностью «СпецТранс»",
                legal_form="OOO",
                okved_main="49.41",
                okved_description="Деятельность автомобильного грузового транспорта",
                registration_date="2024-03-15",
                authorized_capital=10_000,
                address="МО, г. Химки, ул. Транспортная, д. 8",
                employee_count=7,
                is_active=True,
            ),
            application=ApplicationRequest(
                company_inn="5001234567",
                product_type=ProductType.REVOLVING_LINE_VKL,
                requested_amount=3_000_000,
                requested_term_months=24,
            ),
            enrichment=EnrichmentBundle(
                egrul=EgrulData(
                    registration_date="2024-03-15",
                    authorized_capital=10_000,
                    okved_main="49.41",
                    is_liquidating=False,
                    founders=[{"name": "Логинов Д.А.", "share_pct": 100}],
                ),
                fns=FnsData(tax_blocks=[], tax_discrepancies=2, employee_count=7),
                bki=BkiData(
                    active_loans=1, total_monthly_payment=85_000,
                    overdue_0=True, overdue_30=False, overdue_60=False, overdue_90_plus=False,
                    credit_history_months=18,
                ),
                alfa_accounts=AlfaAccountsData(
                    monthly_revenue=[1.8e6, 1.6e6, 1.2e6, 0.9e6, 0.7e6, 0.6e6,
                                     0.8e6, 1.0e6, 1.3e6, 1.5e6, 1.7e6, 1.9e6],
                    avg_balance=280_000,
                    unique_counterparties=8,
                    tax_payments_regular=False,
                ),
            ),
        ),

        # ── Пресет 4: ООО «ВекторТрейд» — Rejected ──
        SyntheticPreset(
            preset_id="wholesale_rejected",
            label="ООО «ВекторТрейд» — Стоп-фактор и план оздоровления",
            expected_outcome="REJECTED",
            company=CompanyProfile(
                inn="7725987654", ogrn="1207700987654",
                name="ООО «ВекторТрейд»",
                full_name="Общество с ограниченной ответственностью «ВекторТрейд»",
                legal_form="OOO",
                okved_main="46.73",
                okved_description="Торговля оптовая лесоматериалами и стройматериалами",
                registration_date="2020-11-05",
                authorized_capital=10_000,
                address="г. Москва, ул. Складская, д. 22",
                employee_count=3,
                is_active=True,
            ),
            application=ApplicationRequest(
                company_inn="7725987654",
                product_type=ProductType.WORKING_CAPITAL_LOAN,
                requested_amount=10_000_000,
                requested_term_months=18,
            ),
            enrichment=EnrichmentBundle(
                egrul=EgrulData(
                    registration_date="2020-11-05",
                    authorized_capital=10_000,
                    okved_main="46.73",
                    is_liquidating=False,
                    founders=[{"name": "Иванов П.К.", "share_pct": 100}],
                ),
                fns=FnsData(
                    tax_blocks=[{"type": "ACCOUNT_BLOCK",
                                 "reason": "Непредставление налоговой декларации",
                                 "date": "2026-08-15"}],
                    tax_discrepancies=3,
                    employee_count=3,
                ),
                bki=BkiData(
                    active_loans=3, total_monthly_payment=320_000,
                    overdue_0=False, overdue_30=True, overdue_60=True, overdue_90_plus=True,
                    credit_history_months=24,
                ),
                alfa_accounts=AlfaAccountsData(
                    monthly_revenue=[800e3, 750e3, 600e3, 500e3, 450e3, 400e3,
                                     350e3, 300e3, 280e3, 250e3, 200e3, 150e3],
                    avg_balance=45_000,
                    unique_counterparties=4,
                    tax_payments_regular=False,
                ),
            ),
        ),

        # ── Пресет 5: Свой ввод ──
        SyntheticPreset(
            preset_id="custom_input",
            label="Чистый ввод — заполните форму вручную",
            expected_outcome="DEPENDS_ON_INPUT",
            company=None,
            application=None,
            enrichment=None,
        ),
    ]


# ─────────────────────────────────────────────────────────
# Gov Support News Items (mock)
# ─────────────────────────────────────────────────────────

@dataclass
class GovSupportItem:
    id: str
    okved_prefixes: list[str]  # ["56"] или ["ALL"]
    title: str
    body: str
    program_type: str  # SUBSIDIZED_RATE | GUARANTEE_MSP | GRANT | TAX_BENEFIT
    max_rate_pct: float | None
    guarantee_pct: float | None
    url: str
    applicable_to_products: list[str]


GOV_SUPPORT_NEWS: list[GovSupportItem] = [
    GovSupportItem(
        id="gov_1",
        okved_prefixes=["56"],
        title="Льготный кредит для общепита до 13.5% по Программе 1764",
        body="Субсидирование процентной ставки для субъектов МСП в сфере общественного питания. "
             "Ставка не более 13.5% годовых.",
        program_type="SUBSIDIZED_RATE",
        max_rate_pct=13.5,
        guarantee_pct=None,
        url="https://мсп.рф/programs/1764",
        applicable_to_products=["WORKING_CAPITAL_LOAN", "INVESTMENT_LOAN"],
    ),
    GovSupportItem(
        id="gov_2",
        okved_prefixes=["56"],
        title="Грант до 500К ₽ на открытие точки общепита",
        body="Федеральная программа грантовой поддержки начинающих предпринимателей "
             "в сфере общественного питания. До 500 000 ₽ безвозвратно.",
        program_type="GRANT",
        max_rate_pct=None,
        guarantee_pct=None,
        url="https://мсп.рф/programs/grants-food",
        applicable_to_products=[],
    ),
    GovSupportItem(
        id="gov_3",
        okved_prefixes=["25", "28", "29"],
        title="Льготное кредитование производственных МСП до 9%",
        body="Программа Минпромторга для производственных предприятий. "
             "Субсидированная ставка до 9% годовых на инвестиционные цели.",
        program_type="SUBSIDIZED_RATE",
        max_rate_pct=9.0,
        guarantee_pct=None,
        url="https://minprom.gov.ru/subsidy-msp",
        applicable_to_products=["INVESTMENT_LOAN", "WORKING_CAPITAL_LOAN"],
    ),
    GovSupportItem(
        id="gov_4",
        okved_prefixes=["25", "28", "29"],
        title="Гарантия Корпорации МСП до 70% суммы кредита",
        body="Зонтичная гарантия для производственных МСП. Покрытие до 70% от суммы кредита, "
             "позволяет получить финансирование без залога.",
        program_type="GUARANTEE_MSP",
        max_rate_pct=None,
        guarantee_pct=0.70,
        url="https://corpmsp.ru/guarantee",
        applicable_to_products=["WORKING_CAPITAL_LOAN", "INVESTMENT_LOAN", "REVOLVING_LINE_VKL"],
    ),
    GovSupportItem(
        id="gov_5",
        okved_prefixes=["49", "52"],
        title="Субсидированная ставка для транспорта и логистики 12%",
        body="Программа поддержки транспортных предприятий. Льготная ставка до 12% "
             "на кредиты для обновления автопарка и пополнения оборотных средств.",
        program_type="SUBSIDIZED_RATE",
        max_rate_pct=12.0,
        guarantee_pct=None,
        url="https://mintrans.gov.ru/subsidy",
        applicable_to_products=["WORKING_CAPITAL_LOAN", "INVESTMENT_LOAN", "REVOLVING_LINE_VKL"],
    ),
    GovSupportItem(
        id="gov_6",
        okved_prefixes=["49", "52"],
        title="Инвестиционный налоговый вычет на обновление автопарка",
        body="Инвестиционный вычет по налогу на прибыль при приобретении "
             "транспортных средств категории N2, N3.",
        program_type="TAX_BENEFIT",
        max_rate_pct=None,
        guarantee_pct=None,
        url="https://nalog.gov.ru/inv-deduction",
        applicable_to_products=[],
    ),
    GovSupportItem(
        id="gov_7",
        okved_prefixes=["46"],
        title="Зонтичная гарантия для оптовой торговли до 50%",
        body="Гарантия Корпорации МСП для предприятий оптовой торговли. "
             "Покрытие до 50% суммы кредита.",
        program_type="GUARANTEE_MSP",
        max_rate_pct=None,
        guarantee_pct=0.50,
        url="https://corpmsp.ru/guarantee-trade",
        applicable_to_products=["WORKING_CAPITAL_LOAN", "REVOLVING_LINE_VKL"],
    ),
    GovSupportItem(
        id="gov_8",
        okved_prefixes=["ALL"],
        title="Программа «Дальневосточная ипотека для бизнеса» до 10%",
        body="Льготное кредитование для МСП, ведущих деятельность на территории ДФО. "
             "Ставка до 10% годовых, срок до 15 лет.",
        program_type="SUBSIDIZED_RATE",
        max_rate_pct=10.0,
        guarantee_pct=None,
        url="https://мсп.рф/programs/far-east",
        applicable_to_products=["INVESTMENT_LOAN"],
    ),
]


def get_news_for_okved(okved: str) -> list[GovSupportItem]:
    """Фильтрует новости по ОКВЭД-префиксу (первые 2 цифры)."""
    prefix = okved.split(".")[0] if "." in okved else okved[:2]
    return [
        item for item in GOV_SUPPORT_NEWS
        if "ALL" in item.okved_prefixes or prefix in item.okved_prefixes
    ]


# ─────────────────────────────────────────────────────────
# AI Advisor Fallback (deterministic)
# ─────────────────────────────────────────────────────────

AI_FALLBACK_RESPONSES: dict[str, dict[str, Any]] = {
    "product_recommendation": {
        "keywords": ["какой продукт", "какой кредит", "что выбрать", "порекомендуй", "лучше подойдёт"],
        "response": (
            "Для пополнения оборотных средств рекомендую **Оборотный кредит** (ставка от 16%) "
            "или **ВКЛ** для гибкого использования траншами.\n\n"
            "Для закупки оборудования — **Инвестиционный кредит** (от 14%, до 60 мес).\n\n"
            "Для покрытия кассовых разрывов — **Овердрафт** (моментальный доступ, до 3 млн ₽)."
        ),
        "suggestions": [
            "Сравнить ставки по продуктам",
            "Какие документы нужны?",
            "Показать программы господдержки",
        ],
    },
    "documents": {
        "keywords": ["документ", "какие документы", "что нужно предоставить", "справка"],
        "response": (
            "Для подачи заявки обычно достаточно **ИНН** — остальные данные подтягиваются автоматически.\n\n"
            "При ручной проверке андеррайтер может запросить:\n"
            "- Управленческую отчётность (P&L)\n"
            "- Оборотно-сальдовую ведомость (ОСВ)\n"
            "- Бухгалтерский баланс\n"
            "- Налоговую декларацию"
        ),
        "suggestions": [
            "Можно ли подать без бухгалтерии?",
            "Передать заявку бухгалтеру",
            "Какой продукт выбрать?",
        ],
    },
    "rates": {
        "keywords": ["ставка", "процент", "сколько стоит", "rate"],
        "response": (
            "Ставки зависят от вашего кредитного рейтинга (Grade):\n\n"
            "| Продукт | Grade A | Grade B | Grade C |\n"
            "|---|---|---|---|\n"
            "| Овердрафт | 18% | 21% | 25% |\n"
            "| Оборотный кредит | 16% | 19% | 23% |\n"
            "| ВКЛ | 17% | 20% | 24% |\n"
            "| Инвестиционный | 14% | 17% | 21% |\n\n"
            "Льготные программы могут снизить ставку до 9–13.5%."
        ),
        "suggestions": [
            "Как улучшить кредитный рейтинг?",
            "Показать программы господдержки",
            "Подать заявку",
        ],
    },
    "rejection": {
        "keywords": ["отказ", "отклон", "не одобрили", "почему отказ", "reject"],
        "response": (
            "Частые причины отказа:\n"
            "1. **Блокировка счёта ФНС** — необходимо погасить налоговую задолженность\n"
            "2. **Просрочка 90+ дней** — погасить долг, подождать обновления БКИ (30 дней)\n"
            "3. **Возраст бизнеса < 3 мес** — накопить историю оборотов\n\n"
            "После устранения причин вы можете подать заявку повторно."
        ),
        "suggestions": [
            "Посмотреть план реабилитации",
            "Когда можно подать повторно?",
            "Какие документы нужны?",
        ],
    },
    "default": {
        "keywords": [],
        "response": (
            "Я — AI-советник кредитного кабинета. Могу помочь с:\n"
            "- Выбором кредитного продукта\n"
            "- Информацией о ставках и условиях\n"
            "- Списком необходимых документов\n"
            "- Программами государственной поддержки\n\n"
            "Задайте мне вопрос!"
        ),
        "suggestions": [
            "Какой продукт выбрать?",
            "Какие ставки?",
            "Показать программы господдержки",
        ],
    },
}


def ai_fallback_answer(message: str) -> dict[str, Any]:
    """Детерминированный фоллбэк для AI-советника (без GPU/Ollama)."""
    msg_lower = message.lower()
    for key, data in AI_FALLBACK_RESPONSES.items():
        if key == "default":
            continue
        if any(kw in msg_lower for kw in data["keywords"]):
            return {
                "response": data["response"],
                "source": "fallback",
                "suggestions": data["suggestions"],
            }
    default = AI_FALLBACK_RESPONSES["default"]
    return {
        "response": default["response"],
        "source": "fallback",
        "suggestions": default["suggestions"],
    }


# ─────────────────────────────────────────────────────────
# Self-test / Demo runner
# ─────────────────────────────────────────────────────────

def run_all_presets_demo() -> None:
    """Прогоняет все 4 основных пресета через конвейер и печатает результаты."""
    se = ScoringEngine()
    de = DecisionEngine()
    presets = build_presets()

    for preset in presets:
        if preset.enrichment is None:
            continue

        print(f"\n{'='*70}")
        print(f"  {preset.label}")
        print(f"  Ожидаемый исход: {preset.expected_outcome}")
        print(f"{'='*70}")

        assert preset.application is not None
        assert preset.enrichment is not None

        fsm = ConveyorStateMachine()
        final_state, scoring, decision, audit = fsm.run_conveyor(
            application_id=str(uuid.uuid4()),
            request=preset.application,
            enrichment=preset.enrichment,
            scoring_engine=se,
            decision_engine=de,
        )

        assert scoring is not None
        assert decision is not None

        print(f"\n  Risk Score:  {scoring.risk_score}")
        print(f"  PD:          {scoring.pd*100:.2f}%")
        print(f"  Grade:       {scoring.risk_grade.value}")
        print(f"  Stop Factors: {scoring.stop_factors or 'None'}")

        print(f"\n  Decision:            {decision.decision.value}")
        print(f"  Max Monthly Payment: {decision.max_monthly_payment:,.0f} ₽")
        print(f"  Max Unsecured:       {decision.max_unsecured_limit:,.0f} ₽")
        print(f"  Max Secured:         {decision.max_secured_limit:,.0f} ₽")
        print(f"  DTI:                 {decision.dti_ratio:.2%}")
        print(f"  Soft Flags:          {decision.soft_flags or 'None'}")

        print(f"\n  Final State: {final_state.value}")
        match = "[OK]" if final_state.value == preset.expected_outcome else "[MISMATCH]"
        print(f"  Expected:    {preset.expected_outcome} {match}")

        if decision.offers:
            print(f"\n  Offers ({len(decision.offers)}):")
            for o in decision.offers:
                coll = " [Залог]" if o.collateral_required else ""
                print(f"    #{o.variant_index}: {o.product_type.value} | "
                      f"{o.approved_amount:,.0f} ₽ | {o.term_months} мес | "
                      f"{o.annual_rate_pct}% | {o.monthly_payment:,.0f} ₽/мес{coll}")
                print(f"      → {o.description}")

        if decision.rehabilitation_plan:
            rp = decision.rehabilitation_plan
            print(f"\n  Rehabilitation Plan ({rp.duration_days} дней):")
            for ai in rp.action_items:
                print(f"    [{ai.priority}] {ai.action} (до {ai.deadline_days} дней)")
            print(f"  Повторная подача: {rp.reapply_eligible_date}")

        print(f"\n  Factors Breakdown ({len(scoring.factors_breakdown)} факторов):")
        for f in scoring.factors_breakdown:
            sign = "+" if f.score_delta >= 0 else ""
            print(f"    [{f.group:8}] {f.factor_name:35} {sign}{f.score_delta:4} | {f.raw_value}")

        print(f"\n  Audit Log ({len(audit)} записей):")
        for a in audit:
            print(f"    {a.from_state or 'START':25} → {a.to_state:25} | "
                  f"{a.trigger:30} | {a.actor_type}")


if __name__ == "__main__":
    run_all_presets_demo()
