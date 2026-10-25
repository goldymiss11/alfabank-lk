import type { AppState, RiskGrade } from './types';

export const STATE_LABELS: Record<AppState, { label: string; color: string; bg: string }> = {
  DRAFT:              { label: 'Черновик',               color: 'text-zinc-600',   bg: 'bg-zinc-100' },
  SUBMITTED:          { label: 'Отправлена',             color: 'text-blue-700',   bg: 'bg-blue-50' },
  VALIDATION:         { label: 'Валидация',              color: 'text-blue-800',   bg: 'bg-blue-50' },
  ENRICHMENT:         { label: 'Обогащение данных',      color: 'text-indigo-700', bg: 'bg-indigo-50' },
  SCORING_AND_POLICY: { label: 'Скоринг и политика',    color: 'text-purple-700', bg: 'bg-purple-50' },
  APPROVED:           { label: 'Одобрено',              color: 'text-[#2FA84F]',  bg: 'bg-[#2FA84F]/10' },
  COUNTER_OFFER:      { label: 'Контр-оффер',           color: 'text-[#F5A623]',  bg: 'bg-[#F5A623]/10' },
  MANUAL_REVIEW:      { label: 'Ручной разбор',         color: 'text-[#F97316]',  bg: 'bg-[#F97316]/10' },
  NEED_CLARIFICATION: { label: 'Нужны уточнения',       color: 'text-[#F97316]',  bg: 'bg-[#F97316]/10' },
  RESUBMITTED:        { label: 'Повторный скоринг',     color: 'text-blue-700',   bg: 'bg-blue-50' },
  REJECTED:           { label: 'Отказ',                 color: 'text-[#EF3124]',  bg: 'bg-[#EF3124]/10' },
  OFFER_ACCEPTED:     { label: 'Оффер принят',          color: 'text-[#2FA84F]',  bg: 'bg-[#2FA84F]/10' },
  CONTRACT_SIGNED:    { label: 'Договор подписан',      color: 'text-[#2FA84F]',  bg: 'bg-[#2FA84F]/10' },
  FUNDED:             { label: 'Финансирование выдано', color: 'text-[#2FA84F]',  bg: 'bg-[#2FA84F]/15' },
  CANCELLED:          { label: 'Отменена',              color: 'text-zinc-500',   bg: 'bg-zinc-100' },
};

export const GRADE_CONFIG: Record<RiskGrade, { label: string; color: string; bg: string; border: string; hex: string }> = {
  A: { label: 'A', color: 'text-[#2FA84F]', bg: 'bg-[#2FA84F]/10',  border: 'border-[#2FA84F]/30', hex: '#2FA84F' },
  B: { label: 'B', color: 'text-[#F5A623]', bg: 'bg-[#F5A623]/10',  border: 'border-[#F5A623]/30', hex: '#F5A623' },
  C: { label: 'C', color: 'text-[#F97316]', bg: 'bg-[#F97316]/10',  border: 'border-[#F97316]/30', hex: '#F97316' },
  D: { label: 'D', color: 'text-[#EF3124]', bg: 'bg-[#EF3124]/10',  border: 'border-[#EF3124]/30', hex: '#EF3124' },
  E: { label: 'E', color: 'text-[#EF3124]', bg: 'bg-[#EF3124]/15',  border: 'border-[#EF3124]/40', hex: '#EF3124' },
};

export const PRODUCT_LABELS: Record<string, string> = {
  OVERDRAFT:            'Овердрафт',
  WORKING_CAPITAL_LOAN: 'Оборотный кредит',
  REVOLVING_LINE_VKL:   'ВКЛ (возобновляемая линия)',
  INVESTMENT_LOAN:      'Инвестиционный кредит',
};

export function formatRub(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн ₽`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} тыс. ₽`;
  return `${n.toLocaleString('ru-RU')} ₽`;
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const PIPELINE_STEPS: AppState[] = [
  'DRAFT', 'SUBMITTED', 'VALIDATION', 'ENRICHMENT',
  'SCORING_AND_POLICY', 'APPROVED', 'CONTRACT_SIGNED', 'FUNDED',
];

export const PRESET_BADGE: Record<string, { dotColor: string; color: string; bg: string }> = {
  coffee_shop_ip:      { dotColor: 'bg-emerald-500', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  manufacturing_ooo:   { dotColor: 'bg-amber-400',   color: 'text-amber-700',   bg: 'bg-amber-50' },
  logistics_seasonal:  { dotColor: 'bg-orange-500',  color: 'text-orange-700',  bg: 'bg-orange-50' },
  wholesale_rejected:  { dotColor: 'bg-rose-500',    color: 'text-red-700',     bg: 'bg-red-50' },
  custom_input:        { dotColor: 'bg-blue-400',    color: 'text-blue-700',    bg: 'bg-blue-50' },
};
