import { Check, X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import type { AppState } from '../types';
import { STATE_LABELS } from '../utils';

const STEPS: { state: AppState; label: string }[] = [
  { state: 'DRAFT',              label: 'Черновик' },
  { state: 'SUBMITTED',         label: 'Отправка' },
  { state: 'VALIDATION',        label: 'Валидация' },
  { state: 'ENRICHMENT',        label: 'Обогащение' },
  { state: 'SCORING_AND_POLICY',label: 'Скоринг' },
  { state: 'APPROVED',          label: 'Решение' },
  { state: 'CONTRACT_SIGNED',   label: 'Подписание' },
  { state: 'FUNDED',            label: 'Выдача' },
];

const STEP_ORDER: AppState[] = STEPS.map((s) => s.state);

function getStepIndex(state: AppState): number {
  if (state === 'COUNTER_OFFER' || state === 'OFFER_ACCEPTED') return 5;
  if (state === 'MANUAL_REVIEW' || state === 'NEED_CLARIFICATION' || state === 'RESUBMITTED') return 5;
  return STEP_ORDER.indexOf(state);
}

const STATUS_EXPLANATIONS: Partial<Record<AppState, string>> = {
  COUNTER_OFFER: 'Банк подготовил 3 альтернативных варианта кредитования',
  MANUAL_REVIEW: 'Заявка передана кредитному эксперту для индивидуальной оценки',
  NEED_CLARIFICATION: 'Требуется предоставить дополнительные документы или пояснения',
  RESUBMITTED: 'Ответ отправлен — проводится повторный экспресс-скоринг',
  OFFER_ACCEPTED: 'Условия согласованы — переход к подписанию договора',
  FUNDED: 'Кредитные средства зачислены на расчётный счёт',
  APPROVED: 'Кредит одобрен на запрашиваемых условиях',
  CONTRACT_SIGNED: 'Договор подписан — ожидается зачисление транша',
  REJECTED: 'Сформирован персональный план рекомендаций по оздоровлению',
  CANCELLED: 'Рассмотрение заявки прекращено',
  SCORING_AND_POLICY: 'Автоматическая оценка рисков и расчёт кредитного лимита',
  ENRICHMENT: 'Сбор подтверждённых сведений из ФНС и БКИ',
  VALIDATION: 'Проверка корректности заполненных реквизитов',
  SUBMITTED: 'Заявка зарегистрирована и передана на обработку',
  DRAFT: 'Заполните параметры для отправки заявки в банк',
};

interface Props {
  currentState: AppState;
}

export function PipelineTracker({ currentState }: Props) {
  const currentIdx = getStepIndex(currentState);
  const isRejected = currentState === 'REJECTED';
  const isCancelled = currentState === 'CANCELLED';
  const isFunded = currentState === 'FUNDED';
  const targetIdx = isRejected || isCancelled ? 5 : currentIdx;

  const rawLabel = STATE_LABELS[currentState]?.label ?? currentState;
  const statusLabel = rawLabel;
  const explanation = STATUS_EXPLANATIONS[currentState];

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5 alfa-card-hover">
      {/* Header with state indicator */}
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Статус рассмотрения заявки
        </p>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Indicator */}
          {isFunded || currentState === 'APPROVED' ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          ) : isRejected || isCancelled ? (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-[#EF3124] shrink-0">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
          ) : currentState === 'COUNTER_OFFER' || currentState === 'MANUAL_REVIEW' || currentState === 'NEED_CLARIFICATION' || currentState === 'RESUBMITTED' ? (
            <span className="inline-flex items-center justify-center w-5 h-5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse ring-4 ring-amber-500/20" />
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-5 h-5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF3124] animate-pulse ring-4 ring-[#EF3124]/20" />
            </span>
          )}

          {/* Status Name */}
          <span className="text-sm font-bold text-neutral-900">
            {statusLabel}
          </span>

          {/* Human-readable explanation */}
          {explanation && (
            <span className="text-xs text-neutral-500">
              — {explanation}
            </span>
          )}
        </div>
      </div>

      {/* Horizontal Stepper Track */}
      <div className="overflow-x-auto touch-scroll pb-3 pt-1 -mx-2 px-2 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="min-w-[520px] px-2 sm:px-6">
          <div className="flex items-start justify-between relative">
            {STEPS.map((step, idx) => {
              const isFailedNode = (isRejected || isCancelled) && idx === targetIdx;
              const isApproved = currentState === 'APPROVED';
              const isDone = idx < targetIdx || (isFunded && idx === targetIdx) || (isApproved && idx === targetIdx);
              const isActive = idx === targetIdx && !isRejected && !isCancelled && !isFunded && !isApproved;
              const isAmberActive =
                isActive &&
                (currentState === 'COUNTER_OFFER' ||
                  currentState === 'MANUAL_REVIEW' ||
                  currentState === 'NEED_CLARIFICATION' ||
                  currentState === 'RESUBMITTED');
              const isLineDone = idx <= targetIdx;

              return (
                <div
                  key={step.state}
                  className="flex-1 relative flex flex-col items-center"
                >
                  {/* Connector line from previous step */}
                  {idx > 0 && (
                    <div
                      className={`absolute top-3.5 right-1/2 w-full h-[2px] -translate-y-1/2 transition-colors duration-300 pointer-events-none z-0 ${
                        isLineDone ? 'bg-emerald-500' : 'bg-neutral-200'
                      }`}
                    />
                  )}

                  {/* Circle node */}
                  <div
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ring-4 ring-white ${
                      isFailedNode
                        ? 'bg-[#EF3124] text-white shadow-xs'
                        : isDone
                          ? 'bg-emerald-500 text-white'
                          : isAmberActive
                            ? 'bg-amber-500 text-white font-bold text-xs shadow-xs ring-amber-500/20'
                            : isActive
                              ? 'bg-[#EF3124] text-white font-bold text-xs shadow-xs ring-[#EF3124]/20'
                              : 'bg-neutral-100 border border-neutral-300 text-neutral-400 text-xs font-semibold'
                    }`}
                  >
                    {isFailedNode ? (
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : isDone ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  {/* Label below circle node */}
                  <div className="mt-2 text-center w-full px-1">
                    <span
                      className={`text-[11px] block leading-tight truncate transition-colors ${
                        isFailedNode
                          ? 'font-bold text-[#EF3124]'
                          : isActive
                            ? 'font-bold text-neutral-900'
                            : isDone
                              ? 'font-medium text-neutral-700'
                              : 'font-medium text-neutral-400'
                      }`}
                      title={step.label}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alert for NEED_CLARIFICATION */}
      {currentState === 'NEED_CLARIFICATION' && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200/80 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-semibold text-amber-900">
              Требуется уточнение данных
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Кредитный эксперт банка запросил дополнительные документы или пояснения. Пожалуйста, ответьте на запрос ниже для продолжения рассмотрения заявки.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
