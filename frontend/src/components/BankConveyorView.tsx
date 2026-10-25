import type { Application } from '../types';
import { StateMachineGraph } from './StateMachineGraph';
import { ScoringPanel } from './ScoringPanel';
import { DecisionPanel } from './DecisionPanel';
import { EnrichmentViewer } from './EnrichmentViewer';
import { AuditTimeline } from './AuditTimeline';
import { UnderwriterPanel } from './UnderwriterPanel';
import { PRODUCT_LABELS } from '../utils';
import { Building2, CreditCard, Landmark, Calendar, Coins, Clock } from 'lucide-react';

interface Props {
  application: Application;
  onRefresh: () => void;
  isSplit?: boolean;
}

function formatBusinessAge(registrationDate?: string): string {
  if (!registrationDate) return 'не указан';
  try {
    const regYear = parseInt(registrationDate.slice(0, 4), 10);
    const curYear = new Date().getFullYear();
    const diff = curYear - regYear;
    if (isNaN(diff) || diff < 0) return `с ${registrationDate.slice(0, 4)} г.`;
    if (diff === 0) return 'менее года';
    const lastDigit = diff % 10;
    const lastTwo = diff % 100;
    let unit = 'лет';
    if (lastDigit === 1 && lastTwo !== 11) unit = 'год';
    else if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 10 || lastTwo >= 20)) unit = 'года';
    return `${diff} ${unit} (с ${regYear} г.)`;
  } catch {
    return `с ${registrationDate.slice(0, 4)} г.`;
  }
}

export function BankConveyorView({ application, onRefresh, isSplit }: Props) {
  const { company, state, scoring_result, decision_result, enrichment_snapshots, audit_log, requested_amount } = application;

  return (
    <div className="space-y-4">
      {/* Bank header */}
      <div className="rounded-3xl bg-white text-neutral-900 p-6 border border-neutral-200/80 shadow-xs space-y-5 alfa-card-hover">
        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 border border-red-200/60 rounded-full text-xs font-semibold text-[#EF3124]">
            <Landmark className="w-3.5 h-3.5 text-[#EF3124]" />
            <span>Кредитный конвейер Альфа-Банка · Аналитический терминал</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">ID заявки:</span>
            <span className="font-mono text-xs bg-neutral-100 border border-neutral-200/60 px-2.5 py-1 rounded-full text-neutral-600" title={application.id}>
              {application.id.slice(0, 8)}…
            </span>
          </div>
        </div>

        {/* Company data & chips */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100/80 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-[#EF3124]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight truncate">
                {company?.name || 'ООО Компания'}
              </h2>
              {company?.full_name && company.full_name !== company.name && (
                <p className="text-xs text-neutral-500 truncate max-w-xl mt-0.5">{company.full_name}</p>
              )}
            </div>
          </div>

          {/* Chips: INN, OKVED, Work duration */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-600">
              <span className="text-neutral-400 font-medium">ИНН:</span>
              <span className="font-mono font-bold text-neutral-800">{company?.inn || '—'}</span>
            </span>

            {company?.okved_main && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-600" title={company.okved_description}>
                <span className="text-neutral-400 font-medium">ОКВЭД:</span>
                <span className="font-mono font-bold text-neutral-800">{company.okved_main}</span>
              </span>
            )}

            {company?.registration_date && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-600">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-400 font-medium">Срок работы:</span>
                <span className="font-bold text-neutral-800">{formatBusinessAge(company.registration_date)}</span>
              </span>
            )}
          </div>
        </div>

        {/* Financial parameters grid (symmetric with ClientCabinetView) */}
        <div className="border-t border-neutral-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-[#F4F5F7] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <span>Запрошенная сумма</span>
              <Coins className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-xl font-extrabold text-neutral-900 tracking-tight tabular-nums mt-1">
              {requested_amount.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          <div className="bg-[#F4F5F7] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <span>Срок финансирования</span>
              <Clock className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-xl font-extrabold text-neutral-900 tracking-tight tabular-nums mt-1">
              {application.requested_term_months} <span className="text-sm font-normal text-neutral-500">мес.</span>
            </div>
          </div>

          <div className="bg-[#F4F5F7] rounded-2xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-neutral-400 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <span>Кредитный продукт</span>
              <CreditCard className="w-4 h-4 text-neutral-400" />
            </div>
            <div className="text-sm font-bold text-neutral-900 tracking-tight truncate mt-1 leading-snug" title={PRODUCT_LABELS[application.product_type] ?? application.product_type}>
              {PRODUCT_LABELS[application.product_type] ?? application.product_type}
            </div>
          </div>
        </div>
      </div>

      {/* Two columns: graph + underwriter */}
      <div className={`grid grid-cols-1 ${isSplit ? '2xl:grid-cols-2' : 'lg:grid-cols-2'} gap-4`}>
        <StateMachineGraph currentState={state} />
        <UnderwriterPanel application={application} onAction={onRefresh} />
      </div>

      {/* Enrichment data */}
      {enrichment_snapshots && (
        <EnrichmentViewer snapshots={enrichment_snapshots} />
      )}

      {/* Scoring */}
      {scoring_result && (
        <ScoringPanel scoring={scoring_result} />
      )}

      {/* Decision */}
      {decision_result && (
        <DecisionPanel decision={decision_result} requestedAmount={requested_amount} />
      )}

      {/* Audit log */}
      {audit_log && audit_log.length > 0 && (
        <AuditTimeline auditLog={audit_log} />
      )}
    </div>
  );
}
