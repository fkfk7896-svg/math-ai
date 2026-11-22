"use client";

import { useEffect, useRef } from "react";
import { Calculator, DraftingCompass, Table2, X, type LucideIcon } from "lucide-react";
import { findTool, type ToolId } from "@/lib/tools";
import { ScientificCalculator } from "@/components/tools/scientific-calculator";
import { FormulaSheet } from "@/components/tools/formula-sheet";
import { GeometryBoard } from "@/components/tools/geometry-board";

const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  calculator: Calculator,
  formulas: Table2,
  board: DraftingCompass,
};

type ToolDialogProps = {
  toolId: ToolId | null;
  onClose: () => void;
};

export function ToolDialog({ toolId, onClose }: ToolDialogProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!toolId) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [toolId]);

  if (!toolId) return null;
  const tool = findTool(toolId);
  const Icon = TOOL_ICONS[tool.id];
  const isBoard = tool.id === "board";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-2 sm:p-4">
      <button
        type="button"
        aria-label="Закрыть инструмент"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tool-title"
        className={[
          "glass relative z-10 flex w-full flex-col rounded-3xl p-4 sm:p-6",
          isBoard
            ? "h-[94vh] max-w-[96vw]"
            : "scroll-thin max-h-[92vh] max-w-3xl overflow-y-auto",
        ].join(" ")}
      >
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-line bg-surface text-accent">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="tool-title" className="text-lg font-semibold text-ink">
                {tool.title}
              </h2>
              <p className="text-xs text-muted">{tool.description}</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-muted hover:bg-surface hover:text-ink"
            aria-label="Закрыть"
          >
            <X className="size-4" />
          </button>
        </div>

        {tool.id === "calculator" && <ScientificCalculator />}
        {tool.id === "formulas" && <FormulaSheet />}
        {tool.id === "board" && <GeometryBoard />}
      </div>
    </div>
  );
}