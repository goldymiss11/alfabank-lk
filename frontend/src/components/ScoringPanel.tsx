import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { ScoringResult, RiskGrade } from '../types';
import {
  AlertOctagon,
  Activity,
  Layers,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  scoring: ScoringResult;
}

// ─── Ru Dictionary for Factors & Groups ──────────────────────────────────────
const FACTOR_NAME_RU: Record<string, string> = {
  business_age: 'Возраст бизнеса',
  authorized_capital: 'Уставный капитал',
  headcount: 'Численность сотрудников',
  credit_history: 'Кредитная история',
  current_overdue: 'Текущая просрочка',
  debt_burden: 'Долговая нагрузка',
  monthly_revenue: 'Среднемесячная выручка',
  revenue_trend: 'Тренд выручки',
  revenue_volatility: 'Волатильность выручки',
  cash_gap: 'Кассовые разрывы',
  unique_counterparties: 'Уникальные контрагенты',
  tax_payments: 'Регулярность налоговых платежей',
  tax_regularity: 'Регулярность налоговых платежей',
};

const GROUP_LABELS_RU: Record<string, string> = {
  TURNOVER: 'Обороты',
  FNS: 'ФНС',
  BKI: 'БКИ',
  EGRUL: 'ЕГРЮЛ',
};

const GRADE_BADGE_STYLE: Record<RiskGrade, { text: string; bg: string; border: string }> = {
  A: { text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  B: { text: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200' },
  C: { text: 'text-amber-800',   bg: 'bg-amber-50',    border: 'border-amber-200' },
  D: { text: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-200' },
  E: { text: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200' },
};

// ─── Helpers for SVG Arc ─────────────────────────────────────────────────────
function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
}

// ─── ScoreMeter Component ────────────────────────────────────────────────────
function ScoreMeter({ score, riskGrade }: { score: number; riskGrade: RiskGrade }) {
  const clampedScore = Math.max(0, Math.min(1000, score));

  // Gauge geometry: 240 degree arc from 150° to 390°
  const cx = 100;
  const cy = 88;
  const r = 66;
  const startAngle = 150;
  const totalArc = 240;
  const currentAngle = startAngle + (clampedScore / 1000) * totalArc;

  // Active color based on risk zones
  const activeColor =
    clampedScore >= 650 ? '#10B981' : clampedScore >= 500 ? '#F5A623' : '#EF3124';

  const gradeStyle = GRADE_BADGE_STYLE[riskGrade] ?? {
    text: 'text-neutral-700',
    bg: 'bg-neutral-100',
    border: 'border-neutral-200',
  };

  const tipPos = polarToCartesian(cx, cy, r, currentAngle);

  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative w-[190px] h-[132px] flex items-center justify-center">
        <svg width="190" height="132" viewBox="0 0 200 140" className="overflow-visible">
          <defs>
            <filter id="meter-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background track: High risk sector (<500): Red #EF3124 */}
          <path
            d={describeArc(cx, cy, r, 150, 268)}
            fill="none"
            stroke="#EF3124"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.22"
          />

          {/* Background track: Moderate risk sector (500-650): Amber #F5A623 */}
          <path
            d={describeArc(cx, cy, r, 272, 304)}
            fill="none"
            stroke="#F5A623"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.22"
          />

          {/* Background track: Reliable borrower (>650): Emerald #10B981 */}
          <path
            d={describeArc(cx, cy, r, 308, 390)}
            fill="none"
            stroke="#10B981"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.22"
          />

          {/* Active progress arc */}
          {clampedScore > 0 && (
            <path
              d={describeArc(cx, cy, r, startAngle, currentAngle)}
              fill="none"
              stroke={activeColor}
              strokeWidth="8.5"
              strokeLinecap="round"
              filter="url(#meter-glow)"
            />
          )}

          {/* Needle / Tip pointer indicator */}
          {clampedScore > 0 && (
            <circle
              cx={tipPos.x}
              cy={tipPos.y}
              r="4.5"
              fill="#FFFFFF"
              stroke={activeColor}
              strokeWidth="2.5"
            />
          )}

          {/* Tick marks and labels for scale endpoints */}
          <text x="32" y="130" textAnchor="middle" className="text-[10px] fill-neutral-400 font-mono">0</text>
          <text x="100" y="14" textAnchor="middle" className="text-[10px] fill-neutral-400 font-mono">500</text>
          <text x="168" y="130" textAnchor="middle" className="text-[10px] fill-neutral-400 font-mono">1000</text>
        </svg>

        {/* Center score readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-3 pointer-events-none">
          <span className="text-3xl font-black text-neutral-900 tabular-nums tracking-tight">
            {score}
          </span>
          <span className="text-xs text-neutral-500 font-medium">из 1000</span>
        </div>
      </div>

      {/* Grade badge */}
      <div
        className={`mt-1.5 rounded-full px-3 py-0.5 text-xs font-black tracking-wide border shadow-xs ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.border}`}
      >
        Grade {riskGrade}
      </div>

      <span className="text-[11px] text-neutral-500 mt-1 font-medium">
        {clampedScore >= 650 ? 'Надёжный заёмщик' : clampedScore >= 500 ? 'Умеренный риск' : 'Высокий риск'}
      </span>
    </div>
  );
}

// ─── Main ScoringPanel Component ─────────────────────────────────────────────
export function ScoringPanel({ scoring }: Props) {
  const { risk_score, pd, risk_grade, stop_factors = [], factors_breakdown = [] } = scoring;

  // LGD: 45% standard unsecured recovery parameter
  const lgd = 0.45;
  const el = pd * lgd;

  // Collateral requirement policy logic
  const requiresCollateral =
    risk_grade === 'D' || risk_grade === 'E' || risk_score < 500 || stop_factors.length > 0;

  // Tabs for factors view mode
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [filterMode, setFilterMode] = useState<'all' | 'pos' | 'neg'>('all');

  // Sorted factors: strongest impact first (SHAP standard)
  const sortedFactors = [...factors_breakdown].sort(
    (a, b) => Math.abs(b.score_delta) - Math.abs(a.score_delta)
  );

  const filteredFactors = sortedFactors.filter((f) => {
    if (filterMode === 'pos') return f.score_delta >= 0;
    if (filterMode === 'neg') return f.score_delta < 0;
    return true;
  });

  const maxAbsDelta = Math.max(...factors_breakdown.map((f) => Math.abs(f.score_delta)), 1);

  // Chart data for waterfall Recharts view
  const chartData = sortedFactors.slice(0, 10).map((f) => {
    const rawName = FACTOR_NAME_RU[f.factor_name] ?? f.factor_name;
    return {
      name: rawName.length > 20 ? rawName.slice(0, 20) + '…' : rawName,
      fullName: rawName,
      delta: f.score_delta,
      group: GROUP_LABELS_RU[f.group] ?? f.group,
      desc: f.description,
    };
  });

  const posCount = factors_breakdown.filter((f) => f.score_delta >= 0).length;
  const negCount = factors_breakdown.filter((f) => f.score_delta < 0).length;

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-5 space-y-5 text-neutral-900 shadow-xs alfa-card-hover">
      {/* ─── 1. Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-[#EF3124]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">
              Скоринговая модель МСБ (ML-Scoring)
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Оценка вероятности дефолта и риск-факторов на основе данных ФНС, БКИ и оборотов
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200/80">
            Alfa Risk Engine v3.2
          </span>
        </div>
      </div>

      {/* ─── 2 & 3. ScoreMeter + Analytical Metrics Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* ScoreMeter Gauge */}
        <div className="lg:col-span-4 flex justify-center py-2 border-b lg:border-b-0 lg:border-r border-neutral-200/80 lg:pr-5">
          <ScoreMeter score={risk_score} riskGrade={risk_grade} />
        </div>

        {/* 3 Analytics Cards */}
        <div className="lg:col-span-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Metric 1: PD */}
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-xl p-3 text-center flex flex-col justify-between">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Probability of Default (PD)
              </span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-neutral-900 tabular-nums tracking-tight">
                  {(pd * 100).toFixed(1)}%
                </span>
              </div>
              <span className="text-[11px] text-neutral-500">Вероятность дефолта</span>
            </div>

            {/* Metric 2: EL */}
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-xl p-3 text-center flex flex-col justify-between">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Expected Loss (EL)
              </span>
              <div className="my-1.5">
                <span className="text-2xl font-black text-neutral-900 tabular-nums tracking-tight">
                  {(el * 100).toFixed(1)}%
                </span>
              </div>
              <span className="text-[11px] text-neutral-500">Потери при LGD 45%</span>
            </div>

            {/* Metric 3: Credit Status */}
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-xl p-3 text-center flex flex-col justify-between">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Кредитный статус
              </span>
              <div className="my-1.5 flex items-center justify-center gap-1.5">
                {requiresCollateral ? (
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span
                  className={`text-sm font-bold tracking-tight ${
                    requiresCollateral ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {requiresCollateral ? 'Требуется обеспечение' : 'Одобрение без залога'}
                </span>
              </div>
              <span className="text-[11px] text-neutral-500">
                {requiresCollateral ? 'Повышенный риск' : 'Стандартный лимит'}
              </span>
            </div>
          </div>

          {/* ─── 5. Stop Factors Block (if detected) ─── */}
          {stop_factors.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 text-[#EF3124] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-rose-900 uppercase tracking-wider text-[11px] mb-0.5">
                  Обнаружены стоп-факторы ({stop_factors.length})
                </div>
                <div className="space-y-0.5">
                  {stop_factors.map((sf, i) => (
                    <div key={i} className="text-rose-800 font-medium">
                      • {sf}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 4. SHAP Waterfall & Factor Decomposition ─── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 tracking-tight">
              Декомпозиция влияния факторов на скоринговый балл (SHAP-values)
            </h4>
            <p className="text-xs text-neutral-500">
              Вклад показателей компании в отклонение скорингового балла от базового уровня модели
            </p>
          </div>

          {/* View mode toggle (List vs Chart) */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl border border-neutral-200/80 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all alfa-btn ${
                viewMode === 'list'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Факторы</span>
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all alfa-btn ${
                viewMode === 'chart'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>График</span>
            </button>
          </div>
        </div>

        {/* List View with Horizontal Waterfall Indicators & Deltas */}
        {viewMode === 'list' ? (
          <div className="space-y-2">
            {/* Filter pills */}
            <div className="flex items-center justify-between gap-2 text-xs py-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all alfa-btn ${
                    filterMode === 'all'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  Все ({factors_breakdown.length})
                </button>
                <button
                  onClick={() => setFilterMode('pos')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 alfa-btn ${
                    filterMode === 'pos'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'text-neutral-500 hover:text-emerald-700'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  Позитивные ({posCount})
                </button>
                <button
                  onClick={() => setFilterMode('neg')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 alfa-btn ${
                    filterMode === 'neg'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'text-neutral-500 hover:text-rose-700'
                  }`}
                >
                  <TrendingDown className="w-3 h-3" />
                  Негативные ({negCount})
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-3 text-[11px] text-neutral-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Повышает балл</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Снижает балл</span>
                </div>
              </div>
            </div>

            {/* Factors list */}
            <div className="space-y-2">
              {filteredFactors.map((factor, idx) => {
                const displayName = FACTOR_NAME_RU[factor.factor_name] ?? factor.factor_name;
                const groupName = GROUP_LABELS_RU[factor.group] ?? factor.group;
                const isPositive = factor.score_delta >= 0;

                return (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#F8F9FB] border border-neutral-200/80 hover:border-neutral-300 transition-all"
                  >
                    {/* Factor Name & Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900 tracking-tight truncate">
                          {displayName}
                        </span>
                        {groupName && (
                          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-neutral-200/70 text-neutral-600 border border-neutral-300/60">
                            {groupName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 truncate">
                        {factor.description || String(factor.raw_value)}
                      </div>
                    </div>

                    {/* Horizontal Waterfall / SHAP indicator bar + Delta Chip */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {/* Bi-directional horizontal bar */}
                      <div className="w-28 sm:w-36 flex items-center">
                        {/* Negative side (left from center) */}
                        <div className="w-1/2 h-2 bg-neutral-200 rounded-l-full flex justify-end overflow-hidden">
                          {!isPositive && (
                            <div
                              className="h-full bg-[#EF3124] rounded-l-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (Math.abs(factor.score_delta) / maxAbsDelta) * 100
                                )}%`,
                              }}
                            />
                          )}
                        </div>
                        {/* Zero axis mark */}
                        <div className="w-0.5 h-3.5 bg-neutral-400 shrink-0" />
                        {/* Positive side (right from center) */}
                        <div className="w-1/2 h-2 bg-neutral-200 rounded-r-full flex justify-start overflow-hidden">
                          {isPositive && (
                            <div
                              className="h-full bg-emerald-500 rounded-r-full"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (factor.score_delta / maxAbsDelta) * 100
                                )}%`,
                              }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Precise Delta Chip strictly formatted */}
                      {isPositive ? (
                        <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums min-w-[88px] text-center">
                          +{factor.score_delta} баллов
                        </span>
                      ) : (
                        <span className="bg-rose-50 border border-rose-200 text-[#EF3124] rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums min-w-[88px] text-center">
                          {factor.score_delta} баллов
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Recharts Waterfall BarChart View in Alfa Light Theme */
          <div className="bg-[#F8F9FB] rounded-xl border border-neutral-200/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Топ-10 факторов по модулю влияния (Δ балла)</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981] inline-block" /> +Вклад
                </span>
                <span className="flex items-center gap-1.5 text-neutral-700 font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#EF3124] inline-block" /> -Вклад
                </span>
              </div>
            </div>

            <div className="w-full h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ left: 10, right: 30, top: 5, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    stroke="#CBD5E1"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    tickFormatter={(v) => (v > 0 ? `+${v}` : `${v}`)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#CBD5E1"
                    tick={{ fontSize: 10, fill: '#334155' }}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E8F0',
                      borderRadius: '12px',
                      color: '#0F172A',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                    }}
                    itemStyle={{ color: '#0F172A' }}
                    formatter={(v: unknown) => {
                      const n = Number(v);
                      return [n > 0 ? `+${n} баллов` : `${n} баллов`, 'Влияние на балл'];
                    }}
                    labelFormatter={(label) =>
                      chartData.find((d) => d.name === label)?.fullName ?? label
                    }
                  />
                  <ReferenceLine x={0} stroke="#CBD5E1" strokeDasharray="3 3" />
                  <Bar dataKey="delta" radius={[0, 4, 4, 0]} maxBarSize={16}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.delta >= 0 ? '#10B981' : '#EF3124'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
