import { useState } from 'react';
import {
  Sparkles,
  Clock,
  Package,
  Factory,
  FileText,
  ArrowUp,
  Loader2,
  SlidersHorizontal,
  Check,
  CheckCircle2,
} from 'lucide-react';
import api from '../api/client';
import { formatRub, PRODUCT_LABELS } from '../utils';
import type { AiResponse, ProductType } from '../types';

const CHIPS = [
  'Нужно 8 млн на 9 мес. на закупку сырья',
  'Кассовый разрыв, нужно 2 млн на 3 месяца',
  'Покупка станка за 15 млн с рассрочкой',
  'Исполнение госконтракта — нужно пополнить оборотку',
];

interface SituationItem {
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  product: ProductType;
}

const SITUATIONS: SituationItem[] = [
  {
    title: 'Кассовый разрыв',
    desc: 'Нехватка денег до поступления оплаты от клиентов',
    icon: Clock,
    product: 'OVERDRAFT',
  },
  {
    title: 'Закупка под сезон',
    desc: 'Нужно закупить товар или сырьё для сезонного роста продаж',
    icon: Package,
    product: 'WORKING_CAPITAL_LOAN',
  },
  {
    title: 'Покупка оборудования',
    desc: 'Инвестиции в производственные мощности или автоматизацию',
    icon: Factory,
    product: 'INVESTMENT_LOAN',
  },
  {
    title: 'Исполнение контракта',
    desc: 'Финансирование госконтракта или крупного коммерческого заказа',
    icon: FileText,
    product: 'REVOLVING_LINE_VKL',
  },
];

interface Props {
  applicationId: string | null;
  onSuggestProduct?: (product: ProductType, amount?: number, term?: number) => void;
}

export function AiAdvisorWidget({ applicationId, onSuggestProduct }: Props) {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  async function sendMessage(msg: string) {
    if (!msg.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.post<AiResponse>('/ai/recommend', {
        message: msg,
        application_id: applicationId,
      });
      setResponse(data);
      if (data.product && onSuggestProduct) {
        onSuggestProduct(data.product, data.amount, data.term);
      }
    } finally {
      setLoading(false);
    }
  }

  const handleApplyToCalculator = () => {
    if (response?.product && onSuggestProduct) {
      onSuggestProduct(response.product, response.amount, response.term);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/80 p-6 shadow-xs space-y-5 alfa-card-hover">
      {/* Шапка виджета */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#EF3124] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-neutral-900 leading-snug">
            AI-Консультант Альфа-Бизнес
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Умный подбор кредитного продукта под реальную задачу компании
          </p>
        </div>
      </div>

      {/* Сетка типовых бизнес-ситуаций (4 карточки) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SITUATIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => sendMessage(`${s.title}: ${s.desc}`)}
              className="rounded-2xl border border-neutral-200/80 bg-[#F8F9FB] hover:bg-white hover:border-[#EF3124]/40 hover:shadow-xs p-3.5 flex items-start gap-3 transition-all cursor-pointer text-left group alfa-btn"
            >
              <div className="w-9 h-9 rounded-full bg-white border border-neutral-200 text-neutral-700 group-hover:text-[#EF3124] group-hover:border-red-200 flex items-center justify-center shrink-0 transition-colors">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-neutral-900 group-hover:text-[#EF3124] transition-colors">
                  {s.title}
                </p>
                <p className="text-[11px] text-neutral-500 leading-tight mt-0.5">
                  {s.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Быстрые подсказки и поле ввода */}
      <div className="space-y-3">
        {/* Чипсы быстрых промптов */}
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => sendMessage(chip)}
              className="rounded-full bg-neutral-100 hover:bg-neutral-200 px-3 py-1 text-xs text-neutral-700 transition-colors cursor-pointer alfa-btn"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Поле ввода сообщения */}
        <div className="rounded-full bg-[#F4F5F7] border border-transparent focus-within:border-neutral-300 focus-within:bg-white pl-4 pr-1.5 py-1.5 flex items-center shadow-xs transition-all">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && sendMessage(message)}
            placeholder="Опишите вашу бизнес-задачу своими словами..."
            className="text-xs text-neutral-900 placeholder:text-neutral-400 outline-none flex-1 bg-transparent"
          />
          <button
            type="button"
            onClick={() => sendMessage(message)}
            disabled={loading || !message.trim()}
            className="w-8 h-8 rounded-full bg-[#EF3124] hover:bg-[#D9261A] text-white flex items-center justify-center transition-all disabled:opacity-40 shrink-0 cursor-pointer disabled:cursor-not-allowed alfa-btn"
            aria-label="Отправить запрос"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Окно ответа AI-Консультанта */}
      {response && (
        <div className="rounded-2xl bg-[#F8F9FB] border border-neutral-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-200/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#EF3124] text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-neutral-900">
                Рекомендация Консультанта
              </span>
            </div>
            {response.source && (
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                {response.source === 'ollama' ? 'Нейросеть Альфа' : 'Экспертная система'}
              </span>
            )}
          </div>

          <p className="text-xs text-neutral-800 leading-relaxed whitespace-pre-line">
            {response.response}
          </p>

          {response.context_hint && (
            <p className="text-[11px] text-neutral-500 italic bg-white/70 rounded-xl p-2.5 border border-neutral-200/60">
              {response.context_hint}
            </p>
          )}

          {response.product && (
            <div className="rounded-2xl bg-white border border-neutral-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 text-[#EF3124] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                    Рекомендуемый продукт
                  </div>
                  <div className="text-xs font-bold text-neutral-900">
                    {PRODUCT_LABELS[response.product] || response.product}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {response.amount != null && response.amount > 0 && (
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">Сумма</div>
                    <div className="font-bold text-neutral-900 tabular-nums">
                      {formatRub(response.amount)}
                    </div>
                  </div>
                )}
                {response.term != null && response.term > 0 && (
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase font-semibold">Срок</div>
                    <div className="font-bold text-neutral-900 tabular-nums">
                      {response.term} мес.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {response.product && onSuggestProduct && (
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={handleApplyToCalculator}
                className="rounded-full bg-[#EF3124] hover:bg-[#D9261A] text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 shadow-xs transition-all cursor-pointer alfa-btn"
              >
                {applied ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Параметры применены в калькулятор</span>
                  </>
                ) : (
                  <>
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Применить параметры в калькулятор</span>
                  </>
                )}
              </button>
            </div>
          )}

          {response.suggestions && response.suggestions.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-neutral-200/60">
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Уточняющие вопросы
              </span>
              <div className="flex flex-wrap gap-1.5">
                {response.suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => sendMessage(s)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white border border-neutral-200/80 text-neutral-700 font-medium hover:border-[#EF3124]/40 hover:text-[#EF3124] hover:bg-red-50/20 transition-all cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
