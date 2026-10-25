import { useState } from 'react';
import { Building2, CreditCard, Calendar, Users, User, Briefcase, Landmark } from 'lucide-react';
import type { Application, ProductType } from '../types';
import { PRODUCT_LABELS, formatRub, GRADE_CONFIG, STATE_LABELS } from '../utils';
import { PipelineTracker } from './PipelineTracker';
import { AiAdvisorWidget } from './AiAdvisorWidget';
import { CreditCalculator } from './CreditCalculator';
import { NewsFeed } from './NewsFeed';
import { DelegatePanel, AccountantTaskPanel } from './DelegatePanel';
import { ClarificationWidget } from './ClarificationWidget';
import { CounterOffersMatrix } from './CounterOffersMatrix';
import { RejectionPlan } from './RejectionPlan';
import { useAppStore } from '../store/appStore';
import api from '../api/client';

interface Props {
  application: Application;
  onRefresh: () => void;
  isSplit?: boolean;
}

export function ClientCabinetView({ application, onRefresh, isSplit }: Props) {
  const { userRole, isDelegated } = useAppStore();
  const [manualInn, setManualInn] = useState('');
  const [updatingCompany, setUpdatingCompany] = useState(false);
  const {
    company, state, scoring_result, decision_result,
    offers, rehabilitation_plan, clarifications,
  } = application;

  const grade = scoring_result?.risk_grade ?? 'C';
  const gradeCfg = GRADE_CONFIG[grade];

  // Net monthly income estimate for calculator
  const avgRevenue = decision_result?.max_monthly_payment
    ? decision_result.max_monthly_payment / 0.075  // reverse from 50%*15%
    : 1_000_000;
  const netMonthlyIncome = avgRevenue * 0.15;
  const existingPayments = scoring_result
    ? 0
    : 0;

  async function handleSubmitApplication(product: ProductType, amount: number, term: number) {
    try {
      if (state === 'DRAFT') {
        await api.post(`/applications/${application.id}/transition`, {
          trigger: 'SUBMIT',
          actor_type: 'CLIENT_OWNER',
          payload: { product_type: product, requested_amount: amount, requested_term_months: term },
        });
      } else {
        const { data } = await api.post('/applications', {
          company_id: company?.id,
          company_inn: company?.inn || '7701234567',
          product_type: product,
          requested_amount: amount,
          requested_term_months: term,
        });
        if (data.id) {
          useAppStore.getState().setApplicationId(data.id);
          await api.post(`/applications/${data.id}/transition`, {
            trigger: 'SUBMIT',
            actor_type: 'CLIENT_OWNER',
          });
        }
      }
      onRefresh();
    } catch (e) {
      console.error('Submit application failed', e);
    }
  }

  async function handleApplyInn() {
    if (!manualInn.trim()) return;
    setUpdatingCompany(true);
    try {
      const { data } = await api.post('/applications', {
        company_inn: manualInn.trim(),
        product_type: application.product_type || 'WORKING_CAPITAL_LOAN',
        requested_amount: application.requested_amount || 3000000,
        requested_term_months: application.requested_term_months || 12,
      });
      if (data.id) {
        useAppStore.getState().setApplicationId(data.id);
        onRefresh();
      }
    } catch (e) {
      console.error('Failed to create application with INN', e);
    } finally {
      setUpdatingCompany(false);
    }
  }

  const showOffers =
    (state === 'APPROVED' || state === 'COUNTER_OFFER' || state === 'OFFER_ACCEPTED') &&
    offers &&
    offers.length > 0;
  const showRejection = state === 'REJECTED';
  const showClarifications =
    (state === 'NEED_CLARIFICATION' ||
      (state === 'MANUAL_REVIEW' && (clarifications?.some((c) => c.status === 'PENDING') ?? false))) &&
    (clarifications?.filter((c) => c.status === 'PENDING').length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Company + Application header card (Bento style) */}
      <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 shadow-xs space-y-5 alfa-card-hover">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EF3124] flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 text-neutral-600 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                {userRole === 'ACCOUNTANT' ? (
                  <>
                    <Briefcase className="w-3 h-3 text-neutral-500" />
                    <span>Главный бухгалтер</span>
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3 text-neutral-500" />
                    <span>Собственник / CEO</span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight mt-1">
                {company?.name || 'ООО «Новая организация»'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-2.5">
                <span className="rounded-full bg-neutral-50 border border-neutral-200/60 px-3 py-1 text-xs text-neutral-600 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                  <span>ИНН: {company?.inn || 'Не указан'}</span>
                </span>
                {company?.registration_date && (
                  <span className="rounded-full bg-neutral-50 border border-neutral-200/60 px-3 py-1 text-xs text-neutral-600 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span>с {company.registration_date.slice(0, 4)} года</span>
                  </span>
                )}
                {company?.employee_count !== undefined && (
                  <span className="rounded-full bg-neutral-50 border border-neutral-200/60 px-3 py-1 text-xs text-neutral-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{company.employee_count} сотр.</span>
                  </span>
                )}
                {company?.okved_main && (
                  <span className="rounded-full bg-neutral-50 border border-neutral-200/60 px-3 py-1 text-xs text-neutral-600 flex items-center gap-1.5">
                    <span className="text-neutral-400 font-medium">ОКВЭД</span>
                    <span>{company.okved_main}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Risk grade badge */}
          {scoring_result && (
            <div
              className={`rounded-2xl border px-3.5 py-2 flex flex-col items-center justify-center min-w-[70px] shrink-0 shadow-xs ${gradeCfg.bg} ${gradeCfg.border}`}
              title={`Risk Score: ${scoring_result.risk_score}/1000, PD: ${(scoring_result.pd * 100).toFixed(1)}%`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-0.5">
                Грейд
              </span>
              <span className={`text-2xl font-black leading-none ${gradeCfg.color}`}>
                {gradeCfg.label}
              </span>
              <span className="text-[11px] font-semibold text-neutral-700 leading-none mt-1.5">
                {scoring_result.risk_score} <span className="text-[9px] text-neutral-400 font-normal">/ 1000</span>
              </span>
            </div>
          )}
        </div>

        {/* Loan request summary */}
        <div className="border-t border-neutral-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#F4F5F7] rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Запрошенная сумма
            </span>
            <span className="text-xl font-extrabold text-neutral-900 tabular-nums mt-1">
              {formatRub(application.requested_amount)}
            </span>
          </div>
          <div className="bg-[#F4F5F7] rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Срок финансирования
            </span>
            <span className="text-xl font-extrabold text-neutral-900 tabular-nums mt-1">
              {application.requested_term_months} мес.
            </span>
          </div>
          <div className="bg-[#F4F5F7] rounded-2xl p-3.5 flex flex-col justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Кредитный продукт
            </span>
            <span className="text-sm font-bold text-neutral-900 mt-1 leading-snug">
              {PRODUCT_LABELS[application.product_type] ?? application.product_type}
            </span>
          </div>
        </div>

        {/* Gov program badge */}
        {application.gov_program_id && application.gov_program_title && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3 flex items-center gap-2.5 text-xs text-emerald-900">
            <div className="w-6 h-6 rounded-lg bg-emerald-100/80 flex items-center justify-center shrink-0">
              <Landmark className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-emerald-950">Льготная программа:</span>
              <span className="text-emerald-800">{application.gov_program_title}</span>
            </div>
          </div>
        )}

        {/* Manual INN input for clean profile */}
        {(!company?.inn || company?.inn === '') && (
          <div className="rounded-2xl bg-[#F8F9FB] border border-neutral-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full text-xs">
              <p className="font-bold text-neutral-800">Чистый ввод реквизитов организации</p>
              <p className="text-neutral-500 mt-0.5">Укажите ИНН компании для подгрузки данных из ФНС и скоринга</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                placeholder="ИНН (10 или 12 цифр)"
                value={manualInn}
                onChange={(e) => setManualInn(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-xs outline-none focus:border-[#EF3124] w-full sm:w-48 font-mono"
              />
              <button
                type="button"
                onClick={handleApplyInn}
                disabled={updatingCompany || !manualInn.trim()}
                className="px-4 py-2 rounded-full bg-[#EF3124] text-white text-xs font-bold hover:bg-[#D9261A] transition-all disabled:opacity-40 shrink-0 alfa-btn"
              >
                {updatingCompany ? 'Поиск...' : 'Применить'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline status tracker */}
      <PipelineTracker currentState={state} />

      {/* Accountant task banner (when delegated and role=ACCOUNTANT) */}
      {userRole === 'ACCOUNTANT' && isDelegated && (
        <AccountantTaskPanel applicationId={application.id} onUploaded={onRefresh} />
      )}

      {/* Delegate button (owner only, early stages) */}
      {userRole === 'OWNER' &&
        ['DRAFT', 'SUBMITTED', 'VALIDATION', 'ENRICHMENT'].includes(state) && (
          <DelegatePanel applicationId={application.id} onDelegated={onRefresh} />
        )}

      {/* Clarification response widget */}
      {showClarifications && (
        <ClarificationWidget
          clarifications={clarifications}
          applicationId={application.id}
          onResponded={onRefresh}
        />
      )}

      {/* Decision: approved / counter-offer matrix */}
      {showOffers && (
        <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 shadow-xs alfa-card-hover space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Решение банка
            </p>
            <div className="mt-1">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                  STATE_LABELS[state]?.bg ?? 'bg-neutral-50'
                } ${STATE_LABELS[state]?.color ?? 'text-neutral-700'}`}
              >
                {STATE_LABELS[state]?.label ?? state}
              </span>
            </div>
          </div>
          <CounterOffersMatrix
            offers={offers}
            application={application}
            onOfferAccepted={onRefresh}
            isSplit={isSplit}
          />
        </div>
      )}

      {/* Rejection + rehabilitation plan */}
      {showRejection && (
        <RejectionPlan
          plan={rehabilitation_plan ?? { steps: [], total_days: 60 }}
          stopFactors={scoring_result?.stop_factors ?? []}
        />
      )}

      {/* AI Advisor */}
      <AiAdvisorWidget
        applicationId={application.id}
        onSuggestProduct={(product, amount, term) =>
          handleSubmitApplication(product, amount ?? 1_000_000, term ?? 12)
        }
      />

      {/* Calculator — show in early stages */}
      {['DRAFT', 'SUBMITTED', 'VALIDATION'].includes(state) && (
        <CreditCalculator
          netMonthlyIncome={netMonthlyIncome}
          existingPayments={existingPayments}
          grade={grade}
          suggestedProduct={application.product_type}
          suggestedAmount={application.requested_amount}
          suggestedTerm={application.requested_term_months}
          onSubmit={handleSubmitApplication}
          isSplit={isSplit}
        />
      )}

      {/* Gov support news feed */}
      <NewsFeed
        okved={company?.okved_main ?? ''}
        applicationId={application.id}
        onProgramApplied={onRefresh}
        currentProgramId={application.gov_program_id}
      />
    </div>
  );
}
