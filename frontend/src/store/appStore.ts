import { create } from 'zustand';
import type { Application, Preset, UserRole } from '../types';

export type ViewMode = 'client' | 'bank' | 'split';

interface AppStore {
  // View state
  viewMode: ViewMode;
  userRole: UserRole;
  setViewMode: (mode: ViewMode) => void;
  setUserRole: (role: UserRole) => void;

  // Preset & application
  presets: Preset[];
  activePresetId: string;
  application: Application | null;
  applicationId: string | null;
  isLoading: boolean;

  setPresets: (presets: Preset[]) => void;
  setActivePresetId: (id: string) => void;
  setApplication: (app: Application | null) => void;
  setApplicationId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;

  // Underwriter panel state
  underwriterInput: string;
  setUnderwriterInput: (v: string) => void;

  // OTP signing
  otpValue: string;
  setOtpValue: (v: string) => void;

  // Delegate flag
  isDelegated: boolean;
  setIsDelegated: (v: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  viewMode: 'split',
  userRole: 'OWNER',
  setViewMode: (mode) => set({ viewMode: mode }),
  setUserRole: (role) => set({ userRole: role }),

  presets: [],
  activePresetId: 'coffee_shop_ip',
  application: null,
  applicationId: null,
  isLoading: false,

  setPresets: (presets) => set({ presets }),
  setActivePresetId: (id) => set({ activePresetId: id }),
  setApplication: (app) => set({ application: app }),
  setApplicationId: (id) => set({ applicationId: id }),
  setIsLoading: (v) => set({ isLoading: v }),

  underwriterInput: '',
  setUnderwriterInput: (v) => set({ underwriterInput: v }),

  otpValue: '',
  setOtpValue: (v) => set({ otpValue: v }),

  isDelegated: false,
  setIsDelegated: (v) => set({ isDelegated: v }),
}));
