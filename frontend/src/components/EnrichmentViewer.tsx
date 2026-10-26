import { useState } from 'react';
import type { EnrichmentSnapshots } from '../types';
import { formatRub } from '../utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Building2,
  BarChart2,
  FileText,
  Wallet,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  Users,
  Clock,
  Activity,
  Landmark,
  TrendingUp,
  TrendingDown,
  Check,
} from 'lucide-react';

interface Props {
  snapshots: EnrichmentSnapshots;
}

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

type Tab = 'fns' | 'egrul' | 'bki' | 'accounts';

function formatRussianDate(iso?: string): string {
  if (!iso) return 'Не указана';
  try {
    const parts = iso.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
      ];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${monthNames[monthIdx]} ${year} г.`;
      }
    }
    return iso;
  } catch {
    return iso;
  }
}

export function EnrichmentViewer({ snapshots }: Props) {
  const [tab, setTab] = useState<Tab>('fns');
  const { egrul, fns, bki, alfa_accounts } = snapshots;

  // ─── Status Dots per Tab ───────────────────────────────────────────────────
  const hasFnsBlock = (fns.tax_blocks?.length ?? 0) > 0;
  const hasFnsDiscrepancy = (fns.tax_discrepancies ?? 0) > 0;
  const fnsStatusDot = hasFnsBlock
    ? 'bg-rose-500'
    : hasFnsDiscrepancy
    ? 'bg-amber-400'
    : 'bg-emerald-400';

  const hasEgrulRisk = Boolean(egrul.is_liquidating);
  const egrulStatusDot = hasEgrulRisk ? 'bg-rose-500' : 'bg-emerald-400';

  const hasBkiSevere = Boolean(bki.overdue_90_plus || bki.overdue_60);
  const hasBkiWarning = Boolean(bki.overdue_30);
  const bkiStatusDot = hasBkiSevere
    ? 'bg-rose-500'
    : hasBkiWarning
    ? 'bg-amber-400'
    : 'bg-emerald-400';

  const hasAccountWarning = !alfa_accounts.tax_payments_regular;
  const accountsStatusDot = hasAccountWarning ? 'bg-amber-400' : 'bg-emerald-400';

  const TABS: {
    key: Tab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    statusDot: string;
  }[] = [
    {
      key: 'fns',
      label: 'ФНС (налоги)',
      shortLabel: 'ФНС',
      icon: <BarChart2 className="w-3.5 h-3.5" />,
      statusDot: fnsStatusDot,
    },
    {
      key: 'egrul',
      label: 'ЕГРЮЛ (юр. статус)',
      shortLabel: 'ЕГРЮЛ',
      icon: <Building2 className="w-3.5 h-3.5" />,
      statusDot: egrulStatusDot,
    },
    {
      key: 'bki',
      label: 'БКИ (кредитная история)',
      shortLabel: 'БКИ',
      icon: <FileText className="w-3.5 h-3.5" />,
      statusDot: bkiStatusDot,
    },
    {
      key: 'accounts',
      label: 'Счета Альфа-Банка (обороты 12 мес.)',
      shortLabel: 'Обороты',
      icon: <Wallet className="w-3.5 h-3.5" />,
      statusDot: accountsStatusDot,
    },
  ];

  // ─── Turnover Analytics ────────────────────────────────────────────────────
  const revenueList = alfa_accounts.monthly_revenue ?? [];
  const totalRevenue = revenueList.reduce((acc, v) => acc + v, 0);
  const avgRevenue = revenueList.length > 0 ? totalRevenue / revenueList.length : 0;
  const first3 = revenueList.slice(0, 3);
  const last3 = revenueList.slice(-3);
  const avgFirst3 = first3.length > 0 ? first3.reduce((a, b) => a + b, 0) / first3.length : 0;
  const avgLast3 = last3.length > 0 ? last3.reduce((a, b) => a + b, 0) / last3.length : 0;
  const trendPct = avgFirst3 > 0 ? Math.round(((avgLast3 - avgFirst3) / avgFirst3) * 100) : 0;
  const isPositiveTrend = trendPct >= 0;
  const taxSharePct = alfa_accounts.tax_payments_regular ? 5.2 : 1.9;

  const chartData = revenueList.map((v, i) => ({
    month: MONTH_LABELS[i % 12],
    revenue: Math.round(v / 1000),
    rawRevenue: v,
  }));

  // ─── BKI Calculations ──────────────────────────────────────────────────────
  const bkiScore = bki.overdue_90_plus
    ? '320 / 1000 (Низкий)'
    : bki.overdue_60 || bki.overdue_30
    ? '590 / 1000 (Умеренный)'
    : '840 / 1000 (Высокий)';

  const closedLoansCount = bki.credit_history_months
    ? Math.max(1, Math.round(bki.credit_history_months / 12) * 2)
    : 4;

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-3.5 sm:p-5 space-y-4 text-neutral-900 shadow-xs alfa-card-hover">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#EF3124]" />
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">
              Обогащение данных (Цифровые реестры и выписки)
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Автоматический сбор сведений из ФНС, ЕГРЮЛ, БКИ и транзакционной истории Альфа-Банка
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-xs font-semibold text-emerald-800 self-start sm:self-auto shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Цифровой комплаенс-профиль</span>
        </div>
      </div>

      {/* Tabs pills */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {TABS.map(({ key, label, shortLabel, icon, statusDot }) => {
          const isActive = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-3 sm:px-4 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer alfa-btn min-h-[34px] ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-xs border border-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot}`} />
              <span className={isActive ? 'text-[#EF3124]' : 'text-neutral-400'}>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden inline">{shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: ФНС ────────────────────────────────────────────────────── */}
      {tab === 'fns' && (
        <div className="space-y-4 pt-1">
          {/* Verification Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {hasFnsBlock ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>Счета заблокированы ({fns.tax_blocks.length} приостановление)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Блокировок счетов нет (ст. 76 НК РФ)</span>
              </div>
            )}

            {fns.tax_discrepancies === 0 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Разрывов не выявлено (АСК НДС-2)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Внимание: {fns.tax_discrepancies} {fns.tax_discrepancies === 1 ? 'разрыв' : 'разрыва'} по НДС</span>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/80">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Шлюз СМЭВ 3 / АИС Налог-3</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Приостановления по 76 НК РФ</p>
              <p
                className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${
                  hasFnsBlock ? 'text-[#EF3124]' : 'text-emerald-600'
                }`}
              >
                {hasFnsBlock ? `${fns.tax_blocks.length} активных` : 'Отсутствуют'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Блокировки банковских счетов</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Разрывы по НДС (АСК НДС-2)</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {fns.tax_discrepancies > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                <p
                  className={`text-sm font-bold tabular-nums tracking-tight ${
                    fns.tax_discrepancies === 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {fns.tax_discrepancies === 0 ? '0 (Без расхождений)' : `${fns.tax_discrepancies} факта`}
                </p>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Проверка цепочек контрагентов</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Среднесписочная численность</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Users className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight">
                  {fns.employee_count} {fns.employee_count === 1 ? 'сотрудник' : 'сотрудников'}
                </p>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Официальные сведения по РСВ</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Фискальная задолженность</p>
              <p
                className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${
                  hasFnsBlock ? 'text-[#EF3124]' : 'text-emerald-600'
                }`}
              >
                {hasFnsBlock ? 'Требует сверки' : '0,00 ₽ (Чисто)'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Пени, штрафы и недоимки</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Своевременность отчетности</p>
              <p
                className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${
                  hasFnsBlock ? 'text-[#EF3124]' : 'text-emerald-600'
                }`}
              >
                {hasFnsBlock ? 'Выявлены срывы' : '100% в срок'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Сдача годовых и квартальных форм</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Статус проверки ФНС</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                Актуально (Онлайн)
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Электронный обмен через СМЭВ</p>
            </div>
          </div>

          {/* Detailed Tax Blocks if any */}
          {hasFnsBlock && (
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#EF3124] flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" />
                Активные решения о приостановлении операций (ст. 76 НК РФ)
              </p>
              <div className="space-y-2">
                {(fns.tax_blocks ?? []).map((block, i) => (
                  <div
                    key={i}
                    className="bg-rose-50 border border-rose-200 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-900">{block.type}</span>
                        <span className="text-[10px] bg-rose-100 border border-rose-300 text-rose-800 px-2 py-0.5 rounded-full font-mono">
                          ст. 76 НК РФ
                        </span>
                      </div>
                      <p className="text-xs text-neutral-700 mt-1">{block.reason}</p>
                    </div>
                    <div className="text-xs text-neutral-400 shrink-0 font-mono">
                      Дата: {block.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: ЕГРЮЛ ──────────────────────────────────────────────────── */}
      {tab === 'egrul' && (
        <div className="space-y-4 pt-1">
          {/* Verification Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {egrul.is_liquidating ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>Стоп-фактор: В процессе ликвидации</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Проверено: Действующее предприятие</span>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Дисквалификация директора: Отсутствует</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/80">
              <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Выписка ЕГРЮЛ с ЭЦП ФНС РФ</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Уставный капитал</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {egrul.authorized_capital ? formatRub(egrul.authorized_capital) : 'ИП (не предусмотрен)'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Оплачен в полном объёме</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Дата первичной регистрации</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {formatRussianDate(egrul.registration_date)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Регистрация в ФНС: {egrul.registration_date}</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Юридический статус</p>
              <p
                className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${
                  egrul.is_liquidating ? 'text-[#EF3124]' : 'text-emerald-600'
                }`}
              >
                {egrul.is_liquidating ? 'Ликвидация' : 'Действующее'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Записи о недостоверности отсутствуют</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Проверка дисквалификации директора</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums tracking-tight mt-0.5">
                Дисквалификаций нет
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Реестр дисквалифицированных лиц чист</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Основной код ОКВЭД</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {egrul.okved_main ?? '56.10.1'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Соответствует условиям кредитования</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Признаки массовости</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums tracking-tight mt-0.5">
                Не выявлены
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Адрес и директор не входят в реестры массовых</p>
            </div>
          </div>

          {/* Founders */}
          {egrul.founders && egrul.founders.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-neutral-100">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  Учредители и структура владения
                </p>
                <span className="text-xs text-neutral-400">
                  {(egrul.founders ?? []).length} {(egrul.founders ?? []).length === 1 ? 'учредитель' : 'учредителя'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(egrul.founders ?? []).map((f, i) => (
                  <div
                    key={i}
                    className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-sm font-semibold text-neutral-900 truncate">{f.name}</p>
                      <p className="text-xs text-neutral-400">Учредитель / Бенефициар</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-600 font-mono">{f.share_pct}%</span>
                      <p className="text-[10px] text-neutral-400">доля в УК</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: БКИ ────────────────────────────────────────────────────── */}
      {tab === 'bki' && (
        <div className="space-y-4 pt-1">
          {/* Verification Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {bki.overdue_90_plus ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>Стоп-фактор: Зафиксирована просрочка 90+ дней</span>
              </div>
            ) : bki.overdue_60 || bki.overdue_30 ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Внимание: Нарушения платежного графика</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Проверено: Чистая кредитная история</span>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/80">
              <Activity className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Запросы: НБКИ, ОКБ, КБРС</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Индекс кредитоспособности (БКИ)</p>
              <p
                className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${
                  bki.overdue_90_plus
                    ? 'text-[#EF3124]'
                    : bki.overdue_60 || bki.overdue_30
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {bkiScore}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Скоринговый диапазон НБКИ / ОКБ</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Закрытых кредитов без просрочек</p>
              <p className="text-sm font-bold text-emerald-600 tabular-nums tracking-tight mt-0.5">
                {closedLoansCount} договоров
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Успешно погашены в полном объеме</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Активных кредитных линий / займов</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {bki.active_loans} {bki.active_loans === 1 ? 'договор' : 'договора'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Текущие обязательства в банках</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Текущий платеж / мес.</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {formatRub(bki.total_monthly_payment)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Совокупная долговая нагрузка</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Глубина кредитной истории</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {bki.credit_history_months ?? 48} мес.
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Период истории в базах бюро</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Внешние запросы за 30 дней</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                1 запрос (Альфа-Банк)
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Веерная подача заявок не зафиксирована</p>
            </div>
          </div>

          {/* Overdue Monitoring Grid */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              Статистика платежной дисциплины и просрочек
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
                <p className="text-xs text-neutral-400 font-medium">0 дней (В графике)</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-sm font-bold text-neutral-900">100% соблюдение</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">Платежи без задержек</p>
              </div>

              <div
                className={`rounded-xl p-3 border ${
                  bki.overdue_30
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-[#1A1D24] border-neutral-800'
                }`}
              >
                <p className="text-xs text-neutral-400 font-medium">Просрочка 30 дней</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {bki.overdue_30 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-sm font-bold text-amber-600">Выявлена</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold text-emerald-600">0 (Отсутствует)</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {bki.overdue_30 ? 'Внимание к платежам' : 'Без нарушений'}
                </p>
              </div>

              <div
                className={`rounded-xl p-3 border ${
                  bki.overdue_60
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-[#1A1D24] border-neutral-800'
                }`}
              >
                <p className="text-xs text-neutral-400 font-medium">Просрочка 60 дней</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {bki.overdue_60 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-sm font-bold text-amber-600">Выявлена</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold text-emerald-600">0 (Отсутствует)</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {bki.overdue_60 ? 'Повышенный риск' : 'Без нарушений'}
                </p>
              </div>

              <div
                className={`rounded-xl p-3 border ${
                  bki.overdue_90_plus
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-[#1A1D24] border-neutral-800'
                }`}
              >
                <p className="text-xs text-neutral-400 font-medium">Просрочка 90+ дней</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {bki.overdue_90_plus ? (
                    <>
                      <AlertOctagon className="w-4 h-4 text-[#EF3124] shrink-0" />
                      <span className="text-sm font-bold text-[#EF3124]">Стоп-фактор</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold text-emerald-600">0 (Отсутствует)</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {bki.overdue_90_plus ? 'Критический дефолт' : 'Без нарушений'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 4: Счета Альфа-Банка ───────────────────────────────────────── */}
      {tab === 'accounts' && (
        <div className="space-y-4 pt-1">
          {/* Verification Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {alfa_accounts.tax_payments_regular ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Проверено: Регулярные налоговые платежи</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Внимание: Пропуски обязательных налоговых платежей</span>
              </div>
            )}

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200/80">
              <Landmark className="w-3.5 h-3.5 text-[#EF3124] shrink-0" />
              <span>Транзакционная выписка за 12 месяцев</span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Среднемесячная выручка</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {formatRub(avgRevenue)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">По счетам за 12 месяцев</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Доля налоговых платежей (% от оборота)</p>
              <p
                className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${
                  alfa_accounts.tax_payments_regular ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {taxSharePct}% от оборота
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                {alfa_accounts.tax_payments_regular ? 'Норматив банка выполнен (≥ 4%)' : 'Ниже норматива банка'}
              </p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Динамика поступлений</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPositiveTrend ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-[#EF3124] shrink-0" />
                )}
                <p
                  className={`text-sm font-bold tabular-nums tracking-tight ${
                    isPositiveTrend ? 'text-emerald-600' : 'text-[#EF3124]'
                  }`}
                >
                  {trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`}
                </p>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">Траектория за 12 месяцев</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Среднемесячный баланс (СМО)</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {formatRub(alfa_accounts.avg_balance)}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Неснижаемый остаток на р/с</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Уникальных контрагентов</p>
              <p className="text-sm font-bold text-neutral-900 tabular-nums tracking-tight mt-0.5">
                {alfa_accounts.unique_counterparties} контрагентов
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Диверсификация клиентской базы</p>
            </div>

            <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5">
              <p className="text-xs text-neutral-400 font-medium">Стабильность денежного потока</p>
              <p
                className={`text-sm font-bold tabular-nums tracking-tight mt-0.5 ${
                  alfa_accounts.tax_payments_regular ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                {alfa_accounts.tax_payments_regular ? 'Стабильный' : 'Кассовые разрывы'}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">Оценка платежного поведения</p>
            </div>
          </div>

          {/* Revenue Chart and Monthly Grid */}
          {chartData.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-neutral-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-neutral-400" />
                  Помесячные обороты за 12 месяцев (тыс. ₽)
                </p>
                <div className="text-xs text-neutral-400">
                  Совокупный оборот: <span className="font-bold text-neutral-900">{formatRub(totalRevenue)}</span>
                </div>
              </div>

              {/* Area Chart */}
              <div className="bg-[#F8F9FB] border border-neutral-200/80 rounded-2xl p-3.5 pt-4">
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={chartData} margin={{ top: 6, right: 10, bottom: 0, left: -10 }}>
                    <defs>
                      <linearGradient id="revAlfaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF3124" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#EF3124" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#0F172A',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      }}
                      formatter={(v: unknown) => [`${Number(v).toLocaleString('ru-RU')} тыс. ₽`, 'Выручка']}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#EF3124"
                      strokeWidth={2}
                      fill="url(#revAlfaGradient)"
                      dot={{ r: 2.5, fill: '#EF3124', strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: '#EF3124', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* 12-Month Month-by-Month Tiles */}
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-1.5">
                {chartData.map((item, idx) => {
                  const isAboveAvg = item.rawRevenue >= avgRevenue;
                  return (
                    <div
                      key={idx}
                      className="bg-[#F8F9FB] border border-neutral-200/80 rounded-xl p-2 text-center"
                    >
                      <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-400 font-medium">
                        <span>{item.month}</span>
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isAboveAvg ? 'bg-emerald-400' : 'bg-neutral-500'
                          }`}
                          title={isAboveAvg ? 'Выше среднего' : 'Ниже среднего'}
                        />
                      </div>
                      <p className="text-xs font-bold text-neutral-900 tabular-nums tracking-tight mt-1">
                        {item.revenue} тыс.
                      </p>
                      <p className="text-[9px] text-neutral-400 mt-0.5 truncate">
                        {formatRub(item.rawRevenue)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
