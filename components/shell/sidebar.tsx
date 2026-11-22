"use client";

import { useState } from "react";
import {
  Activity,
  ChevronDown,
  Dices,
  DraftingCompass,
  Grid3x3,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Sigma,
  SquareFunction,
  Triangle,
  type LucideIcon,
} from "lucide-react";
import { CURRICULUM } from "@/lib/curriculum";

const SECTION_ICONS: Record<string, LucideIcon> = {
  algebra: Sigma,
  geometry: Triangle,
  trigonometry: DraftingCompass,
  analysis: Activity,
  linear: Grid3x3,
  ode: SquareFunction,
  probability: Dices,
  discrete: Network,
};

type SidebarProps = {
  sectionId: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onSelect: (sectionId: string) => void;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
};

export function Sidebar({
  sectionId,
  collapsed,
  mobileOpen,
  onSelect,
  onToggleCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    school: true,
    higher: true,
  });
  const showLabels = mobileOpen || !collapsed;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
        />
      ) : null}
      <aside
        className={[
          "glass fixed inset-y-2 left-2 z-40 flex w-[min(20.5rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-3xl transition-[transform,width] duration-300 lg:static lg:inset-auto lg:z-auto lg:h-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-[120%] lg:translate-x-0",
          collapsed ? "lg:w-[5.4rem]" : "lg:w-[20.5rem]",
        ].join(" ")}
      >
        <div className="flex items-center gap-3 border-b border-line px-3 py-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-line bg-surface text-accent shadow-[0_0_18px_var(--glow-soft)]">
            <Sigma className="size-5" aria-hidden="true" />
          </span>
          {showLabels ? (
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-ink">
                Math<span className="text-accent">AI</span>
              </p>
              <p className="truncate text-xs text-muted">Математика с репетитором</p>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="ml-auto hidden size-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface hover:text-ink lg:grid"
            aria-label={collapsed ? "Развернуть панель" : "Свернуть панель"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </div>

        <nav className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 py-3" aria-label="Разделы математики">
          {CURRICULUM.map((group) => {
            const expanded = openGroups[group.id] !== false;
            return (
              <div key={group.id} className="mb-2">
                {showLabels ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[0.72rem] font-semibold tracking-[0.14em] text-muted uppercase hover:text-ink"
                    aria-expanded={expanded}
                    onClick={() =>
                      setOpenGroups((prev) => ({ ...prev, [group.id]: !expanded }))
                    }
                  >
                    <ChevronDown
                      className={["size-3.5 transition", expanded ? "" : "-rotate-90"].join(" ")}
                    />
                    <span className="truncate">{group.title}</span>
                  </button>
                ) : (
                  <div className="mx-auto my-2 h-px w-8 bg-line" />
                )}
                {(expanded || !showLabels) &&
                  group.sections.map((section) => {
                    const Icon = SECTION_ICONS[section.id] ?? Sigma;
                    const active = section.id === sectionId;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        title={section.title}
                        aria-current={active ? "page" : undefined}
                        onClick={() => onSelect(section.id)}
                        className={[
                          "mb-1 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left text-sm transition",
                          showLabels ? "" : "justify-center",
                          active
                            ? "bg-surface text-ink shadow-[inset_2px_0_0_var(--accent),0_0_18px_var(--glow-soft)]"
                            : "text-muted hover:bg-surface hover:text-ink",
                        ].join(" ")}
                      >
                        <Icon className="size-4 shrink-0 text-accent" aria-hidden="true" />
                        {showLabels ? <span className="min-w-0 leading-snug">{section.title}</span> : null}
                      </button>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        {showLabels ? (
          <p className="border-t border-line px-4 py-3 text-xs leading-5 text-muted">
            От школьной программы до университетского курса.
          </p>
        ) : null}
      </aside>
    </>
  );
}
