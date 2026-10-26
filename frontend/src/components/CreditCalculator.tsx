import { useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';
import { Slider } from './Slider';
import { formatRub, PRODUCT_LABELS } from '../utils';
import type { ProductType } from '../types';

const PRODUCTS: { type: ProductType; label: string; minAmt: number; maxAmt: number; minTerm: number; maxTerm: number; rateA: number; rateB: number; rateC: number }[] = [
  { type: 'OVERDRAFT',            label: 'Овердрафт',            minAmt: 50000,    maxAmt: 3000000,  minTerm: 3,  maxTerm: 12, rateA: 18, rateB: 21, rateC: 25 },
  { type: 'WORKING_CAPITAL_LOAN', label: 'Оборотный кредит',     minAmt: 500000,   maxAmt: 30000000, minTerm: 6,  maxTerm: 36, rateA: 16, rateB: 19, rateC: 23 },
  { type: 'REVOLVING_LINE_VKL',   label: 'ВКЛ',                  minAmt: 300000,   maxAmt: 20000000, minTerm: 12, maxTerm: 36, rateA: 17, rateB: 20, rateC: 24 },
  { type: 'INVESTMENT_LOAN',      label: 'Инвестиционный кредит', minAmt: 1000000,  maxAmt: 50000000, minTerm: 12, maxTerm: 60, rateA: 14, rateB: 17, rateC: 21 },
];

interface Props {
  netMonthlyIncome: number;
  existingPayments: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  suggestedProduct?: ProductType;
  suggestedAmount?: number;
  suggestedTerm?: number;
  onSubmit: (product: ProductType, amount: number, term: number) => void;
  isSplit?: boolean;
}

function annuity(principal: number, annualRate: number, termMonths: number): number {
  if (annualRate === 0 || termMonths === 0) return 0;
  const r = annualRate / 100 / 12;
  return principal * r / (1 - Math.pow(1 + r, -termMonths));
}

export function CreditCalculator({ netMonthlyIncome, existingPayments, grade, suggestedProduct, suggestedAmount, suggestedTerm, onSubmit, isSplit }: Props) {
  const [product, setProduct] = useState<ProductType>(suggestedProduct ?? 'WORKING_CAPITAL_LOAN');
  const cfg = PRODUCTS.find(p => p.type === product)!;

  const [amount, setAmount] = useState(suggestedAmount ?? Math.floor((cfg.minAmt + cfg.maxAmt) / 2));
  const [term, setTerm] = useState(suggestedTerm ?? Math.floor((cfg.minTerm + cfg.maxTerm) / 2));
  const [submitting, setSubmitting] = useState(false);

  const [prevProps, setPrevProps] = useState({ suggestedProduct, suggestedAmount, suggestedTerm });
  if (
    prevProps.suggestedProduct !== suggestedProduct ||
    prevProps.suggestedAmount !== suggestedAmount ||
    prevProps.suggestedTerm !== suggestedTerm
  ) {
    setPrevProps({ suggestedProduct, suggestedAmount, suggestedTerm });
    const nextProduct = suggestedProduct ?? 'WORKING_CAPITAL_LOAN';
    const nextCfg = PRODUCTS.find((p) => p.type === nextProduct) ?? PRODUCTS[1];
    setProduct(nextProduct);
    setAmount(suggestedAmount ?? Math.floor((nextCfg.minAmt + nextCfg.maxAmt) / 2));
    setTerm(suggestedTerm ?? Math.floor((nextCfg.minTerm + nextCfg.maxTerm) / 2));
  }

  const safeAmount = Math.min(Math.max(amount, cfg.minAmt), cfg.maxAmt);
  const safeTerm = Math.min(Math.max(term, cfg.minTerm), cfg.maxTerm);

  const rateMap = { A: cfg.rateA, B: cfg.rateB, C: cfg.rateC, D: cfg.rateC + 4, E: cfg.rateC + 8 };
  const rate = rateMap[grade] ?? cfg.rateC;
  const discount = grade === 'A' ? 2.5 : grade === 'B' ? 1.5 : 0.5;
  const baseRate = (rate + discount).toFixed(1);

  const monthly = annuity(safeAmount, rate, safeTerm);
  const maxPayment = Math.max(0, netMonthlyIncome * 0.5 - existingPayments);
  const dti = netMonthlyIncome > 0 ? (monthly / netMonthlyIncome) * 100 : 0;

  const zone = dti < 30 ? 'green' : dti < 50 ? 'yellow' : 'red';
  const zoneConfig = {
    green: {
      label: 'Зелёная зона — одобрение без залога',
      cls: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      iconCls: 'text-emerald-600',
      icon: ShieldCheck,
    },
    yellow: {
      label: 'Жёлтая зона — возможен контр-оффер',
      cls: 'text-amber-700 bg-amber-50 border-amber-200',
      iconCls: 'text-amber-600',
      icon: AlertTriangle,
    },
    red: {
      label: 'Красная зона — превышение кредитного лимита',
      cls: 'text-red-700 bg-red-50 border-red-200',
      iconCls: 'text-[#EF3124]',
      icon: AlertOctagon,
    },
  };
  const activeZone = zoneConfig[zone];
  const ZoneIcon = activeZone.icon;

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-4 sm:p-6 shadow-xs alfa-card-hover">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Кредитный калькулятор</p>
        <h3 className="text-lg sm:text-xl font-bold text-neutral-900 mt-1">Safe Cash-Flow — умный расчет нагрузки бизнеса</h3>
      </div>

      {/* 2-column Bento Layout */}
      <div className={`grid grid-cols-1 ${isSplit ? '2xl:grid-cols-12' : 'lg:grid-cols-12'} gap-4 sm:gap-6 items-start`}>
        {/* Left column: Parameters (7 cols) */}
        <div className={`${isSplit ? '2xl:col-span-7' : 'lg:col-span-7'} space-y-4 sm:space-y-5`}>
          {/* Product selector tabs */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-neutral-500">Кредитный продукт</span>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {PRODUCTS.map(p => {
                const isSelected = product === p.type;
                return (
                  <button
                    key={p.type}
                    type="button"
                    onClick={() => {
                      setProduct(p.type);
                      setAmount(Math.floor((p.minAmt + p.maxAmt) / 4));
                      setTerm(Math.floor((p.minTerm + p.maxTerm) / 2));
                    }}
                    className={`rounded-full py-2 px-3 sm:px-3.5 text-xs font-semibold transition-all alfa-btn min-h-[36px] ${
                      isSelected
                        ? 'bg-[#0F1115] text-white shadow-xs'
                        : 'bg-[#F2F3F5] text-neutral-700 hover:bg-neutral-200'
                    }`}
                  >
                    {PRODUCT_LABELS[p.type] ?? p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount card */}
          <div className="rounded-2xl bg-[#F8F9FB] p-3.5 sm:p-5 space-y-2.5 border border-neutral-200/70 focus-within:border-neutral-300 focus-within:bg-white transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-neutral-500">Сумма кредита</span>
              <span className="text-xs text-neutral-400">лимит до {formatRub(cfg.maxAmt)}</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-neutral-900 tabular-nums tracking-tight">
              {safeAmount.toLocaleString('ru-RU')} ₽
            </div>
            <Slider
              value={safeAmount}
              min={cfg.minAmt}
              max={cfg.maxAmt}
              step={cfg.maxAmt <= 3_000_000 ? 50_000 : cfg.maxAmt <= 20_000_000 ? 100_000 : 500_000}
              onChange={setAmount}
              aria-label="Сумма кредита"
            />
            <div className="text-[11px] text-neutral-400 font-medium flex justify-between">
              <span>{formatRub(cfg.minAmt)}</span>
              <span>{formatRub(cfg.maxAmt)}</span>
            </div>
          </div>

          {/* Term card */}
          <div className="rounded-2xl bg-[#F8F9FB] p-3.5 sm:p-5 space-y-2.5 border border-neutral-200/70 focus-within:border-neutral-300 focus-within:bg-white transition-all">
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-neutral-500">Срок финансирования</span>
              <span className="text-xs text-neutral-400">от {cfg.minTerm} до {cfg.maxTerm} мес.</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-neutral-900 tabular-nums tracking-tight">
              {safeTerm} мес.
            </div>
            <Slider
              value={safeTerm}
              min={cfg.minTerm}
              max={cfg.maxTerm}
              step={1}
              onChange={setTerm}
              aria-label="Срок финансирования"
            />
            <div className="text-[11px] text-neutral-400 font-medium flex justify-between">
              <span>{cfg.minTerm} мес.</span>
              <span>{cfg.maxTerm} мес.</span>
            </div>
          </div>
        </div>

        {/* Right column: "Наше предложение" / Calculation Card (5 cols) */}
        <div className={isSplit ? '2xl:col-span-5' : 'lg:col-span-5'}>
          <div className="rounded-3xl bg-white border border-neutral-200/90 p-4 sm:p-6 space-y-4 shadow-sm sticky top-4">
            {/* Card Header */}
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Предварительный расчёт
            </div>

            {/* Monthly payment block */}
            <div>
              <div className="text-xs text-neutral-500 font-medium">Ежемесячный платёж</div>
              <div className="text-3xl font-black text-neutral-900 tabular-nums tracking-tight mt-1">
                {Math.round(monthly).toLocaleString('ru-RU')} ₽
              </div>
            </div>

            {/* Parameters list */}
            <div className="space-y-2.5 pt-3 border-t border-neutral-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Сумма кредита</span>
                <span className="font-bold text-neutral-900 tabular-nums">{safeAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Срок финансирования</span>
                <span className="font-bold text-neutral-900 tabular-nums">{safeTerm} мес.</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Процентная ставка</span>
                <div className="flex items-center gap-2">
                  <span className="line-through text-neutral-400 tabular-nums text-xs">{baseRate}%</span>
                  <span className="font-bold text-neutral-900 tabular-nums">{rate}%</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 text-xs font-bold">
                    -{discount}%
                  </span>
                </div>
              </div>
            </div>

            {/* Safe Cash-Flow Meter (DTI) */}
            <div className="space-y-2.5 pt-3 border-t border-neutral-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Safe Cash-Flow (DTI)</span>
                <span className={`font-bold tabular-nums ${zone === 'green' ? 'text-emerald-700' : zone === 'yellow' ? 'text-amber-700' : 'text-[#EF3124]'}`}>
                  {dti.toFixed(1)}%
                </span>
              </div>

              {/* Horizontal gradient scale */}
              <div className="relative pt-1 pb-1">
                <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-[#EF3124] relative shadow-inner">
                  {/* 30% divider */}
                  <div className="absolute top-0 bottom-0 left-[30%] w-0.5 bg-white/70" />
                  {/* 50% divider */}
                  <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-white/70" />
                  {/* Needle position marker */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-neutral-800 shadow-md transition-all duration-300"
                    style={{ left: `${Math.min(98, Math.max(2, dti))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-400 mt-1 font-medium">
                  <span>0%</span>
                  <span>30%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Zone status badge */}
              <div className={`flex items-center gap-2 text-xs font-semibold px-3.5 py-2.5 rounded-2xl border ${activeZone.cls}`}>
                <ZoneIcon className={`w-4 h-4 shrink-0 ${activeZone.iconCls}`} />
                <span>{activeZone.label}</span>
              </div>

              {/* Load explanation */}
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                {netMonthlyIncome > 0
                  ? `Платёж составляет ${dti.toFixed(1)}% от чистой среднемесячной прибыли компании.`
                  : 'Укажите финансовые показатели компании для точного расчёта нагрузки.'}
              </p>

              {maxPayment > 0 && (
                <div className="flex items-center justify-between text-[11px] text-neutral-500 bg-neutral-100/70 rounded-full px-3 py-1.5">
                  <span>Комфортный лимит (50% прибыли)</span>
                  <span className="font-semibold text-neutral-800 tabular-nums">{formatRub(maxPayment)}</span>
                </div>
              )}
            </div>

            {/* Main Action Button (CTA) */}
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onSubmit(product, safeAmount, safeTerm);
                } finally {
                  setSubmitting(false);
                }
              }}
              className="w-full bg-[#EF3124] hover:bg-[#D9261A] text-white py-3.5 px-6 rounded-full font-bold text-sm shadow-sm transition-all alfa-btn flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{submitting ? 'Сохраняем и отправляем…' : 'Подать заявку на этих условиях'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

