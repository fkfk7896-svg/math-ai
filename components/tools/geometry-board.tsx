"use client";

import { useEffect, useRef, useState } from "react";
import {
  Compass,
  Download,
  Eraser,
  Grid3x3,
  Minus,
  Pencil,
  RotateCw,
  Ruler,
  Square,
  Trash2,
  Undo2,
} from "lucide-react";

type DrawTool = "pen" | "line" | "compass" | "rect" | "eraser";
type BgMode = "grid" | "axes" | "dots" | "blank";

type Point = { x: number; y: number };
type Shape =
  | { type: "pen"; points: Point[]; color: string; width: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { type: "compass"; cx: number; cy: number; r: number; color: string; width: number }
  | { type: "rect"; x1: number; y1: number; x2: number; y2: number; color: string; width: number };

const COLORS = ["#ff2d55", "#3ecbff", "#2dff9a", "#facc15", "#c084fc", "#ffffff", "#1a212b"];
const GRID_STEP = 32; // 1 клетка = 32px

function dist(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function pointToSegmentDist(p: Point, a: Point, b: Point) {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2));
  return dist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

function isNearShape(p: Point, s: Shape): boolean {
  const tol = 14;
  if (s.type === "pen") return s.points.some((pt) => dist(p, pt) < tol);
  if (s.type === "line") return pointToSegmentDist(p, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }) < tol;
  if (s.type === "compass") return Math.abs(dist(p, { x: s.cx, y: s.cy }) - s.r) < tol || dist(p, { x: s.cx, y: s.cy }) < tol;
  const minX = Math.min(s.x1, s.x2);
  const maxX = Math.max(s.x1, s.x2);
  const minY = Math.min(s.y1, s.y2);
  const maxY = Math.max(s.y1, s.y2);
  const nearV = (Math.abs(p.x - minX) < tol || Math.abs(p.x - maxX) < tol) && p.y >= minY - tol && p.y <= maxY + tol;
  const nearH = (Math.abs(p.y - minY) < tol || Math.abs(p.y - maxY) < tol) && p.x >= minX - tol && p.x <= maxX + tol;
  return nearV || nearH;
}

export function GeometryBoard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [tool, setTool] = useState<DrawTool>("compass");
  const [bgMode, setBgMode] = useState<BgMode>("axes");
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(2);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [draft, setDraft] = useState<Shape | null>(null);
  const [size, setSize] = useState({ w: 900, h: 520 });

  // Накладные приборы: линейка и транспортир
  const [showRuler, setShowRuler] = useState(false);
  const [ruler, setRuler] = useState({ x: 140, y: 120, angle: 0 });
  const [showProtractor, setShowProtractor] = useState(false);
  const [protractor, setProtractor] = useState({ x: 380, y: 260, angle: 0 });

  const draggingInstrument = useRef<{
    kind: "ruler" | "protractor";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        setSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Отрисовка холста
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const styles = getComputedStyle(document.documentElement);
    const bgColor = styles.getPropertyValue("--bg-0").trim() || "#070406";
    const muted = styles.getPropertyValue("--muted").trim() || "#999";

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size.w, size.h);

    const cx = Math.round(size.w / 2 / GRID_STEP) * GRID_STEP;
    const cy = Math.round(size.h / 2 / GRID_STEP) * GRID_STEP;

    // Фон
    if (bgMode === "grid" || bgMode === "axes") {
      ctx.strokeStyle = "rgba(150, 160, 180, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = cx % GRID_STEP; x < size.w; x += GRID_STEP) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size.h);
      }
      for (let y = cy % GRID_STEP; y < size.h; y += GRID_STEP) {
        ctx.moveTo(0, y);
        ctx.lineTo(size.w, y);
      }
      ctx.stroke();
    }

    if (bgMode === "dots") {
      ctx.fillStyle = "rgba(150, 160, 180, 0.35)";
      for (let x = GRID_STEP; x < size.w; x += GRID_STEP) {
        for (let y = GRID_STEP; y < size.h; y += GRID_STEP) {
          ctx.beginPath();
          ctx.arc(x, y, 1.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (bgMode === "axes") {
      ctx.strokeStyle = "rgba(180, 190, 210, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(size.w, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, size.h);
      ctx.stroke();

      ctx.fillStyle = muted;
      ctx.font = "11px monospace";
      ctx.fillText("X", size.w - 16, cy - 8);
      ctx.fillText("Y", cx + 8, 16);
      ctx.fillText("0", cx + 6, cy + 14);
    }

    const drawShape = (s: Shape, isDraft: boolean) => {
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (s.type === "pen" && s.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
        ctx.stroke();
      } else if (s.type === "line") {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();

        const lenCells = (Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / GRID_STEP).toFixed(1);
        const deg = Math.round((-Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI);
        ctx.font = "12px monospace";
        ctx.fillText(`L=${lenCells} (${deg}°)`, (s.x1 + s.x2) / 2 + 8, (s.y1 + s.y2) / 2 - 8);
      } else if (s.type === "compass") {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        ctx.stroke();

        // Центр
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Пунктирный радиус и подпись
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(s.cx, s.cy);
        ctx.lineTo(s.cx + s.r, s.cy);
        ctx.stroke();
        ctx.setLineDash([]);

        const rCells = (s.r / GRID_STEP).toFixed(1);
        ctx.font = "12px monospace";
        ctx.fillText(`R=${rCells}`, s.cx + s.r / 2 - 14, s.cy - 8);

        // Визуальный силуэт циркуля во время построения
        if (isDraft && s.r > 10) {
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s.cx, s.cy);
          ctx.lineTo(s.cx + s.r / 2, s.cy - Math.max(45, s.r * 0.7));
          ctx.lineTo(s.cx + s.r, s.cy);
          ctx.stroke();
        }
      } else if (s.type === "rect") {
        ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
      }
      ctx.restore();
    };

    shapes.forEach((s) => drawShape(s, false));
    if (draft) drawShape(draft, true);
  }, [shapes, draft, bgMode, size]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getPos(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "eraser") {
      setShapes((prev) => prev.filter((s) => !isNearShape(p, s)));
      return;
    }
    if (tool === "pen") setDraft({ type: "pen", points: [p], color, width });
    if (tool === "line") setDraft({ type: "line", x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, width });
    if (tool === "compass") setDraft({ type: "compass", cx: p.x, cy: p.y, r: 0, color, width });
    if (tool === "rect") setDraft({ type: "rect", x1: p.x, y1: p.y, x2: p.x, y2: p.y, color, width });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = getPos(e);
    if (tool === "eraser" && e.buttons === 1) {
      setShapes((prev) => prev.filter((s) => !isNearShape(p, s)));
      return;
    }
    if (!draft) return;
    if (draft.type === "pen") setDraft({ ...draft, points: [...draft.points, p] });
    if (draft.type === "line") setDraft({ ...draft, x2: p.x, y2: p.y });
    if (draft.type === "compass") setDraft({ ...draft, r: dist({ x: draft.cx, y: draft.cy }, p) });
    if (draft.type === "rect") setDraft({ ...draft, x2: p.x, y2: p.y });
  };

  const onPointerUp = () => {
    if (!draft) return;
    const valid =
      draft.type === "pen"
        ? draft.points.length > 1
        : draft.type === "compass"
          ? draft.r > 4
          : Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) > 4;
    if (valid) setShapes((prev) => [...prev, draft]);
    setDraft(null);
  };

  const savePng = () => {
    const url = canvasRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = "mathai-board.png";
    a.click();
  };

  const startInstrumentDrag = (kind: "ruler" | "protractor", e: React.PointerEvent) => {
    e.stopPropagation();
    const orig = kind === "ruler" ? ruler : protractor;
    draggingInstrument.current = { kind, startX: e.clientX, startY: e.clientY, origX: orig.x, origY: orig.y };
    const onMove = (ev: PointerEvent) => {
      const d = draggingInstrument.current;
      if (!d) return;
      const nx = d.origX + (ev.clientX - d.startX);
      const ny = d.origY + (ev.clientY - d.startY);
      if (d.kind === "ruler") setRuler((r) => ({ ...r, x: nx, y: ny }));
      else setProtractor((p) => ({ ...p, x: nx, y: ny }));
    };
    const onUp = () => {
      draggingInstrument.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
      {/* Панель инструментов */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/80 p-2">
        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ["pen", "Карандаш", Pencil],
              ["line", "Отрезок", Minus],
              ["compass", "Циркуль", Compass],
              ["rect", "Прямоугольник", Square],
              ["eraser", "Ластик", Eraser],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              title={label}
              className={[
                "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition",
                tool === id
                  ? "border-accent bg-accent text-on-accent shadow-[0_0_12px_var(--glow-soft)]"
                  : "border-transparent text-muted hover:bg-canvas/50 hover:text-ink",
              ].join(" ")}
            >
              <Icon className="size-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Накладные приборы */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowRuler((v) => !v)}
            className={[
              "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition",
              showRuler ? "border-accent bg-accent/20 text-accent" : "border-line text-muted hover:text-ink",
            ].join(" ")}
          >
            <Ruler className="size-3.5" />
            Линейка
          </button>
          <button
            type="button"
            onClick={() => setShowProtractor((v) => !v)}
            className={[
              "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition",
              showProtractor ? "border-accent bg-accent/20 text-accent" : "border-line text-muted hover:text-ink",
            ].join(" ")}
          >
            <Compass className="size-3.5" />
            Транспортир
          </button>

          {/* Фон */}
          <div className="flex items-center gap-1 rounded-xl border border-line bg-canvas/50 p-0.5 text-xs">
            <Grid3x3 className="ml-1.5 size-3.5 text-muted" />
            {(
              [
                ["axes", "Оси"],
                ["grid", "Клетка"],
                ["dots", "Точки"],
                ["blank", "Чистый"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setBgMode(id)}
                className={[
                  "rounded-lg px-2 py-1 transition",
                  bgMode === id ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Цвета, толщина и действия */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={[
                  "size-5 rounded-full border transition",
                  color === c ? "scale-110 border-white ring-2 ring-accent" : "border-white/25",
                ].join(" ")}
                style={{ backgroundColor: c }}
                aria-label={`Цвет ${c}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-line bg-canvas/50 p-0.5 text-xs">
            {[2, 4, 6].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWidth(w)}
                className={[
                  "rounded-lg px-2 py-1",
                  width === w ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {w}px
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShapes((prev) => prev.slice(0, -1))}
              disabled={shapes.length === 0}
              className="grid size-8 place-items-center rounded-xl border border-line text-muted hover:text-ink disabled:opacity-40"
              title="Отменить"
            >
              <Undo2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setShapes([])}
              disabled={shapes.length === 0}
              className="grid size-8 place-items-center rounded-xl border border-line text-muted hover:text-ink disabled:opacity-40"
              title="Очистить доску"
            >
              <Trash2 className="size-4" />
            </button>
            <button
              type="button"
              onClick={savePng}
              className="grid size-8 place-items-center rounded-xl border border-line text-muted hover:border-accent hover:text-ink"
              title="Сохранить как PNG"
            >
              <Download className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Рабочая область холста */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="h-full w-full touch-none crosshair"
          style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
        />

        {/* Перетаскиваемая линейка */}
        {showRuler && (
          <div
            onPointerDown={(e) => startInstrumentDrag("ruler", e)}
            style={{
              left: ruler.x,
              top: ruler.y,
              transform: `rotate(${ruler.angle}deg)`,
            }}
            className="absolute flex h-12 w-[360px] cursor-grab items-start justify-between rounded-lg border border-accent/60 bg-canvas/80 px-2 pt-1 shadow-lg backdrop-blur-md select-none active:cursor-grabbing"
          >
            <div className="flex w-full items-start justify-between font-mono text-[10px] text-ink">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="h-3 w-px bg-accent" />
                  <span>{i}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setRuler((r) => ({ ...r, angle: (r.angle + 15) % 360 }))}
              className="ml-2 grid size-7 shrink-0 place-items-center rounded-md border border-line bg-surface text-accent hover:bg-accent hover:text-on-accent"
              title="Повернуть на 15°"
            >
              <RotateCw className="size-3.5" />
            </button>
          </div>
        )}

        {/* Перетаскиваемый транспортир */}
        {showProtractor && (
          <div
            onPointerDown={(e) => startInstrumentDrag("protractor", e)}
            style={{
              left: protractor.x,
              top: protractor.y,
              transform: `translate(-50%, -50%) rotate(${protractor.angle}deg)`,
            }}
            className="absolute cursor-grab select-none active:cursor-grabbing"
          >
            <svg width="260" height="145" viewBox="0 0 260 145" className="drop-shadow-lg">
              <path
                d="M 10 130 A 120 120 0 0 1 250 130 Z"
                fill="rgba(15, 20, 30, 0.55)"
                stroke="var(--accent)"
                strokeWidth="2"
              />
              <circle cx="130" cy="130" r="4" fill="var(--accent)" />
              {Array.from({ length: 19 }).map((_, idx) => {
                const deg = idx * 10;
                const rad = (deg * Math.PI) / 180;
                const x1 = 130 - Math.cos(rad) * 120;
                const y1 = 130 - Math.sin(rad) * 120;
                const x2 = 130 - Math.cos(rad) * (deg % 30 === 0 ? 104 : 112);
                const y2 = 130 - Math.sin(rad) * (deg % 30 === 0 ? 104 : 112);
                const tx = 130 - Math.cos(rad) * 90;
                const ty = 130 - Math.sin(rad) * 90;
                return (
                  <g key={deg}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--accent)" strokeWidth={deg % 30 === 0 ? 1.5 : 1} />
                    {deg % 30 === 0 && (
                      <text x={tx} y={ty} fill="#fff" fontSize="10" textAnchor="middle" dominantBaseline="middle">
                        {deg}°
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setProtractor((p) => ({ ...p, angle: (p.angle + 15) % 360 }))}
              className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-md border border-line bg-surface text-accent hover:bg-accent hover:text-on-accent"
              title="Повернуть на 15°"
            >
              <RotateCw className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}