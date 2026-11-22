export const THEME_IDS = [
  "red-neon",
  "cyber-blue",
  "emerald",
  "violet",
  "mono-dark",
  "mono-light",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeGroup = "neon" | "mono";

export type ThemeDefinition = {
  id: ThemeId;
  name: string;
  description: string;
  group: ThemeGroup;
  swatch: [string, string, string];
};

export const DEFAULT_THEME_ID: ThemeId = "red-neon";

export const THEMES: ThemeDefinition[] = [
  {
    id: "red-neon",
    name: "Красный неон",
    description: "Графит и ярко-красные импульсы",
    group: "neon",
    swatch: ["#070406", "#8f1230", "#ff2d55"],
  },
  {
    id: "cyber-blue",
    name: "Кибер-синий",
    description: "Глубокий синий и голубое свечение",
    group: "neon",
    swatch: ["#04070f", "#0c4a6e", "#3ecbff"],
  },
  {
    id: "emerald",
    name: "Изумрудная матрица",
    description: "Тёмный лес и зелёный неон",
    group: "neon",
    swatch: ["#030806", "#065f46", "#2dff9a"],
  },
  {
    id: "violet",
    name: "Фиолетовый импульс",
    description: "Индиго и фиолетовые разряды",
    group: "neon",
    swatch: ["#07040f", "#5b21b6", "#c084fc"],
  },
  {
    id: "mono-dark",
    name: "Тёмный монохром",
    description: "Чёрный, серый и серебристые линии",
    group: "mono",
    swatch: ["#0c0d0f", "#3a3f46", "#e8eaed"],
  },
  {
    id: "mono-light",
    name: "Светлый монохром",
    description: "Светлый фон и тонкие серые линии",
    group: "mono",
    swatch: ["#f4f5f7", "#c5cdd6", "#2c3540"],
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.some((id) => id === value);
}
