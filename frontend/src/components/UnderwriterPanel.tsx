import { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileQuestion,
  Send,
  ShieldAlert,
  Sliders,
  Loader2,
} from 'lucide-react';
import api, { getApiErrorMessage } from '../api/client';
import { formatRub, GRADE_CONFIG, STATE_LABELS } from '../utils';
import type { Application } from '../types';

interface Props {
  application: Application;
  onAction: () => void;
}

type Action = 'APPROVE' | 'REJECT' | 'COUNTER_OFFER' | 'REQUEST_CLARIFICATION';

const ACTION_LABELS: Record<Action, string> = {
  APPROVE: 'Одобрить',
  REJECT: 'Отклонить',
  COUNTER_OFFER: 'Контр-оффер',
  REQUEST_CLARIFICATION: 'Запросить уточнения',
};

function calculateMonthlyPayment(principal: number, annualRatePct: number, termMonths: number): number {
  if (!principal || !termMonths || termMonths <= 0) return 0;
  if (!annualRatePct || annualRatePct <= 0) return Math.round(principal / termMonths);
  const monthlyRate = annualRatePct / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, termMonths);
  return Math.round((principal * monthlyRate * factor) / (factor - 1));
}

export function UnderwriterPanel({ application, onAction }: Props) {
  const { state, scoring_result, soft_flags_from_decision } = {
    ...application,
    soft_flags_from_decision: application.decision_result?.soft_flags ?? [],
  };

  const initialLimit =
    application.decision_result?.offers?.[0]?.approved_amount ??
    application.requested_amount;
  const initialRate =
    application.decision_result?.offers?.[0]?.annual_rate_pct ?? 14.5;
  const initialTerm =
    application.decision_result?.offers?.[0]?.term_months ??
    application.requested_term_months ??
    12;

  const [adjustedLimit, setAdjustedLimit] = useState<number>(initialLimit);
  const [adjustedRate, setAdjustedRate] = useState<number>(initialRate);
  const [adjustedTerm, setAdjustedTerm] = useState<number>(initialTerm);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState<Action | null>(null);
  const [error, setError] = useState('');

  const isManual =
    state === 'MANUAL_REVIEW' ||
    state === 'RESUBMITTED' ||
    state === 'NEED_CLARIFICATION';
  const gradeCfg = scoring_result ? GRADE_CONFIG[scoring_result.risk_grade] : null;

  const monthlyPayment = calculateMonthlyPayment(adjustedLimit, adjustedRate, adjustedTerm);

  async function takeAction(action: Action) {
    setLoading(action);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        action,
        comment:
          comment ||
          (action === 'REQUEST_CLARIFICATION'
            ? 'Предоставьте дополнительные пояснения и документы'
            : `${ACTION_LABELS[action]} — решение андеррайтера`),
      };

      if (action === 'APPROVE' || action === 'COUNTER_OFFER') {
        const customOffer = {
          variant_index: 1,
          product_type: application.product_type,
          approved_amount: adjustedLimit,
          term_months: adjustedTerm,
          annual_rate_pct: adjustedRate,
          monthly_payment: monthlyPayment,
          collateral_required: false,
          collateral_description: null,
          description: 'Индивидуальные условия андеррайтера',
        };
        payload.override_offers = [customOffer];
      }

      await api.post(`/underwriter/applications/${application.id}/decide`, payload);
      setComment('');
      onAction();
    } catch (requestError) {
      console.error('underwriter action error', requestError);
      setError(getApiErrorMessage(requestError, 'Не удалось сохранить решение. Проверьте статус заявки и параметры оффера.'));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-5 space-y-4 text-neutral-900 shadow-xs alfa-card-hover">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100/80 flex items-center justify-center text-[#EF3124] shrink-0">
            <UserCheck className="w-5 h-5 text-[#EF3124]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 tracking-tight">АРМ Кредитного Андеррайтера</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Human-in-the-Loop риск-контроль и утверждение параметров
            </p>
          </div>
        </div>

        <div>
          {isManual ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>На ручной проверке</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/60 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
              <span>{STATE_LABELS[state]?.label ?? state}</span>
            </span>
          )}
        </div>
      </div>

      {/* Quick stats in light terminal bento */}
      <div className="grid grid-cols-3 rounded-2xl border border-neutral-200/80 divide-x divide-neutral-200/70 bg-[#F8F9FB]">
        <div className="p-3">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Компания</p>
          <p className="text-xs font-bold text-neutral-900 truncate mt-0.5">{application.company?.name || '—'}</p>
          <p className="text-[10px] text-neutral-500 truncate mt-0.5">ИНН {application.company?.inn || '—'}</p>
        </div>
        <div className="p-3 text-center">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Запрошено</p>
          <p className="text-xs font-bold text-neutral-900 tabular-nums mt-0.5">{formatRub(application.requested_amount)}</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">{application.requested_term_months} мес.</p>
        </div>
        <div className="p-3 text-right">
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Грейд / Скор</p>
          <p className="text-xs font-bold mt-0.5 tabular-nums text-neutral-900">
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[11px] font-black mr-1 bg-white border border-neutral-200"
              style={{ color: gradeCfg?.hex ?? '#EF3124' }}
            >
              {gradeCfg?.label ?? '—'}
            </span>
            · {scoring_result?.risk_score ?? '—'}
          </p>
          <p className="text-[10px] text-neutral-500 mt-0.5">PD: {((scoring_result?.pd ?? 0) * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Soft flags for manual review */}
      {soft_flags_from_decision && soft_flags_from_decision.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Флаги для ручного разбора ({soft_flags_from_decision.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {soft_flags_from_decision.map((f, i) => (
              <span
                key={i}
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-white text-amber-900 border border-amber-200 font-medium shadow-2xs"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Manual review controls */}
      {isManual ? (
        <div className="space-y-4 pt-1">
          {/* Adjustment inputs */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                Ручная корректировка параметров
              </span>
              <span className="text-[11px] text-neutral-500 tabular-nums">
                Платёж: ≈ <strong className="text-neutral-900">{formatRub(monthlyPayment)}</strong>/мес.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Скорректированный лимит
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="50000"
                    value={adjustedLimit}
                    onChange={(e) => setAdjustedLimit(Math.max(0, Number(e.target.value) || 0))}
                    className="bg-transparent border-0 outline-none text-sm font-bold text-neutral-900 tabular-nums w-full p-0"
                  />
                  <span className="text-xs text-neutral-400 font-medium shrink-0">₽</span>
                </div>
                <p className="text-[10px] text-neutral-400 tabular-nums mt-0.5 truncate">
                  {formatRub(adjustedLimit)}
                </p>
              </div>

              <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Ставка (% годовых)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={adjustedRate}
                    onChange={(e) => setAdjustedRate(Math.max(0, Number(e.target.value) || 0))}
                    className="bg-transparent border-0 outline-none text-sm font-bold text-neutral-900 tabular-nums w-full p-0"
                  />
                  <span className="text-xs text-neutral-400 font-medium shrink-0">%</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Базовая ставка риска</p>
              </div>

              <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
                <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                  Срок кредита (мес.)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={adjustedTerm}
                    onChange={(e) => setAdjustedTerm(Math.max(1, Number(e.target.value) || 1))}
                    className="bg-transparent border-0 outline-none text-sm font-bold text-neutral-900 tabular-nums w-full p-0"
                  />
                  <span className="text-xs text-neutral-400 font-medium shrink-0">мес.</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">Срок договора</p>
              </div>
            </div>

            {/* Comment field */}
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3 focus-within:border-neutral-400 focus-within:bg-white transition-colors">
              <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                Обоснование решения / Резюме андеррайтера
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Укажите комментарий к одобрению, причину отказа или запрашиваемые документы..."
                rows={2}
                className="bg-transparent border-0 outline-none text-xs text-neutral-900 placeholder-neutral-400 w-full resize-none p-0 focus:ring-0 leading-relaxed"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            {error && (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {/* Approve button */}
              <button
                type="button"
                onClick={() => takeAction('APPROVE')}
                disabled={loading !== null}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all alfa-btn disabled:opacity-50"
              >
                {loading === 'APPROVE' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Одобрить</span>
              </button>

              {/* Counter-offer button */}
              <button
                type="button"
                onClick={() => takeAction('COUNTER_OFFER')}
                disabled={loading !== null}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all alfa-btn disabled:opacity-50"
              >
                {loading === 'COUNTER_OFFER' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                <span>Контр-оффер</span>
              </button>

              {/* Request clarification button */}
              <button
                type="button"
                onClick={() => takeAction('REQUEST_CLARIFICATION')}
                disabled={loading !== null}
                className="bg-amber-500 hover:bg-amber-600 text-white rounded-full py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all alfa-btn disabled:opacity-50"
              >
                {loading === 'REQUEST_CLARIFICATION' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileQuestion className="w-4 h-4" />
                )}
                <span>Запросить уточнения</span>
              </button>

              {/* Reject button */}
              <button
                type="button"
                onClick={() => takeAction('REJECT')}
                disabled={loading !== null}
                className="bg-rose-50 hover:bg-rose-100 text-[#EF3124] border border-rose-200 rounded-full py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2 transition-all alfa-btn disabled:opacity-50"
              >
                {loading === 'REJECT' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>Отказать</span>
              </button>
            </div>

            {/* Helper notice */}
            <div className="flex items-center gap-2 text-[11px] text-neutral-600 bg-[#F8F9FB] rounded-2xl px-3.5 py-2.5 border border-neutral-200/80">
              <Send className="w-3.5 h-3.5 text-[#EF3124] shrink-0" />
              <span>
                «Запросить уточнения» переведёт заявку в <strong>NEED_CLARIFICATION</strong> и откроет виджет ответа в кабинете клиента.
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#F8F9FB] rounded-2xl p-5 border border-neutral-200/70 text-center space-y-1">
          <p className="text-xs text-neutral-500">Заявка не находится в статусе ручного разбора андеррайтером</p>
          <p className="text-[11px] text-neutral-700">
            Текущий статус процесса: <strong className="text-neutral-900 font-bold">{STATE_LABELS[state]?.label ?? state}</strong>
          </p>
        </div>
      )}
    </div>
  );
}
