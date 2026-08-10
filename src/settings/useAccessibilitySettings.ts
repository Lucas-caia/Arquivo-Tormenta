import { useEffect, useState } from "react";
import {
  applyAccessibilitySettings,
  defaultAccessibilitySettings,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
  type AccessibilitySettings
} from "./accessibility";

export function useAccessibilitySettings() {
  const [settings, setSettings] = useState<AccessibilitySettings>(loadAccessibilitySettings);

  useEffect(() => {
    applyAccessibilitySettings(settings);
    saveAccessibilitySettings(settings);
  }, [settings]);

  function updateSettings(patch: Partial<AccessibilitySettings>) {
    setSettings((current) => ({ ...current, ...patch }));
  }

  function resetSettings() {
    setSettings(defaultAccessibilitySettings);
  }

  return { settings, updateSettings, resetSettings };
}
