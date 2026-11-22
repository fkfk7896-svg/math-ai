import { DEFAULT_THEME_ID, isThemeId, type ThemeId } from "@/lib/themes";

export const SETTINGS_STORAGE_KEY = "mathai-settings";

export type FontSize = "md" | "lg";

export type Settings = {
  themeId: ThemeId;
  linesEnabled: boolean;
  brightness: number;
  fontSize: FontSize;
};

export const DEFAULT_SETTINGS: Settings = {
  themeId: DEFAULT_THEME_ID,
  linesEnabled: true,
  brightness: 0.72,
  fontSize: "md",
};

const THEME_ID_LIST = [
  "red-neon",
  "cyber-blue",
  "emerald",
  "violet",
  "mono-dark",
  "mono-light",
] as const;

export const THEME_BOOT_SCRIPT = `(function(){try{var raw=localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)});var allowed=${JSON.stringify(Object.fromEntries(THEME_ID_LIST.map((id) => [id, 1])))};var root=document.documentElement;var s=raw?JSON.parse(raw):null;if(s&&allowed[s.themeId])root.setAttribute("data-theme",s.themeId);if(s&&typeof s.linesEnabled==="boolean"){root.setAttribute("data-lines",s.linesEnabled?"on":"off")}else if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){root.setAttribute("data-lines","off")}if(s&&(s.fontSize==="md"||s.fontSize==="lg"))root.setAttribute("data-text",s.fontSize);if(s&&typeof s.brightness==="number"&&isFinite(s.brightness)){var b=Math.min(1,Math.max(0.2,s.brightness));root.style.setProperty("--bg-brightness",String(b))}}catch(e){}})();`;

export function sanitizeSettings(input: Partial<Settings> | null | undefined): Settings {
  const themeId = isThemeId(input?.themeId) ? input.themeId : DEFAULT_SETTINGS.themeId;
  const fontSize: FontSize =
    input?.fontSize === "lg" || input?.fontSize === "md"
      ? input.fontSize
      : DEFAULT_SETTINGS.fontSize;
  const linesEnabled =
    typeof input?.linesEnabled === "boolean"
      ? input.linesEnabled
      : DEFAULT_SETTINGS.linesEnabled;
  let brightness = DEFAULT_SETTINGS.brightness;
  if (typeof input?.brightness === "number" && Number.isFinite(input.brightness)) {
    brightness = Math.min(1, Math.max(0.2, input.brightness));
  }
  return { themeId, fontSize, linesEnabled, brightness };
}

export function readSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return { ...DEFAULT_SETTINGS, linesEnabled: !reduce };
    }
    return sanitizeSettings(JSON.parse(raw) as Partial<Settings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function writeSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function applySettings(settings: Settings) {
  const root = document.documentElement;
  root.dataset.theme = settings.themeId;
  root.dataset.lines = settings.linesEnabled ? "on" : "off";
  root.dataset.text = settings.fontSize;
  root.style.setProperty("--bg-brightness", String(settings.brightness));
}
