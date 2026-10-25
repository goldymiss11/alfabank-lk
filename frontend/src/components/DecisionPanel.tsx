import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { DecisionResult } from '../types';
import { formatRub } from '../utils';

interface Props {
  decision: DecisionResult;
  requestedAmount: number;
}

export function DecisionPanel({ decision, requestedAmount }: Props) {
  const {
    max_monthly_payment, max_unsecured_limit, max_secured_limit,
    dti_ratio,
  } = decision;
  const offers = decision.offers ?? [];
  const soft_flags = decision.soft_flags ?? [];

  const fits = requestedAmount <= max_unsecured_limit;
  const fitsSecured = requestedAmount <= max_secured_limit;

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 space-y-4 shadow-xs alfa-card-hover">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Модуль 2: Кредитная политика и расчёт лимитов</p>

      {/* Limit comparison */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#F8F9FB] rounded-2xl p-3 border border-neutral-200/80 text-center">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Запрошено</p>
            <p className="text-sm font-black text-neutral-900 tabular-nums mt-0.5">{formatRub(requestedAmount)}</p>
          </div>
          <div className={`rounded-2xl p-3 border text-center ${fits ? 'bg-emerald-50/60 border-emerald-300' : 'bg-amber-50/60 border-amber-300'}`}>
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Лимит без залога</p>
            <p className={`text-sm font-black tabular-nums mt-0.5 ${fits ? 'text-[#2FA84F]' : 'text-[#F5A623]'}`}>{formatRub(max_unsecured_limit)}</p>
          </div>
          <div className="bg-blue-50/60 rounded-2xl p-3 border border-blue-200 text-center">
            <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium">Лимит с залогом</p>
            <p className="text-sm font-black text-blue-700 tabular-nums mt-0.5">{formatRub(max_secured_limit)}</p>
          </div>
        </div>

        {/* Visual comparison bar */}
        <div className="relative h-4 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
          <div
            className="absolute top-0 left-0 h-full bg-[#2FA84F]/80 rounded-l-full transition-all"
            style={{ width: `${Math.min(100, (max_unsecured_limit / Math.max(requestedAmount, max_secured_limit)) * 100)}%` }}
          />
          <div
            className="absolute top-0 left-0 h-full bg-blue-400/30 transition-all"
            style={{ width: `${Math.min(100, (max_secured_limit / Math.max(requestedAmount, max_secured_limit)) * 100)}%` }}
          />
          <div
            className="absolute top-0 left-0 h-full border-r-2 border-[#EF3124] transition-all"
            style={{ width: `${Math.min(100, (requestedAmount / Math.max(requestedAmount, max_secured_limit)) * 100)}%` }}
          />
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-neutral-800 drop-shadow-sm">Лимит без залога</span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-[#F8F9FB] rounded-2xl p-3 border border-neutral-200/80">
          <p className="text-[10px] text-neutral-500">Макс. комфортный платёж</p>
          <p className="text-sm font-black text-neutral-900 tabular-nums mt-0.5">{formatRub(max_monthly_payment)}</p>
        </div>
        <div className="bg-[#F8F9FB] rounded-2xl p-3 border border-neutral-200/80">
          <p className="text-[10px] text-neutral-500">DTI (долговая нагрузка)</p>
          <p className={`text-sm font-black tabular-nums mt-0.5 ${dti_ratio < 0.3 ? 'text-[#2FA84F]' : dti_ratio < 0.5 ? 'text-[#F5A623]' : 'text-[#EF3124]'}`}>
            {(dti_ratio * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Policy checklist */}
      <div className="space-y-1.5 pt-1 border-t border-neutral-100">
        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Чек-лист кредитной политики</p>
        <div className={`flex items-center gap-1.5 text-xs ${fits ? 'text-[#2FA84F]' : 'text-[#F5A623]'}`}>
          {fits ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
          <span>{fits ? 'Запрошенная сумма ≤ лимит без залога → APPROVED' : `Запрошенная сумма > лимит без залога → COUNTER_OFFER`}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-xs ${fitsSecured ? 'text-blue-700' : 'text-[#EF3124]'}`}>
          {fitsSecured ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
          <span>{fitsSecured ? 'Возможно обеспечение под полную сумму' : 'Запрошенная сумма > лимит с залогом'}</span>
        </div>
        {soft_flags && soft_flags.length > 0 && (
          <div className="flex items-start gap-1.5 text-xs text-orange-700">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Мягкие флаги: {soft_flags.join(', ')} → возможен MANUAL_REVIEW</span>
          </div>
        )}
      </div>

      {/* Offers summary */}
      {offers && offers.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-neutral-100">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Сформированные офферы</p>
          {offers.map((o) => (
            <div key={o.variant_index} className="flex justify-between items-center text-xs bg-[#F8F9FB] rounded-lg px-2.5 py-1.5 border border-neutral-200/80">
              <span className="text-neutral-700">Оффер {o.variant_index}: {o.product_type}</span>
              <span className="font-bold text-neutral-900 tabular-nums">{formatRub(o.approved_amount)} × {o.annual_rate_pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
