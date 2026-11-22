"use client";

import { Calculator, DraftingCompass, Menu, Settings2, Table2, type LucideIcon } from "lucide-react";
import { TOOLS, type ToolId } from "@/lib/tools";

const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  calculator: Calculator,
  formulas: Table2,
  board: DraftingCompass,
};

type TopBarProps = {
  onOpenMobile: () => void;
  onOpenTool: (toolId: ToolId) => void;
  onOpenSettings: () => void;
};

export function TopBar({ onOpenMobile, onOpenTool, onOpenSettings }: TopBarProps) {
  return (
    <header className="glass flex items-center gap-2 rounded-3xl px-3 py-2.5 sm:px-4">
      <button
        type="button"
        onClick={onOpenMobile}
        className="grid size-10 place-items-center rounded-2xl text-ink hover:bg-surface lg:hidden"
        aria-label="Открыть разделы"
      >
        <Menu className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">Учебная платформа</p>
        <p className="truncate text-xs text-muted">Инструменты и оформление</p>
      </div>
      <div className="flex items-center gap-1.5">
        {TOOLS.map((tool) => {
          const Icon = TOOL_ICONS[tool.id];
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenTool(tool.id)}
              className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-2.5 py-2 text-sm text-ink transition hover:shadow-[0_0_18px_var(--glow-soft)]"
              aria-label={tool.title}
            >
              <Icon className="size-4 text-accent" aria-hidden="true" />
              <span className="hidden xl:inline">{tool.shortLabel}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-2 rounded-2xl bg-accent px-2.5 py-2 text-sm font-medium text-on-accent shadow-[0_0_18px_var(--glow-soft)]"
        >
          <Settings2 className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Кастомизация</span>
        </button>
      </div>
    </header>
  );
}
