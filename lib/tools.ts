export const TOOL_IDS = ["calculator", "formulas", "board"] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type ToolDefinition = {
  id: ToolId;
  title: string;
  shortLabel: string;
  description: string;
};

export const TOOLS: ToolDefinition[] = [
  {
    id: "calculator",
    title: "Калькулятор",
    shortLabel: "Калькулятор",
    description:
      "Здесь будет инженерный калькулятор: выражения, степени, корни и тригонометрия. Сейчас это пустое окно-заглушка.",
  },
  {
    id: "formulas",
    title: "Таблицы формул",
    shortLabel: "Формулы",
    description:
      "Здесь появится справочник формул по выбранному разделу. Сейчас это пустое окно-заглушка.",
  },
  {
    id: "board",
    title: "Геометрическая доска",
    shortLabel: "Доска",
    description:
      "Здесь будет доска с циркулем и линейкой для построений. Сейчас это пустое окно-заглушка.",
  },
];

export function findTool(toolId: ToolId): ToolDefinition {
  return TOOLS.find((tool) => tool.id === toolId) ?? TOOLS[0];
}
