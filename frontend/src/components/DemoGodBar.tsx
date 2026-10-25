import { RefreshCw, Play, Briefcase, Columns2, Landmark, UserCheck } from 'lucide-react';
import { useAppStore, type ViewMode } from '../store/appStore';
import api from '../api/client';

const VIEW_BUTTONS: { mode: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'client', label: 'Кабинет предпринимателя', icon: Briefcase },
  { mode: 'split',  label: 'Split-Screen',             icon: Columns2 },
  { mode: 'bank',   label: 'Внутри Банка',             icon: Landmark },
];

const PRESET_CONFIG: Record<
  string,
  { label: string; dotColor: string; defaultTitle: string }
> = {
  coffee_shop_ip: {
    label: 'Fast-track',
    dotColor: 'bg-emerald-500',
    defaultTitle: 'Fast-track автоодобрение (ИП «Кофейня на Покровке»)',
  },
  manufacturing_ooo: {
    label: 'Контр-оффер',
    dotColor: 'bg-amber-400',
    defaultTitle: 'Небинарный контр-оффер (ООО МеталлПром)',
  },
  logistics_seasonal: {
    label: 'Андеррайтинг',
    dotColor: 'bg-orange-500',
    defaultTitle: 'Ручной андеррайтинг и дозапрос (ООО СпецТранс)',
  },
  wholesale_rejected: {
    label: 'Отказ',
    dotColor: 'bg-rose-500',
    defaultTitle: 'Стоп-фактор и план оздоровления (ООО ВекторТрейд)',
  },
  custom_input: {
    label: 'Чистый ввод',
    dotColor: 'bg-blue-400',
    defaultTitle: 'Чистый профиль (ручной ввод реквизитов)',
  },
};

const DEFAULT_PRESETS: { preset_id: string; label: string; description?: string }[] = [
  { preset_id: 'coffee_shop_ip', label: 'Fast-track', description: 'Fast-track автоодобрение (ИП «Кофейня на Покровке»)' },
  { preset_id: 'manufacturing_ooo', label: 'Контр-оффер', description: 'Небинарный контр-оффер (ООО МеталлПром)' },
  { preset_id: 'logistics_seasonal', label: 'Андеррайтинг', description: 'Ручной андеррайтинг и дозапрос (ООО СпецТранс)' },
  { preset_id: 'wholesale_rejected', label: 'Отказ', description: 'Стоп-фактор и план оздоровления (ООО ВекторТрейд)' },
  { preset_id: 'custom_input', label: 'Чистый ввод', description: 'Чистый профиль (ручной ввод реквизитов)' },
];

export function DemoGodBar() {
  const {
    presets,
    activePresetId,
    isLoading,
    viewMode,
    userRole,
    isDelegated,
    setViewMode,
    setUserRole,
    setActivePresetId,
    setApplication,
    setApplicationId,
    setIsLoading,
  } = useAppStore();

  async function loadPreset(presetId: string) {
    setIsLoading(true);
    try {
      const { data } = await api.post(`/presets/${presetId}/load`);
      setActivePresetId(presetId);
      if (data.application_id) {
        setApplicationId(data.application_id);
        const { data: app } = await api.get(`/applications/${data.application_id}`);
        setApplication(app);
      }
    } catch (e) {
      console.error('loadPreset error', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function advancePipeline() {
    const state = useAppStore.getState();
    const { applicationId, application } = state;
    if (!applicationId || !application) return;

    const triggerMap: Record<string, string> = {
      DRAFT:              'SUBMIT',
      SUBMITTED:          'AUTO_VALIDATE',
      VALIDATION:         'VALIDATION_PASSED',
      ENRICHMENT:         'ENRICHMENT_COMPLETE',
      SCORING_AND_POLICY: 'AUTO_APPROVE',
      APPROVED:           'ACCEPT_OFFER',
      COUNTER_OFFER:      'ACCEPT_OFFER',
      RESUBMITTED:        'RE_SCORE',
      OFFER_ACCEPTED:     'SIGN_CONTRACT',
      CONTRACT_SIGNED:    'DISBURSE',
    };

    const trigger = triggerMap[application.state];
    if (!trigger) return;

    setIsLoading(true);
    try {
      await api.post(`/applications/${applicationId}/transition`, {
        trigger,
        actor_type: 'SYSTEM_CONVEYOR',
      });
      const { data: app } = await api.get(`/applications/${applicationId}`);
      state.setApplication(app);
    } catch (e) {
      console.error('advancePipeline error', e);
    } finally {
      setIsLoading(false);
    }
  }

  const presetList = presets.length > 0 ? presets : DEFAULT_PRESETS;

  return (
    <header className="bg-[#0F1115] text-white border-b border-white/10 sticky top-0 z-50">
      {/* Row 1: Logo + View Mode Segmented Switcher + Demo Controls */}
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Alfa Logo & Branding */}
        <div className="flex items-center gap-3 shrink-0 select-none">
          <div className="flex flex-col items-center justify-center shrink-0">
            <span className="text-[#EF3124] font-black text-2xl leading-none tracking-tight">А</span>
            <span className="w-4 h-[2.5px] bg-[#EF3124] rounded-full mt-0.5" />
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight leading-tight flex items-center gap-1.5">
              <span>Альфа-Бизнес</span>
              <span className="bg-[#EF3124]/20 text-[#EF3124] border border-[#EF3124]/30 text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">PRO</span>
            </div>
            <div className="text-[11px] text-neutral-400 leading-tight">
              Кредитный конвейер
            </div>
          </div>
        </div>

        {/* View Mode Switcher (Segmented Control Pill) */}
        <nav
          aria-label="Переключение экранов"
          className="rounded-full bg-[#1F2229] p-1 border border-white/5 flex items-center"
        >
          {VIEW_BUTTONS.map(({ mode, label, icon: Icon }) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={
                  isActive
                    ? 'bg-[#2C303B] text-white shadow-sm font-semibold rounded-full px-3.5 py-1.5 text-xs flex items-center gap-2 alfa-btn'
                    : 'text-neutral-400 hover:text-white px-3.5 py-1.5 text-xs flex items-center gap-2 alfa-btn'
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Demo Controls: Role Switcher + Reset + Advance Pipeline */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Role Pill Switcher */}
          <button
            type="button"
            onClick={() => setUserRole(userRole === 'OWNER' ? 'ACCOUNTANT' : 'OWNER')}
            title="Переключить роль (Собственник / Главный бухгалтер)"
            className="rounded-full bg-[#1F2229] hover:bg-[#2C303B] border border-white/5 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-1.5 alfa-btn select-none"
          >
            <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span>{userRole === 'OWNER' ? 'Собственник' : 'Главный бухгалтер'}</span>
            {isDelegated && userRole === 'ACCOUNTANT' && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5"
                title="Делегировано право подписи"
              />
            )}
          </button>

          {/* Reset Current Preset */}
          <button
            type="button"
            onClick={() => loadPreset(activePresetId)}
            disabled={isLoading}
            title="Сбросить состояние к текущему пресету"
            className="rounded-full bg-[#1F2229] hover:bg-[#2C303B] border border-white/5 px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white flex items-center gap-1.5 alfa-btn disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Сбросить</span>
          </button>

          {/* Advance Pipeline Step */}
          <button
            type="button"
            onClick={advancePipeline}
            disabled={isLoading}
            title="Продвинуть заявку по кредитному конвейеру"
            className="bg-[#EF3124] hover:bg-[#D9261A] text-white rounded-full px-4 py-1.5 text-xs font-bold shadow-md flex items-center gap-1.5 alfa-btn disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Шаг конвейера</span>
          </button>
        </div>
      </div>

      {/* Row 2: Secondary Preset Selector Bar */}
      <div className="bg-[#0B0C0E] border-t border-white/5 py-1.5 px-4 sm:px-6">
        <div className="max-w-[1680px] mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 shrink-0 mr-1 select-none">
            Сценарии:
          </span>
          {presetList.map((p) => {
            const config = PRESET_CONFIG[p.preset_id] ?? {
              label: p.label,
              dotColor: 'bg-neutral-400',
              defaultTitle: p.label,
            };
            const isActive = p.preset_id === activePresetId;
            const tooltip =
              'description' in p && typeof p.description === 'string' && p.description
                ? p.description
                : config.defaultTitle;
            return (
              <button
                key={p.preset_id}
                type="button"
                onClick={() => loadPreset(p.preset_id)}
                disabled={isLoading}
                title={tooltip}
                className={`rounded-full text-xs font-medium py-1 px-3 alfa-btn flex items-center gap-1.5 shrink-0 ${
                  isActive
                    ? 'bg-white/10 text-white ring-1 ring-white/20'
                    : 'text-neutral-400 hover:text-neutral-200'
                } disabled:opacity-50`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
