import { useState, useMemo } from 'react';
import type { RehabilitationPlan } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  Check,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Sparkles,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface Props {
  plan: RehabilitationPlan;
  stopFactors: string[];
}

const STOP_LABELS: Record<string, { title: string; action: string; days: number }> = {
  TAX_BLOCK: {
    title: 'Налоговая блокировка счёта ФНС',
    action: 'Погасите налоговую задолженность и снимите блокировку',
    days: 14,
  },
  OVERDUE_90_PLUS: {
    title: 'Просрочка 90+ дней в кредитной истории (БКИ)',
    action: 'Погасите просрочку — дождитесь обновления данных в БКИ',
    days: 30,
  },
  LIQUIDATING: {
    title: 'Компания в стадии ликвидации или банкротства',
    action: 'Отмените процедуру и получите актуальную выписку ЕГРЮЛ',
    days: 30,
  },
  TOO_YOUNG: {
    title: 'Возраст бизнеса менее 3 месяцев',
    action: 'Накопите оборотную историю по расчётному счёту',
    days: 60,
  },
  LOW_REVENUE: {
    title: 'Недостаточный объём подтверждённых оборотов',
    action: 'Увеличьте объём операций через р/с Альфа-Банка',
    days: 45,
  },
};

function getStopFactorTitle(sf: string): string {
  if (STOP_LABELS[sf]) return STOP_LABELS[sf].title;
  const lower = sf.toLowerCase();
  if (lower.includes('налог') || lower.includes('фнс')) return 'Налоговая блокировка счёта ФНС';
  if (lower.includes('просроч') || lower.includes('бки')) return 'Просрочка 90+ дней в кредитной истории (БКИ)';
  if (lower.includes('ликвид') || lower.includes('банкрот')) return 'Компания в процессе ликвидации или банкротства';
  if (lower.includes('возраст') || lower.includes('месяц')) return 'Возраст бизнеса менее 3 месяцев';
  if (lower.includes('оборот') || lower.includes('выручк')) return 'Недостаточный объём подтверждённых оборотов';
  if (lower.includes('dti') || lower.includes('нагрузк')) return 'Высокая долговая нагрузка (DTI)';
  return sf;
}

interface TimelineStage {
  id: string;
  dayRange: string;
  title: string;
  action: string;
  responsible: string;
  scoreBoost: number;
  scoreBoostLabel: string;
}

export function RejectionPlan({ plan, stopFactors }: Props) {
  const days = plan?.duration_days ?? plan?.total_days ?? 60;
  const [trackerActive, setTrackerActive] = useState(false);

  // Нормализованный список стоп-факторов
  const activeStopFactors = useMemo(() => {
    if (stopFactors && stopFactors.length > 0) return stopFactors;
    if (plan?.rejection_reasons && plan.rejection_reasons.length > 0) return plan.rejection_reasons;
    return ['TAX_BLOCK']; // fallback для наглядности маршрута санации
  }, [stopFactors, plan]);

  // Формируем этапы дорожной карты
  const stages: TimelineStage[] = useMemo(() => {
    const rawSteps =
      (plan?.steps && plan.steps.length > 0)
        ? plan.steps
        : (plan?.action_items && plan.action_items.length > 0)
        ? plan.action_items
        : null;

    if (rawSteps && rawSteps.length > 0) {
      let cumulativeDay = 0;
      const boostShare = Math.round(73 / rawSteps.length);

      return rawSteps.map((step, idx) => {
        const startDay = cumulativeDay + 1;
        const endDay = Math.max(step.deadline_days, startDay + 5);
        cumulativeDay = endDay;

        const actionText = step.action || '';
        const lower = actionText.toLowerCase();

        let title = 'Рекомендованное действие';
        let responsible = 'Руководитель';
        if (lower.includes('налог') || lower.includes('фнс') || lower.includes('справк')) {
          title = 'Погашение задолженности по налогам и сборам';
          responsible = 'Главный бухгалтер';
        } else if (lower.includes('эквайринг') || lower.includes('оборот') || lower.includes('счёт')) {
          title = 'Перевод 50% торгового эквайринга в Альфа-Банк';
          responsible = 'Руководитель';
        } else if (lower.includes('бки') || lower.includes('просроч')) {
          title = 'Урегулирование просрочки и обновление в БКИ';
          responsible = 'Руководитель';
        } else if (idx === rawSteps.length - 1) {
          title = 'Автоматический пересчёт скоринга и открытие лимита';
          responsible = 'Альфа-Банк (автоматически)';
        }

        const boost = idx === rawSteps.length - 1 ? 73 - boostShare * (rawSteps.length - 1) : boostShare;

        return {
          id: `step-${idx}`,
          dayRange: `День ${startDay}–${endDay}`,
          title,
          action: actionText,
          responsible,
          scoreBoost: boost,
          scoreBoostLabel: `+${boost}% к скорингу`,
        };
      });
    }

    // Эталонная дорожная карта на 60 дней по референсам Альфа-Банка
    return [
      {
        id: 'stage-1',
        dayRange: 'День 1–15',
        title: 'Погашение задолженности по налогам и сборам',
        action:
          'Сформировать платёжные поручения по ЕНС, погасить задолженность перед ФНС и направить электронное заявление об отзыве приостановлений по счетам.',
        responsible: 'Главный бухгалтер',
        scoreBoost: 25,
        scoreBoostLabel: '+25% к скорингу',
      },
      {
        id: 'stage-2',
        dayRange: 'День 16–45',
        title: 'Перевод 50% торгового эквайринга в Альфа-Банк',
        action:
          'Подключить торговый или интернет-эквайринг Альфа-Банка для формирования устойчивой истории подтверждённых оборотов по расчётному счёту.',
        responsible: 'Руководитель',
        scoreBoost: 30,
        scoreBoostLabel: '+30% к скорингу',
      },
      {
        id: 'stage-3',
        dayRange: 'День 46–60',
        title: 'Автоматический пересчёт скоринга и открытие лимита',
        action:
          'Система Альфа-Банка автоматически обновит данные из ФНС и БКИ, пересчитает скоринг до целевого рейтинга и активирует кредитное предложение без повторного сбора документов.',
        responsible: 'Альфа-Банк (автоматически)',
        scoreBoost: 18,
        scoreBoostLabel: '+18% к скорингу',
      },
    ];
  }, [plan]);

  // Интерактивное состояние выполнения чекбоксов
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Расчёт динамического прироста вероятности одобрения (от 15% до 88%)
  const completedCount = stages.filter((s) => completedSteps[s.id]).length;
  const totalStages = stages.length;

  const currentProbability = useMemo(() => {
    const base = 15;
    const gained = stages.reduce((acc, stage) => {
      return acc + (completedSteps[stage.id] ? stage.scoreBoost : 0);
    }, 0);
    return Math.min(88, base + gained);
  }, [stages, completedSteps]);

  const progressPercent = totalStages > 0 ? Math.round((completedCount / totalStages) * 100) : 0;

  return (
    <div className="rounded-3xl bg-white border border-rose-200/80 p-6 shadow-xs space-y-5 alfa-card-hover">
      {/* 1. Верхний информационный баннер */}
      <div className="rounded-2xl bg-rose-50/70 border border-rose-200/80 p-5 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-white/80 border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-[#EF3124]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
            План финансового оздоровления компании на {days} дней
          </h3>
          <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
            Банк выявил временные стоп-факторы. Выполните рекомендованные действия, чтобы мы могли
            автоматически пересмотреть заявку и одобрить лимит.
          </p>
        </div>
      </div>

      {/* 2. Блок выявленных ограничений (Стоп-факторы) */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-3.5 rounded-full bg-[#EF3124]" />
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
            Выявленные факторы риска, повлиявшие на решение
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {activeStopFactors.map((sf, idx) => (
            <div
              key={`${sf}-${idx}`}
              className="bg-rose-100/50 text-rose-800 border border-rose-200 rounded-2xl p-3.5 text-xs flex items-center gap-2.5 font-medium shadow-2xs"
            >
              <AlertTriangle className="w-4 h-4 text-[#EF3124] shrink-0" />
              <span className="truncate">{getStopFactorTitle(sf)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Интерактивная дорожная карта на 60 дней (Timeline) */}
      <div className="space-y-3.5 pt-2 border-t border-neutral-100">
        {/* Шапка дорожной карты */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F9FB] rounded-2xl p-4 border border-neutral-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white border border-neutral-200 flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4 text-neutral-700" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">
                Срок программы: {days} дней
              </p>
              <p className="text-[11px] text-neutral-500">
                Выполнено {completedCount} из {totalStages} этапов ({progressPercent}%)
              </p>
            </div>
          </div>

          {/* Динамический индикатор роста шансов */}
          <div className="flex items-center gap-2.5 bg-white border border-neutral-200/90 rounded-2xl px-3.5 py-2 shadow-2xs">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="text-[10px] font-semibold text-neutral-500 block leading-tight">
                Шанс одобрения
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-400 line-through tabular-nums">15%</span>
                <ArrowRight className="w-3 h-3 text-neutral-400" />
                <span className="text-xs font-black text-emerald-700 tabular-nums">
                  {currentProbability}%
                </span>
                <span className="text-[10px] text-neutral-500 font-medium tabular-nums">
                  (цель: 88%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Прогресс-бар выполнения дорожной карты */}
        <div className="space-y-1 px-1">
          <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-emerald-500 to-emerald-600 transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(6, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Список этапов дорожной карты */}
        <div className="space-y-2.5">
          {stages.map((stage) => {
            const isCompleted = !!completedSteps[stage.id];

            return (
              <div
                key={stage.id}
                className={`rounded-2xl border p-4 flex items-start gap-3.5 transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/30 border-emerald-300/80 shadow-2xs'
                    : 'bg-[#F8F9FB] border-neutral-200/80 hover:bg-white hover:border-neutral-300'
                }`}
              >
                {/* Слева: Чекбокс и бейдж срока */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleStep(stage.id)}
                    aria-label={`Отметить этап ${stage.title}`}
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all cursor-pointer alfa-btn ${
                      isCompleted
                        ? 'bg-[#2FA84F] border-[#2FA84F] text-white shadow-xs'
                        : 'bg-white border-neutral-300 hover:border-neutral-400 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                  <span className="text-[10px] font-bold text-neutral-600 bg-neutral-200/70 rounded-full px-2 py-0.5 whitespace-nowrap">
                    {stage.dayRange}
                  </span>
                </div>

                {/* По центру: Название, описание и ответственный */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-xs font-bold ${
                        isCompleted ? 'text-neutral-700 line-through' : 'text-neutral-900'
                      }`}
                    >
                      {stage.title}
                    </p>
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                        Выполнено
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {stage.action}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
                    <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Ответственный: <strong className="text-neutral-700 font-semibold">{stage.responsible}</strong></span>
                  </div>
                </div>

                {/* Справа: Прирост вероятности */}
                <div className="shrink-0">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap inline-flex items-center gap-1 shadow-2xs">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    {stage.scoreBoostLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Прогноз повторного рассмотрения и CTA-кнопка */}
      <div className="rounded-3xl bg-neutral-900 text-white p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white">
              После выполнения всех шагов:
            </span>
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              Grade B
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
              88% вероятность
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-relaxed max-w-xl">
            Вероятность автоматического одобрения вырастет до 85%+ (Grade B) с предодобренным овердрафтом
            без повторного сбора документов.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setTrackerActive((prev) => !prev)}
          className={`shrink-0 py-3 px-6 rounded-full font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer alfa-btn ${
            trackerActive
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-[#EF3124] hover:bg-[#D9261A] text-white'
          }`}
        >
          {trackerActive ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Трекер активен · День 1 из {days}</span>
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 text-white" />
              <span>Принять план и запустить трекер</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
