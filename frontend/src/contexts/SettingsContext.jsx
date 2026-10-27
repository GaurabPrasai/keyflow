import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const SettingsContext = createContext(null);

const STORAGE_KEY = "keyflow-settings";

export const DATASET_GROUPS = [
  {
    label: "Common",
    options: [{ value: "english-200", label: "English 200" }],
  },
  {
    label: "Longer",
    options: [
      { value: "english-1k", label: "English 1K" },
      { value: "english-5k", label: "English 5K" },
    ],
  },
  {
    label: "Phrases",
    options: [{ value: "commonly-misspelled", label: "Commonly misspelled" }],
  },
];

export const DATASET_OPTIONS = DATASET_GROUPS.flatMap((group) => group.options);

export const FONT_OPTIONS = [
  { value: 0.85, label: "Small" },
  { value: 1, label: "Medium" },
  { value: 1.15, label: "Large" },
];

export const CARET_OPTIONS = [
  { value: "bar", label: "Bar" },
  { value: "block", label: "Block" },
  { value: "underline", label: "Underline" },
];

export const SOUND_PACKS = [
  { value: "off", label: "Off" },
  { value: "soft", label: "Soft" },
  { value: "clicky", label: "Clicky" },
  { value: "thock", label: "Thock" },
];

export const DEFAULT_SETTINGS = {
  textDataset: "english-200",
  fontSize: 1,
  caretStyle: "bar",
  soundPack: "soft",
  volume: 0.4,
  // Profiling (Plan 4.0 §3.6) showed the full-size glow drops ~40 frames per
  // 300 keystrokes, so it ships OFF. The toggle stays for A/B on real hardware.
  flowGlow: false,
};

/** Fill in defaults and reject invalid/unknown stored values (migrating v3 settings). */
export function normalizeSettings(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const settings = { ...DEFAULT_SETTINGS };

  if (DATASET_OPTIONS.some((option) => option.value === value.textDataset)) {
    settings.textDataset = value.textDataset;
  }
  if (FONT_OPTIONS.some((option) => option.value === Number(value.fontSize))) {
    settings.fontSize = Number(value.fontSize);
  }
  if (CARET_OPTIONS.some((option) => option.value === value.caretStyle)) {
    settings.caretStyle = value.caretStyle;
  }
  if (SOUND_PACKS.some((option) => option.value === value.soundPack)) {
    settings.soundPack = value.soundPack;
  } else if (typeof value.soundEnabled === "boolean") {
    // v3 stored a boolean toggle instead of a pack.
    settings.soundPack = value.soundEnabled ? "soft" : "off";
  }
  if (Number.isFinite(Number(value.volume))) {
    settings.volume = Math.min(1, Math.max(0, Number(value.volume)));
  }
  if (typeof value.flowGlow === "boolean") settings.flowGlow = value.flowGlow;

  return settings;
}

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeSettings(JSON.parse(stored)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    document.documentElement.style.setProperty("--font-scale", String(settings.fontSize));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* storage can be blocked - settings still work for this session */
    }
  }, [settings]);

  const update = useCallback((key, value) => {
    setSettings((previous) => normalizeSettings({ ...previous, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
