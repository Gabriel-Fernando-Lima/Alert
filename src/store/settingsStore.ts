import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type VoiceCommandSet = {
    stop: string[];
    snooze: string[];
    create: string[];
    autoVoice: boolean;
};

type SettingsStore = {
    voiceCommands: VoiceCommandSet;
    snoozeMinutes: number;
    flashEnabled: boolean;
    gradualVolume: boolean;
    autoVoice: boolean;
    load: () => Promise<void>;
    setVoiceCommands: (commands: VoiceCommandSet) => Promise<void>;
    setSnoozeMinutes: (minutes: number) => Promise<void>;
    setFlashEnabled: (enabled: boolean) => Promise<void>;
    setGradualVolume: (enabled: boolean) => Promise<void>;
    setAutoVoice: (enabled: boolean) => Promise<void>;
};

const DEFAULT_COMMANDS: VoiceCommandSet = {
    stop: ["parar", "desligar", "silêncio"],
    snooze: ["soneca", "adiar"],
    create: ["criar alarme", "novo alarme", "me acorda"],
    autoVoice: true
};

async function saveSettings(state: Omit<SettingsStore, "load" | "setVoiceCommands" | "setSnoozeMinutes" | "setFlashEnabled" | "setGradualVolume">) {
    await AsyncStorage.setItem("@alert:settings", JSON.stringify({
        voiceCommands: state.voiceCommands,
        snoozeMinutes: state.snoozeMinutes,
        flashEnabled: state.flashEnabled,
        gradualVolume: state.gradualVolume,
        autoVoice: state.autoVoice
    }));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
    voiceCommands: DEFAULT_COMMANDS,
    snoozeMinutes: 5,
    flashEnabled: true,
    gradualVolume: false,
    autoVoice: true,
    load: async () => {
        try {
            const raw = await AsyncStorage.getItem("@alert:settings");
            if (raw) {
                const saved = JSON.parse(raw);
                // Migra formato antigo (string) para novo (array)
                if (saved.voiceCommands) {
                    const vc = saved.voiceCommands;
                    if (typeof vc.stop === "string") vc.stop = [vc.stop];
                    if (typeof vc.snooze === "string") vc.snooze = [vc.snooze];
                    if (typeof vc.create === "string") vc.create = [vc.create];
                }
                set(saved);
            }
        } catch (e) {
            console.warn("Erro ao carregar settings:", e);
        }
    },

    setVoiceCommands: async (commands) => {
        set({ voiceCommands: commands });
        await saveSettings({ ...get(), voiceCommands: commands });
    },

    setSnoozeMinutes: async (minutes) => {
        set({ snoozeMinutes: minutes });
        await saveSettings({ ...get(), snoozeMinutes: minutes });
    },

    setFlashEnabled: async (enabled) => {
        set({ flashEnabled: enabled });
        await saveSettings({ ...get(), flashEnabled: enabled });
    },

    setGradualVolume: async (enabled) => {
        set({ gradualVolume: enabled });
        await saveSettings({ ...get(), gradualVolume: enabled });
    },

    setAutoVoice: async (enabled) => {
        set({ autoVoice: enabled });
        await saveSettings({ ...get(), autoVoice: enabled });
    },
}));