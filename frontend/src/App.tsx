import { useEffect } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { DemoGodBar } from './components/DemoGodBar';
import { ClientCabinetView } from './components/ClientCabinetView';
import { BankConveyorView } from './components/BankConveyorView';
import { useAppStore } from './store/appStore';
import api from './api/client';

function App() {
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
          setApplicationId(loaded.application_id);
          const { data: app } = await api.get(`/applications/${loaded.application_id}`);
          setApplication(app);
        }
      } catch (e) {
        console.error('Init failed', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  async function refresh() {
    const { applicationId } = useAppStore.getState();
    if (!applicationId) return;
    try {
      const { data: app } = await api.get(`/applications/${applicationId}`);
      setApplication(app);
    } catch (e) {
      console.error('Refresh failed', e);
    }
  }

  return (
    <div className="bg-[#F4F5F7] min-h-screen text-[#0B0C0E] flex flex-col font-sans antialiased">
      {/* Fixed top bar */}
      <DemoGodBar />

      {/* Main content area */}
      <main className="max-w-[1680px] w-full mx-auto px-4 sm:px-6 py-5 flex-1">
        {/* Loading overlay */}
        {isLoading && !application && (
          <div className="flex items-center justify-center min-h-[400px] animate-alfa-in">
            <div className="text-center space-y-3">
              <div className="w-9 h-9 border-2 border-neutral-200 border-t-[#EF3124] rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium text-neutral-500">Синхронизация конвейера...</p>
            </div>
          </div>
        )}

        {application && (
          <div key={`${viewMode}-${application.id || activePresetId}`} className="animate-alfa-in">
            {/* Split Screen: 6+6 columns */}
            {viewMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0 relative">
                {/* Rounded thin divider between columns for desktop */}
                <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px bg-neutral-200/80 rounded-full pointer-events-none" />

                {/* Left: Client Cabinet */}
                <div className="space-y-0 overflow-y-auto max-h-[calc(100vh-100px)] pr-1.5 lg:pr-3">
                  <div className="sticky top-0 z-10 bg-[#F4F5F7] py-1.5 mb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200/80 rounded-full shadow-xs">
                      <Building2 className="w-4 h-4 text-[#EF3124]" />
                      <span className="text-xs font-bold text-neutral-800 tracking-tight">Кабинет предпринимателя</span>
                    </div>
                  </div>
                  <ClientCabinetView application={application} onRefresh={refresh} isSplit={true} />
                </div>

                {/* Right: Bank Conveyor */}
                <div className="overflow-y-auto max-h-[calc(100vh-100px)] pr-1.5 lg:pl-3">
                  <div className="sticky top-0 z-10 bg-[#F4F5F7] py-1.5 mb-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-200/80 rounded-full shadow-xs">
                      <ShieldCheck className="w-4 h-4 text-[#EF3124]" />
                      <span className="text-xs font-bold text-neutral-800 tracking-tight">Кредитный конвейер — Внутри Банка</span>
                    </div>
                  </div>
                  <BankConveyorView application={application} onRefresh={refresh} isSplit={true} />
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
      <footer className="bg-white border-t border-neutral-200/60 py-3 px-6 flex items-center justify-between text-xs text-neutral-500">
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
