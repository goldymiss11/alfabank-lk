import { Clock } from 'lucide-react';
import type { AuditLogEntry } from '../types';
import { STATE_LABELS, formatDate } from '../utils';

const ACTOR_COLORS: Record<string, string> = {
  CLIENT_OWNER:       'bg-blue-100 text-blue-700',
  CLIENT_ACCOUNTANT:  'bg-cyan-100 text-cyan-700',
  SYSTEM_CONVEYOR:    'bg-purple-100 text-purple-700',
  BANK_UNDERWRITER:   'bg-amber-100 text-amber-700',
  BANK:               'bg-slate-100 text-slate-700',
};

const ACTOR_LABELS: Record<string, string> = {
  CLIENT_OWNER:       'Собственник',
  CLIENT_ACCOUNTANT:  'Бухгалтер',
  SYSTEM_CONVEYOR:    'Система',
  BANK_UNDERWRITER:   'Андеррайтер',
};

interface Props {
  auditLog: AuditLogEntry[];
}

export function AuditTimeline({ auditLog }: Props) {
  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 space-y-4 shadow-xs alfa-card-hover">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-neutral-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Audit Log — История событий</p>
      </div>

      <div className="space-y-0 relative pl-1">
        {/* Vertical line: 1px neutral */}
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-neutral-200" />

        {[...auditLog].reverse().map((entry, i) => {
          const actorColor = ACTOR_COLORS[entry.actor_type] ?? 'bg-gray-100 text-gray-600';
          const toLabel = STATE_LABELS[entry.to_state as keyof typeof STATE_LABELS];
          const fromLabel = entry.from_state ? STATE_LABELS[entry.from_state as keyof typeof STATE_LABELS] : null;

          return (
            <div key={entry.id} className={`relative flex items-start gap-3 pb-3 ${i === 0 ? 'opacity-100' : 'opacity-70'}`}>
              {/* Circle dot 8px */}
              <div
                className={`relative z-10 w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ring-2 ring-white ${
                  i === 0 ? 'bg-[#EF3124]' : 'bg-neutral-300'
                }`}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-current/20 ${actorColor}`}>
                    {ACTOR_LABELS[entry.actor_type] ?? entry.actor_type}
                  </span>
                  <span className="text-xs text-neutral-800 font-mono font-medium">{entry.trigger}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5 text-[10px]">
                  {fromLabel && <span className="text-gray-400">{fromLabel.label}</span>}
                  {fromLabel && <span className="text-gray-300">→</span>}
                  {toLabel && (
                    <span className={`font-bold ${toLabel.color}`}>{toLabel.label}</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(entry.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
