"use client";

import { useEffect, useState } from "react";
import { BookOpen, Bot } from "lucide-react";
import { findSection } from "@/lib/curriculum";
import type { ToolId } from "@/lib/tools";
import { CourseView } from "@/components/course/course-view";
import { SettingsDrawer } from "@/components/shell/settings-drawer";
import { Sidebar } from "@/components/shell/sidebar";
import { ToolDialog } from "@/components/shell/tool-dialog";
import { TopBar } from "@/components/shell/top-bar";
import { Workspace } from "@/components/shell/workspace";

export function AppShell() {
  const [mode, setMode] = useState<"tutor" | "course">("course");
  const [sectionId, setSectionId] = useState("algebra");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolId, setToolId] = useState<ToolId | null>(null);
  const section = findSection(sectionId);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (toolId) setToolId(null);
      else if (settingsOpen) setSettingsOpen(false);
      else if (mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toolId, settingsOpen, mobileOpen]);

  return (
    <div className="flex h-full gap-2 p-2 sm:gap-3 sm:p-3">
      <Sidebar
        sectionId={section.id}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onSelect={(id) => {
          setSectionId(id);
          setMode("tutor");
          setMobileOpen(false);
        }}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 sm:gap-3">
        <TopBar
          onOpenMobile={() => setMobileOpen(true)}
          onOpenTool={(id) => {
            setSettingsOpen(false);
            setToolId(id);
          }}
          onOpenSettings={() => {
            setToolId(null);
            setSettingsOpen(true);
          }}
        />

        {/* Переключатель режимов: Курс (12 тем) / ИИ-Репетитор */}
        <div className="flex items-center gap-2">
          <div className="glass inline-flex rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setMode("course")}
              className={[
                "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition sm:text-sm",
                mode === "course"
                  ? "bg-accent text-on-accent shadow-[0_0_14px_var(--glow-soft)]"
                  : "text-muted hover:text-ink",
              ].join(" ")}
            >
              <BookOpen className="size-4" />
              Курс (12 тем)
            </button>
            <button
              type="button"
              onClick={() => setMode("tutor")}
              className={[
                "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition sm:text-sm",
                mode === "tutor"
                  ? "bg-accent text-on-accent shadow-[0_0_14px_var(--glow-soft)]"
                  : "text-muted hover:text-ink",
              ].join(" ")}
            >
              <Bot className="size-4" />
              ИИ-Репетитор
            </button>
          </div>
        </div>

        {mode === "course" ? <CourseView /> : <Workspace key={section.id} section={section} />}
      </div>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ToolDialog toolId={toolId} onClose={() => setToolId(null)} />
    </div>
  );
}