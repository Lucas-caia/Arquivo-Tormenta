export type AppearancePreference = "system" | "dark" | "light";
export type FontSizePreference = "normal" | "large";

export type AccessibilitySettings = {
  appearance: AppearancePreference;
  fontSize: FontSizePreference;
  highContrast: boolean;
  monochrome: boolean;
  reduceMotion: boolean;
};

export const defaultAccessibilitySettings: AccessibilitySettings = {
  appearance: "system",
  fontSize: "normal",
  highContrast: false,
  monochrome: false,
  reduceMotion: false
};

const storageKey = "arquivo-tormenta:accessibility";
function isAppearance(value: unknown): value is AppearancePreference {
  return value === "system" || value === "dark" || value === "light";
}

function isFontSize(value: unknown): value is FontSizePreference {
  return value === "normal" || value === "large";
}
export function normalizeAccessibilitySettings(value: unknown): AccessibilitySettings {
  if (!value || typeof value !== "object") return defaultAccessibilitySettings;
  const candidate = value as Partial<AccessibilitySettings>;
  return {
    appearance: isAppearance(candidate.appearance) ? candidate.appearance : defaultAccessibilitySettings.appearance,
    fontSize: isFontSize(candidate.fontSize) ? candidate.fontSize : defaultAccessibilitySettings.fontSize,
    highContrast: typeof candidate.highContrast === "boolean" ? candidate.highContrast : defaultAccessibilitySettings.highContrast,
    monochrome: typeof candidate.monochrome === "boolean" ? candidate.monochrome : defaultAccessibilitySettings.monochrome,
    reduceMotion: typeof candidate.reduceMotion === "boolean" ? candidate.reduceMotion : defaultAccessibilitySettings.reduceMotion
  };
}
export function loadAccessibilitySettings(): AccessibilitySettings {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? normalizeAccessibilitySettings(JSON.parse(saved)) : defaultAccessibilitySettings;
  } catch {
    return defaultAccessibilitySettings;
  }
}

export function saveAccessibilitySettings(settings: AccessibilitySettings) {
  window.localStorage.setItem(storageKey, JSON.stringify(settings));
}
export function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;
  root.dataset.appearance = settings.appearance;
  root.dataset.fontSize = settings.fontSize;
  root.dataset.contrast = settings.highContrast ? "high" : "standard";
  root.dataset.monochrome = settings.monochrome ? "true" : "false";
  root.dataset.motion = settings.reduceMotion ? "reduced" : "full";
  root.style.filter = settings.monochrome ? "grayscale(1)" : "";
}
