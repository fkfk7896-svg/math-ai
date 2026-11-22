"use client";

import { useEffect, useRef } from "react";
import { X, Zap } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import type { FontSize } from "@/lib/settings";
import { THEMES, type ThemeId } from "@/lib/themes";

type SettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { settings, updateSettings } = useTheme();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  if (!open) return null;

  const neon = THEMES.filter((theme) => theme.group === "neon");
  const mono = THEMES.filter((theme) => theme.group === "mono");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Закрыть настройки" className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="glass relative flex h-full w-[min(26rem,100%)] flex-col rounded-none sm:m-2 sm:h-[calc(100%-1rem)] sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 id="settings-title" className="text-lg font-semibold text-ink">
              Настройки / Кастомизация
            </h2>
            <p className="mt-1 text-sm text-muted">Выбор сохраняется в этом браузере.</p>
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

        <div className="scroll-thin min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-sm font-semibold text-ink">Тема</h3>
            <div className="mt-3 space-y-4" role="radiogroup" aria-label="Тема оформления">
              <ThemeGroup
                label="Неоновые"
                themes={neon}
                activeId={settings.themeId}
                onSelect={(themeId) => updateSettings({ themeId })}
              />
              <ThemeGroup
                label="Монохромные"
                themes={mono}
                activeId={settings.themeId}
                onSelect={(themeId) => updateSettings({ themeId })}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Zap className="size-4 text-accent" aria-hidden="true" />
                  Электрические линии
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  Неоновые импульсы на фоне. Выключите их, если нужен спокойный фон для чтения.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.linesEnabled}
                aria-label="Анимация электрических линий"
                onClick={() => updateSettings({ linesEnabled: !settings.linesEnabled })}
                className={[
                  "relative h-7 w-12 shrink-0 rounded-full border transition",
                  settings.linesEnabled ? "border-accent bg-accent" : "border-line bg-canvas",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 size-5 rounded-full transition",
                    settings.linesEnabled ? "left-6 bg-on-accent" : "left-0.5 bg-muted",
                  ].join(" ")}
                />
              </button>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-ink">Яркость фона</h3>
              <span className="text-xs text-muted">{Math.round(settings.brightness * 100)}%</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">
              Сила градиента и свечения линий. Панели с текстом остаются контрастными.
            </p>
            <input
              className="neon-range mt-3"
              type="range"
              min={20}
              max={100}
              step={1}
              value={Math.round(settings.brightness * 100)}
              aria-label="Яркость фона"
              aria-valuemin={20}
              aria-valuemax={100}
              aria-valuenow={Math.round(settings.brightness * 100)}
              onChange={(event) =>
                updateSettings({ brightness: Number(event.target.value) / 100 })
              }
            />
          </section>

          <section>
            <h3 className="text-sm font-semibold text-ink">Размер шрифта</h3>
            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Размер шрифта">
              {(
                [
                  ["md", "Обычный"],
                  ["lg", "Крупный"],
                ] as const
              ).map(([value, label]) => {
                const active = settings.fontSize === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => updateSettings({ fontSize: value satisfies FontSize })}
                    className={[
                      "rounded-2xl border px-3 py-3 text-sm",
                      active
                        ? "border-accent bg-surface text-ink shadow-[0_0_16px_var(--glow-soft)]"
                        : "border-line text-muted hover:text-ink",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function ThemeGroup({
  label,
  themes,
  activeId,
  onSelect,
}: {
  label: string;
  themes: typeof THEMES;
  activeId: ThemeId;
  onSelect: (themeId: ThemeId) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs tracking-wide text-muted uppercase">{label}</p>
      <div className="space-y-2">
        {themes.map((theme) => {
          const active = theme.id === activeId;
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(theme.id)}
              className={[
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left",
                active
                  ? "border-accent bg-surface shadow-[0_0_16px_var(--glow-soft)]"
                  : "border-line hover:bg-surface",
              ].join(" ")}
            >
              <span
                className="h-10 w-14 shrink-0 rounded-xl border border-white/10"
                style={{
                  background: `linear-gradient(135deg, ${theme.swatch[0]}, ${theme.swatch[1]} 55%, ${theme.swatch[2]})`,
                  boxShadow: `0 0 12px ${theme.swatch[2]}55`,
                }}
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{theme.name}</span>
                <span className="block text-xs text-muted">{theme.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
