import { useEffect, useState } from 'react';
import { Building2, ShieldCheck, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { DemoGodBar } from './components/DemoGodBar';
import { ClientCabinetView } from './components/ClientCabinetView';
import { BankConveyorView } from './components/BankConveyorView';
import { useAppStore } from './store/appStore';
import api, { getApiErrorMessage } from './api/client';

function App() {
  const [mobileSplitTab, setMobileSplitTab] = useState<'client' | 'bank' | 'both'>('client');
  const {
    application,
    isLoading,
    viewMode,
    activePresetId,
    setPresets,
    setActivePresetId,
    setApplication,
    setApplicationId,
    setIsLoading,
    setIsDelegated,
    resetTransientState,
    errorMessage,
    setErrorMessage,
    clearError,
  } = useAppStore();

  // Initial load
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // Load presets
        const { data: presetsData } = await api.get('/presets');
        setPresets(presetsData.presets ?? []);
        if (presetsData.active_preset_id) {
          setActivePresetId(presetsData.active_preset_id);
        }

        // Load default preset application
        const { data: loaded } = await api.post(`/presets/${presetsData.active_preset_id ?? 'coffee_shop_ip'}/load`);
        if (loaded.application_id) {
          resetTransientState();
          setApplicationId(loaded.application_id);
          const { data: app } = await api.get(`/applications/${loaded.application_id}`);
          setApplication(app);
          setIsDelegated(Boolean(app.delegated_to_accountant));
        }
      } catch (e) {
        console.error('Init failed', e);
        setErrorMessage(getApiErrorMessage(e, 'Не удалось подключиться к кредитному конвейеру.'));
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [
    setActivePresetId,
    setApplication,
    setApplicationId,
    setErrorMessage,
    setIsDelegated,
    setIsLoading,
    setPresets,
    resetTransientState,
  ]);

  async function refresh() {
    const { applicationId } = useAppStore.getState();
    if (!applicationId) return;
    try {
      const { data: app } = await api.get(`/applications/${applicationId}`);
      setApplication(app);
      setIsDelegated(Boolean(app.delegated_to_accountant));
    } catch (e) {
      console.error('Refresh failed', e);
      setErrorMessage(getApiErrorMessage(e, 'Не удалось обновить заявку.'));
    }
  }

  return (
    <div className="bg-[#F4F5F7] min-h-screen text-[#0B0C0E] flex flex-col font-sans antialiased">
      {/* Fixed top bar */}
      <DemoGodBar />

      {/* Main content area */}
      <main className="max-w-[1680px] w-full mx-auto px-3 sm:px-6 py-3 sm:py-5 flex-1">
        {errorMessage && (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{errorMessage}</p>
            <button type="button" onClick={clearError} className="rounded-lg p-1 hover:bg-rose-100" aria-label="Закрыть сообщение об ошибке">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <section aria-label="Проверка проекта за 3 минуты" className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#EF3124]">Стенд демонстрации · синтетические данные</p>
              <h1 className="mt-1 text-lg font-bold text-neutral-900">Проверьте кредитный путь за 3 минуты</h1>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-neutral-600">
              Выберите сценарий в панели: Fast-track показывает сквозной путь до подписания и отдельной выдачи; «Контр-оффер» сравнивает условия; «Андеррайтинг» — запрос документа и повторный скоринг. Панель режимов — только инструмент этого демонстрационного стенда.
            </p>
          </div>
          <ol className="mt-3 grid gap-2 text-xs text-neutral-700 sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-xl bg-neutral-50 p-3"><strong>1. Потребность</strong><span className="mt-1 block text-neutral-500">Калькулятор сохраняет выбранные параметры черновика.</span></li>
            <li className="rounded-xl bg-neutral-50 p-3"><strong>2. Решение</strong><span className="mt-1 block text-neutral-500">Скоринг раскрывает факторы и ограничители.</span></li>
            <li className="rounded-xl bg-neutral-50 p-3"><strong>3. Условия</strong><span className="mt-1 block text-neutral-500">Сравните сумму, платеж, ставку и обеспечение.</span></li>
            <li className="rounded-xl bg-neutral-50 p-3"><strong>4. Исполнение</strong><span className="mt-1 block text-neutral-500">Подписание OTP и зачисление — отдельные шаги.</span></li>
          </ol>
        </section>
        {/* Loading overlay */}
        {isLoading && !application && (
          <div className="flex items-center justify-center min-h-[400px] animate-alfa-in">
            <div className="text-center space-y-3">
              <div className="w-9 h-9 border-2 border-neutral-200 border-t-[#EF3124] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-neutral-500">Синхронизация конвейера...</p>
            </div>
          </div>
        )}

        {/* API Unavailable fallback */}
        {!application && !isLoading && (
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center space-y-4 my-8 max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 bg-rose-50 text-[#EF3124] rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Кредитный конвейер недоступен</h2>
              <p className="text-xs text-neutral-500 mt-1">
                {errorMessage || 'Не удалось установить соединение с сервером конвейера. Убедитесь, что бэкенд запущен.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-[#EF3124] hover:bg-[#D9261A] text-white py-2.5 px-6 rounded-full font-bold text-xs transition-colors inline-flex items-center gap-2 alfa-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Повторить подключение</span>
            </button>
          </div>
        )}

        {application && (
          <div key={`${viewMode}-${application.id || activePresetId}`} className="animate-alfa-in">
            {/* Split Screen: 6+6 columns */}
            {viewMode === 'split' && (
              <div>
                {/* Mobile Tab Switcher for Split View (< lg) */}
                <div className="lg:hidden mb-3 flex items-center justify-center">
                  <div className="inline-flex rounded-full bg-white p-1 border border-neutral-200/80 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setMobileSplitTab('client')}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all alfa-btn ${
                        mobileSplitTab === 'client'
                          ? 'bg-[#EF3124] text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Клиент</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSplitTab('bank')}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all alfa-btn ${
                        mobileSplitTab === 'bank'
                          ? 'bg-[#EF3124] text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Банк</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSplitTab('both')}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all alfa-btn ${
                        mobileSplitTab === 'both'
                          ? 'bg-[#EF3124] text-white shadow-xs'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      <span>Оба экрана</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 min-h-0 relative">
                  {/* Rounded thin divider between columns for desktop */}
                  <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-neutral-200/80 rounded-full pointer-events-none" />

                  {/* Left: Client Cabinet */}
                  <div className={`space-y-0 lg:overflow-y-auto lg:max-h-[calc(100vh-100px)] pr-0 lg:pr-3 ${mobileSplitTab === 'bank' ? 'hidden lg:block' : 'block'}`}>
                    <div className="sticky top-0 z-10 bg-[#F4F5F7] py-1.5 mb-2.5">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200/80 rounded-full shadow-xs">
                        <Building2 className="w-4 h-4 text-[#EF3124]" />
                        <span className="text-xs font-bold text-neutral-800 tracking-tight">Кабинет предпринимателя</span>
                      </div>
                    </div>
                    <ClientCabinetView application={application} onRefresh={refresh} isSplit={true} />
                  </div>

                  {/* Right: Bank Conveyor */}
                  <div className={`lg:overflow-y-auto lg:max-h-[calc(100vh-100px)] pl-0 lg:pl-3 ${mobileSplitTab === 'client' ? 'hidden lg:block' : 'block'}`}>
                    <div className="sticky top-0 z-10 bg-[#F4F5F7] py-1.5 mb-2.5">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200/80 rounded-full shadow-xs">
                        <ShieldCheck className="w-4 h-4 text-[#EF3124]" />
                        <span className="text-xs font-bold text-neutral-800 tracking-tight">Кредитный конвейер — Внутри Банка</span>
                      </div>
                    </div>
                    <BankConveyorView application={application} onRefresh={refresh} isSplit={true} />
                  </div>
                </div>
              </div>
            )}

            {/* Client only */}
            {viewMode === 'client' && (
              <div className="max-w-5xl mx-auto py-2">
                <ClientCabinetView application={application} onRefresh={refresh} isSplit={false} />
              </div>
            )}

            {/* Bank only */}
            {viewMode === 'bank' && (
              <div className="max-w-5xl mx-auto py-2">
                <BankConveyorView application={application} onRefresh={refresh} isSplit={false} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200/60 py-3 px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500 text-center sm:text-left">
        <span className="font-medium">АО «АЛЬФА-БАНК» · Кредитный конвейер МСБ</span>
        {application?.id && (
          <span className="font-mono text-[11px] bg-neutral-100 px-2.5 py-1 rounded-lg text-neutral-600 tabular-nums">
            {application.id}
          </span>
        )}
      </footer>
    </div>
  );
}

export default App;
