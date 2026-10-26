import { useState, useEffect } from 'react';
import { Landmark, Clock, Sparkles, Check, Loader2, AlertTriangle } from 'lucide-react';
import api, { getApiErrorMessage } from '../api/client';
import type { NewsItem } from '../types';

interface Props {
  okved: string;
  applicationId: string | null;
  onProgramApplied: () => void;
  currentProgramId?: string | null;
}

const PROGRAM_LABELS: Record<string, string> = {
  SUBSIDIZED_RATE: 'Льготная ставка',
  GUARANTEE_MSP: 'Гарантия МСП',
  GRANT: 'Грант',
  TAX_BENEFIT: 'Налоговая льгота',
};

function getAgencyInfo(item: NewsItem) {
  const text = `${item.title} ${item.body}`.toLowerCase();
  if (text.includes('минпромторг')) {
    return {
      agency: 'Минпромторг РФ',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (text.includes('минтранс')) {
    return {
      agency: 'Минтранс РФ',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  if (text.includes('корпораци') || item.program_type === 'GUARANTEE_MSP') {
    return {
      agency: 'Корпорация МСП',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
    };
  }
  if (text.includes('налог') || item.program_type === 'TAX_BENEFIT') {
    return {
      agency: 'ФНС РФ',
      badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
    };
  }
  if (item.program_type === 'GRANT') {
    return {
      agency: 'Минэкономразвития / Гранты',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    agency: 'Минэкономразвития РФ',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  };
}

function getFinancialTerms(item: NewsItem) {
  let rateDisplay = 'от 7.5%';
  let rateLabel = 'годовых со скидкой государства';
  let limitAndTerm = 'до 50 млн ₽ на срок до 60 месяцев';
  let purpose = item.body || 'Оборотные средства, покупка оборудования или компенсация процентных платежей';

  if (item.program_type === 'SUBSIDIZED_RATE') {
    if (item.max_rate_pct) {
      rateDisplay = `до ${item.max_rate_pct}%`;
    } else {
      rateDisplay = 'от 7.5%';
    }
    rateLabel = 'годовых со скидкой государства';
    if (item.applicable_to_products?.includes('INVESTMENT_LOAN')) {
      limitAndTerm = 'до 100 млн ₽ на срок до 60 месяцев';
    } else {
      limitAndTerm = 'до 50 млн ₽ на срок до 60 месяцев';
    }
  } else if (item.program_type === 'GUARANTEE_MSP') {
    const pct = item.guarantee_pct
      ? item.guarantee_pct <= 1
        ? Math.round(item.guarantee_pct * 100)
        : item.guarantee_pct
      : 70;
    rateDisplay = `до ${pct}%`;
    rateLabel = 'покрытие поручительством Корпорации МСП';
    limitAndTerm = 'до 100 млн ₽ на срок до 60 месяцев';
  } else if (item.program_type === 'GRANT') {
    rateDisplay = 'до 500 тыс. ₽';
    rateLabel = 'безвозмездное прямое госфинансирование';
    limitAndTerm = 'единоразовый грант на развитие';
  } else if (item.program_type === 'TAX_BENEFIT') {
    rateDisplay = 'до 100%';
    rateLabel = 'инвестиционный налоговый вычет';
    limitAndTerm = 'на весь срок амортизации';
  }

  return { rateDisplay, rateLabel, limitAndTerm, purpose };
}

export function NewsFeed({ okved, applicationId, onProgramApplied, currentProgramId }: Props) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(okved));
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const [prevOkved, setPrevOkved] = useState(okved);
  if (prevOkved !== okved) {
    setPrevOkved(okved);
    setLoading(Boolean(okved));
  }

  useEffect(() => {
    if (!okved) return;
    const prefix = okved.split('.')[0];
    api.get<{ items: NewsItem[] }>(`/news?okved_prefix=${prefix}`)
      .then(({ data }) => setItems(data.items ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [okved]);

  async function applyProgram(newsItemId: string) {
    if (!applicationId) return;
    setApplying(newsItemId);
    setError('');
    try {
      await api.post(`/applications/${applicationId}/apply-program`, { news_item_id: newsItemId });
      setApplied(newsItemId);
      onProgramApplied();
    } catch (e) {
      setError(getApiErrorMessage(e, 'Не удалось применить программу господдержки.'));
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5 alfa-card-hover">
      {/* Шапка блока */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-[#EF3124]">
              <Landmark className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 tracking-tight">
              Государственная поддержка и субсидии МСП
            </h3>
          </div>
          <p className="text-xs text-neutral-500 max-w-2xl leading-relaxed">
            Программы льготного финансирования, субсидируемые Минэкономразвития и Корпорацией МСП для вашего сектора бизнеса
          </p>
        </div>

        {okved && (
          <div className="shrink-0 self-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-xs text-neutral-600 font-medium">
              Подобрано по ОКВЭД: <span className="font-bold text-neutral-800">{okved}</span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Состояние загрузки (скелетоны) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-neutral-200/80 bg-[#F8F9FB] p-5 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-2">
                <div className="h-5 w-28 bg-neutral-200/80 rounded-full" />
                <div className="h-5 w-20 bg-neutral-200/80 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-neutral-200/80 rounded" />
              <div className="space-y-2 pt-3 border-t border-neutral-200/60">
                <div className="h-7 w-32 bg-neutral-200/80 rounded" />
                <div className="h-4 w-48 bg-neutral-200/80 rounded" />
                <div className="h-8 w-full bg-neutral-200/80 rounded" />
              </div>
              <div className="h-10 w-full bg-neutral-200/80 rounded-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        /* Состояние пустого списка */
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-[#F8F9FB] p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 mx-auto flex items-center justify-center text-neutral-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-neutral-800">
              Программы для вашего сектора актуализируются...
            </p>
            <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
              Автоматический финансовый радар ведет поиск субсидированных ставок Минэкономразвития для кода ОКВЭД {okved || 'вашей компании'}.
            </p>
          </div>
        </div>
      ) : (
        /* Сетка карточек программ господдержки */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const isApplied = applied === item.id || currentProgramId === item.id;
            const isApplying = applying === item.id;
            const agencyInfo = getAgencyInfo(item);
            const terms = getFinancialTerms(item);
            const categoryLabel = PROGRAM_LABELS[item.program_type] ?? 'Субсидия';

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-[#F8F9FB] p-5 flex flex-col justify-between transition-all space-y-4 alfa-card-hover ${
                  isApplied
                    ? 'border-emerald-300 bg-white ring-1 ring-emerald-200/60 shadow-xs'
                    : 'border-neutral-200/80 hover:bg-white hover:border-emerald-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Верхняя строка: бейдж ведомства + категория */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${agencyInfo.badgeClass}`}
                    >
                      {agencyInfo.agency}
                    </span>
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-white text-neutral-600 border border-neutral-200">
                      {categoryLabel}
                    </span>
                  </div>

                  {/* Название программы */}
                  <h4 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2" title={item.title}>
                    {item.title}
                  </h4>

                  {/* Финансовые условия (ключевой блок) */}
                  <div className="space-y-2 pt-3 border-t border-neutral-200/60">
                    <div>
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl font-black text-neutral-900 tabular-nums">
                          {terms.rateDisplay}
                        </span>
                        <span className="text-xs text-neutral-500 font-medium">
                          {terms.rateLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-neutral-700">
                        <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>{terms.limitAndTerm}</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
                      {terms.purpose}
                    </p>
                  </div>
                </div>

                {/* Кнопка действия */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => applyProgram(item.id)}
                    disabled={isApplying || isApplied || !applicationId}
                    className={`w-full py-2.5 px-4 rounded-full font-bold text-xs transition-colors flex items-center justify-center gap-2 alfa-btn ${
                      isApplied
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default'
                        : isApplying
                        ? 'bg-neutral-800 text-white cursor-wait'
                        : !applicationId
                        ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                        : 'bg-neutral-900 hover:bg-[#EF3124] text-white shadow-xs'
                    }`}
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Применение субсидии...</span>
                      </>
                    ) : isApplied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Субсидия применена к заявке</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Применить субсидию к заявке</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
