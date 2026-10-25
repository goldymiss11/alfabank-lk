import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap,
  Shield,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Lock,
  Loader2,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { CreditOffer, Application } from '../types';
import { PRODUCT_LABELS } from '../utils';
import api from '../api/client';

interface Props {
  offers: CreditOffer[];
  application: Application;
  onOfferAccepted: () => void;
  isSplit?: boolean;
}

interface OfferTheme {
  title: string;
  subtitle: string;
  badgeText: string;
  badgeIcon: React.ComponentType<{ className?: string }>;
  badgeCls: string;
  isRecommended: boolean;
}

const OFFER_THEMES: OfferTheme[] = [
  {
    title: 'Экспресс-одобрение без залога',
    subtitle: 'Одобренная сумма без обеспечения',
    badgeText: 'Без обеспечения',
    badgeIcon: Zap,
    badgeCls: 'bg-teal-50 text-teal-700 border border-teal-200/80',
    isRecommended: true,
  },
  {
    title: 'Полный лимит с гарантией МСП',
    subtitle: 'Под залог или поручительство Корпорации МСП',
    badgeText: 'Максимальный лимит',
    badgeIcon: Shield,
    badgeCls: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    isRecommended: false,
  },
  {
    title: 'Кредитная линия',
    subtitle: 'Гибкие условия и комфортный график',
    badgeText: 'Гибкий график',
    badgeIcon: TrendingUp,
    badgeCls: 'bg-purple-50 text-purple-700 border border-purple-200/80',
    isRecommended: false,
  },
];

interface SignModalProps {
  offer: CreditOffer;
  application: Application;
  onClose: () => void;
  onSigned: () => void;
}

function SignModal({ offer, application, onClose, onSigned }: SignModalProps) {
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'preview' | 'otp' | 'funded'>('preview');
  const [signing, setSigning] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  useEffect(() => {
    return () => {
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
      }
    };
  }, []);

  const handleFinish = () => {
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current);
    }
    onSigned();
    onClose();
  };

  async function acceptOffer() {
    setSigning(true);
    try {
      await api.post(`/applications/${application.id}/transition`, {
        trigger: 'ACCEPT_OFFER',
        actor_type: 'CLIENT_OWNER',
        payload: { selected_offer_variant: offer.variant_index },
      });
      setStep('otp');
    } catch (e) {
      console.error(e);
    } finally {
      setSigning(false);
    }
  }

  async function sign() {
    if (otp.length < 4) return;
    setSigning(true);
    try {
      await api.post(`/applications/${application.id}/sign`, { otp_code: otp });
      setStep('funded');
      finishTimeoutRef.current = setTimeout(() => {
        handleFinish();
      }, 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setSigning(false);
    }
  }

  const applicationIdShort = application.id ? application.id.slice(0, 8).toUpperCase() : '001';

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-neutral-200/80 space-y-6 relative animate-alfa-scale-in my-auto max-h-[90vh] overflow-y-auto">
        {/* Кнопка закрытия в верхнем правом углу */}
        <button
          type="button"
          onClick={step === 'funded' ? handleFinish : onClose}
          className="absolute top-5 right-5 sm:top-6 sm:right-6 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center transition-colors z-10 alfa-btn"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Шаг 1: preview — Предпросмотр условий договора */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="pr-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#EF3124] text-white flex flex-col items-center justify-center font-black shadow-xs shrink-0 select-none">
                  <span className="text-xl leading-none font-black tracking-tighter">А</span>
                  <span className="w-3.5 h-[2px] bg-white rounded-full mt-0.5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight leading-snug">
                    Индивидуальные условия договора кредитования
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Электронная заявка № {applicationIdShort}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8F9FB] border border-neutral-200/70 p-4 space-y-2.5 text-xs">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  Одобренная сумма
                </p>
                <p className="text-2xl sm:text-3xl font-black text-neutral-900 tabular-nums mt-0.5">
                  {offer.approved_amount.toLocaleString('ru-RU')} ₽
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-200/60">
                <div>
                  <p className="text-neutral-500">Срок финансирования</p>
                  <p className="font-bold text-neutral-900 tabular-nums text-sm mt-0.5">
                    {offer.term_months} мес.
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Ставка годовых</p>
                  <p className="font-bold text-neutral-900 tabular-nums text-sm mt-0.5">
                    {offer.annual_rate_pct}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-neutral-200/60">
                <div>
                  <p className="text-neutral-500">Ежемесячный платёж</p>
                  <p className="font-bold text-neutral-900 tabular-nums text-sm mt-0.5">
                    {Math.round(offer.monthly_payment).toLocaleString('ru-RU')} ₽
                  </p>
                </div>
                <div>
                  <p className="text-neutral-500">Обеспечение</p>
                  <p className="font-bold text-neutral-900 text-xs mt-0.5 leading-tight">
                    {offer.collateral_required
                      ? (offer.collateral_description || 'Зонтичное поручительство Корпорации МСП')
                      : 'Не требуется'}
                  </p>
                </div>
              </div>

              <div className="pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-neutral-500">
                <span>Продукт:</span>
                <span className="font-semibold text-neutral-800 text-right truncate">
                  {PRODUCT_LABELS[offer.product_type] ?? offer.product_type}
                </span>
              </div>

              <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-neutral-500">
                <span>Заёмщик:</span>
                <span className="font-semibold text-neutral-800 text-right truncate max-w-[240px]">
                  {application.company?.name ?? '—'} (ИНН {application.company?.inn ?? '—'})
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-neutral-50 border border-neutral-200/70 p-3.5 flex items-center gap-3 text-xs text-neutral-600">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="leading-relaxed">
                Подписание простой электронной подписью в соответствии с 63-ФЗ
              </span>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={acceptOffer}
                disabled={signing}
                className="w-full bg-[#EF3124] hover:bg-[#D9261A] text-white py-3.5 rounded-full font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 alfa-btn disabled:opacity-50"
              >
                {signing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Подготовка договора...</span>
                  </>
                ) : (
                  <>
                    <span>Перейти к подписанию по СМС</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Шаг 2: otp — Ввод СМС-кода OTP */}
        {step === 'otp' && (
          <div className="space-y-6">
            <div className="text-center space-y-2 pt-2 pr-6 pl-6">
              <div className="w-12 h-12 bg-red-50 text-[#EF3124] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
                Подтверждение операции
              </h3>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Мы отправили 4-значный СМС-код на номер руководителя компании
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  autoFocus
                  className="w-48 mx-auto text-center font-mono text-3xl tracking-[0.5em] font-black py-3 px-4 bg-[#F2F3F5] rounded-2xl border border-transparent focus:border-[#EF3124] focus:bg-white outline-none transition-all placeholder:text-neutral-400 placeholder:tracking-widest"
                />
              </div>

              <div className="text-center space-y-1.5">
                {countdown > 0 ? (
                  <p className="text-xs text-neutral-400">
                    Отправить код повторно через {countdown} сек
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCountdown(45)}
                    className="text-xs text-[#EF3124] hover:underline font-semibold transition-colors alfa-btn"
                  >
                    Отправить код повторно
                  </button>
                )}
                <p className="text-[11px] text-neutral-400">
                  Демо-код для проверки: <span className="font-mono font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-full">1234</span>
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={sign}
                disabled={otp.length < 4 || signing}
                className="w-full bg-[#EF3124] hover:bg-[#D9261A] text-white py-3.5 rounded-full font-bold text-sm shadow-sm transition-all alfa-btn disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {signing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Подтверждение и получение финансирования...</span>
                  </>
                ) : (
                  <span>Подтвердить и получить финансирование</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('preview')}
                className="w-full text-center text-xs text-neutral-500 hover:text-neutral-800 font-semibold py-1 transition-colors alfa-btn"
              >
                Вернуться к условиям договора
              </button>
            </div>
          </div>
        )}

        {/* Шаг 3: funded — Успешное финансирование */}
        {step === 'funded' && (
          <div className="text-center space-y-6 py-2">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                Договор подписан! Средства зачислены
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 max-w-sm mx-auto leading-relaxed">
                Деньги в размере <span className="font-bold text-neutral-900 tabular-nums">{offer.approved_amount.toLocaleString('ru-RU')} ₽</span> уже доступны на вашем расчётном счёте в Альфа-Банке
              </p>
            </div>

            <div className="rounded-2xl bg-[#F8F9FB] border border-neutral-200/70 p-4 space-y-2.5 text-xs text-left">
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Кредитная линия:</span>
                <span className="font-mono font-bold text-neutral-900">№ КД-{applicationIdShort}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Расчётный счёт зачисления:</span>
                <span className="font-mono font-bold text-neutral-900">4070281090100004402</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500">Статус транзакции:</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Исполнено банком
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="w-full bg-[#EF3124] hover:bg-[#D9261A] text-white py-3.5 rounded-full font-bold text-sm shadow-sm transition-all alfa-btn"
              >
                Завершить и перейти в кабинет
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export function CounterOffersMatrix({ offers, application, onOfferAccepted, isSplit }: Props) {
  const [selected, setSelected] = useState<CreditOffer | null>(null);
  const [activeVariant, setActiveVariant] = useState<number>(offers[0]?.variant_index ?? 1);

  if (!offers.length) return null;

  return (
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
            Решение кредитного конвейера: варианты финансирования
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Банк рассчитал доступные условия с учётом оборотов и кредитной истории вашей компании
          </p>
        </div>

        <div className={`grid gap-4 mt-4 ${isSplit ? 'grid-cols-1 2xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-3'}`}>
          {offers.map((offer, idx) => {
            const theme = OFFER_THEMES[idx % OFFER_THEMES.length];
            const BadgeIcon = theme.badgeIcon;
            const isSelected = activeVariant === offer.variant_index;

            return (
              <div
                key={offer.variant_index}
                onClick={() => setActiveVariant(offer.variant_index)}
                className={`rounded-3xl border p-6 flex flex-col justify-between transition-all cursor-pointer bg-white alfa-card-hover ${
                  isSelected
                    ? 'border-neutral-900 ring-2 ring-neutral-900/10 shadow-sm'
                    : 'border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5 ${theme.badgeCls}`}
                    >
                      <BadgeIcon className="w-3.5 h-3.5" />
                      <span>{theme.badgeText}</span>
                    </span>
                    {theme.isRecommended && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#EF3124] bg-red-50 border border-red-200/60 rounded-full px-2.5 py-0.5">
                        Выбор банка
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <h4 className="text-base font-bold text-neutral-900 tracking-tight">
                      {theme.title}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 min-h-[32px] leading-relaxed">
                      {offer.description || theme.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      Сумма одобрения
                    </p>
                    <div className="text-2xl font-black text-neutral-900 tabular-nums mt-0.5">
                      {offer.approved_amount.toLocaleString('ru-RU')} ₽
                    </div>
                  </div>

                  <div className="space-y-2.5 my-4 text-xs divide-y divide-neutral-100">
                    <div className="flex items-center justify-between pt-2.5 first:pt-0">
                      <span className="text-neutral-500">Срок</span>
                      <span className="font-bold text-neutral-900 tabular-nums">
                        {offer.term_months} мес.
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2.5">
                      <span className="text-neutral-500">Ставка</span>
                      <span className="font-bold text-neutral-900 tabular-nums">
                        {offer.annual_rate_pct}% годовых
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2.5">
                      <span className="text-neutral-500">Ежемесячный платёж</span>
                      <span className="font-bold text-neutral-900 tabular-nums">
                        {Math.round(offer.monthly_payment).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                    <div className="flex items-start justify-between pt-2.5 gap-2">
                      <span className="text-neutral-500 shrink-0">Требуемое обеспечение</span>
                      <span className="font-bold text-neutral-900 text-right leading-tight">
                        {offer.collateral_required
                          ? (offer.collateral_description || 'Зонтичное поручительство Корпорации МСП')
                          : 'Не требуется'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveVariant(offer.variant_index);
                      setSelected(offer);
                    }}
                    className={
                      theme.isRecommended
                        ? 'w-full bg-[#EF3124] hover:bg-[#D9261A] text-white py-3 rounded-full font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 alfa-btn'
                        : 'w-full bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 py-3 rounded-full font-bold text-xs transition-all flex items-center justify-center gap-2 alfa-btn'
                    }
                  >
                    <span>Выбрать это предложение</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <SignModal
          offer={selected}
          application={application}
          onClose={() => setSelected(null)}
          onSigned={onOfferAccepted}
        />
      )}
    </>
  );
}
