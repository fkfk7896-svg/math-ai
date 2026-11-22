"use client";

import { useEffect, useRef } from "react";

type RGB = { r: number; g: number; b: number; a: number };

type Palette = {
  bg0: RGB;
  bg1: RGB;
  bg2: RGB;
  accent: RGB;
  line: RGB;
  brightness: number;
  lineAlpha: number;
  washAlpha: number;
};

type Point = { x: number; y: number };

type Edge = {
  points: Point[];
  length: number;
  alpha: number;
};

type Spark = {
  edge: number;
  t: number;
  dir: 1 | -1;
  speed: number;
  size: number;
};

type Graph = {
  edges: Edge[];
  sparks: Spark[];
};

const FALLBACK: Palette = {
  bg0: { r: 7, g: 4, b: 6, a: 1 },
  bg1: { r: 22, g: 6, b: 12, a: 1 },
  bg2: { r: 58, g: 16, b: 32, a: 1 },
  accent: { r: 255, g: 45, b: 85, a: 1 },
  line: { r: 255, g: 77, b: 109, a: 1 },
  brightness: 0.72,
  lineAlpha: 0.62,
  washAlpha: 0.9,
};

function parseColor(input: string): RGB | null {
  const value = input.trim();
  if (!value) return null;
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    if (hex.length !== 6) return null;
    const parsed = Number.parseInt(hex, 16);
    if (Number.isNaN(parsed)) return null;
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
      a: 1,
    };
  }
  const match = value.match(/rgba?\(([^)]+)\)/i);
  if (!match) return null;
  const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 3 || parts.slice(0, 3).some((part) => Number.isNaN(part))) return null;
  return {
    r: parts[0],
    g: parts[1],
    b: parts[2],
    a: parts.length > 3 && !Number.isNaN(parts[3]) ? parts[3] : 1,
  };
}

function readNumber(styles: CSSStyleDeclaration, name: string, fallback: number) {
  const parsed = Number.parseFloat(styles.getPropertyValue(name));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const pick = (name: string, fallback: RGB) =>
    parseColor(styles.getPropertyValue(name)) ?? fallback;
  return {
    bg0: pick("--bg-0", FALLBACK.bg0),
    bg1: pick("--bg-1", FALLBACK.bg1),
    bg2: pick("--bg-2", FALLBACK.bg2),
    accent: pick("--accent", FALLBACK.accent),
    line: pick("--line", FALLBACK.line),
    brightness: Math.min(1, Math.max(0.2, readNumber(styles, "--bg-brightness", 0.72))),
    lineAlpha: readNumber(styles, "--line-alpha", 0.55),
    washAlpha: readNumber(styles, "--wash-alpha", 0.85),
  };
}

function lerpChannel(current: number, target: number, amount: number) {
  return current + (target - current) * amount;
}

function lerpPalette(current: Palette, target: Palette, amount: number) {
  const keys = ["bg0", "bg1", "bg2", "accent", "line"] as const;
  for (const key of keys) {
    current[key].r = lerpChannel(current[key].r, target[key].r, amount);
    current[key].g = lerpChannel(current[key].g, target[key].g, amount);
    current[key].b = lerpChannel(current[key].b, target[key].b, amount);
    current[key].a = lerpChannel(current[key].a, target[key].a, amount);
  }
  current.brightness = lerpChannel(current.brightness, target.brightness, amount);
  current.lineAlpha = lerpChannel(current.lineAlpha, target.lineAlpha, amount);
  current.washAlpha = lerpChannel(current.washAlpha, target.washAlpha, amount);
}

function rgba(color: RGB, alpha: number) {
  const safe = Math.max(0, Math.min(1, alpha));
  return `rgba(${color.r | 0}, ${color.g | 0}, ${color.b | 0}, ${safe})`;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
    a: 1,
  };
}

function luminance(color: RGB) {
  return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
}

function polylineLength(points: Point[]) {
  let length = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    length += Math.hypot(
      points[index + 1].x - points[index].x,
      points[index + 1].y - points[index].y,
    );
  }
  return length;
}

function pointAlong(points: Point[], length: number, t: number): Point | null {
  if (t < 0 || t > 1) return null;
  let remaining = t * length;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const segment = Math.hypot(end.x - start.x, end.y - start.y);
    if (remaining <= segment || index === points.length - 2) {
      const progress = segment === 0 ? 0 : remaining / segment;
      return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
      };
    }
    remaining -= segment;
  }
  return points[points.length - 1] ?? null;
}

function buildGraph(width: number, height: number): Graph {
  const cols = Math.max(4, Math.round(width / 230));
  const rows = Math.max(3, Math.round(height / 190));
  const nodes: Point[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (Math.random() < 0.16) continue;
      nodes.push({
        x: ((col + 0.5) / cols) * width + (Math.random() - 0.5) * 40,
        y: ((row + 0.5) / rows) * height + (Math.random() - 0.5) * 32,
      });
    }
  }

  const edges: Edge[] = [];
  const seen = new Set<string>();
  const threshold = Math.min(width, height) * 0.34;

  const pushEdge = (points: Point[], alpha = 0.45 + Math.random() * 0.55) => {
    const length = polylineLength(points);
    if (length < 28) return;
    edges.push({ points, length, alpha });
  };

  for (let i = 0; i < nodes.length; i += 1) {
    const nearest: Array<{ j: number; d: number }> = [];
    for (let j = i + 1; j < nodes.length; j += 1) {
      const distance = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (distance < threshold) nearest.push({ j, d: distance });
    }
    nearest.sort((a, b) => a.d - b.d);
    const count = nearest.length > 2 && Math.random() < 0.5 ? 2 : 1;
    for (let k = 0; k < Math.min(count, nearest.length); k += 1) {
      const j = nearest[k].j;
      const key = `${i}-${j}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const a = nodes[i];
      const b = nodes[j];
      if (Math.random() < 0.64) {
        const mid =
          Math.random() < 0.5 ? { x: b.x, y: a.y } : { x: a.x, y: b.y };
        pushEdge([a, mid, b]);
      } else {
        pushEdge([a, b], 0.28 + Math.random() * 0.4);
      }
    }
  }

  const buses = Math.max(2, Math.round(height / 360));
  for (let index = 0; index < buses; index += 1) {
    const y = ((index + 1) / (buses + 1)) * height + (Math.random() - 0.5) * 24;
    pushEdge(
      [
        { x: width * 0.04, y },
        { x: width * 0.96, y },
      ],
      0.22 + Math.random() * 0.2,
    );
  }

  const sparks: Spark[] = [];
  edges.forEach((edge, index) => {
    if (Math.random() > 0.62) return;
    const fast = Math.random() < 0.18;
    sparks.push({
      edge: index,
      t: Math.random(),
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: fast ? 90 + Math.random() * 70 : 36 + Math.random() * 48,
      size: fast ? 2.4 : 1.6 + Math.random() * 0.8,
    });
  });

  return { edges, sparks };
}

function drawWash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: Palette,
  time: number,
) {
  const intensity = palette.brightness * palette.washAlpha;
  ctx.globalAlpha = 1;
  ctx.fillStyle = rgba(palette.bg0, 1);
  ctx.fillRect(0, 0, width, height);

  const blobs = [
    {
      x: width * (0.16 + Math.sin(time * 0.07) * 0.04),
      y: height * (0.18 + Math.cos(time * 0.05) * 0.03),
      radius: Math.max(width, height) * 0.52,
      color: palette.bg2,
      alpha: 0.95 * intensity,
    },
    {
      x: width * (0.82 + Math.cos(time * 0.06) * 0.035),
      y: height * (0.78 + Math.sin(time * 0.045) * 0.03),
      radius: Math.max(width, height) * 0.58,
      color: palette.bg1,
      alpha: 0.9 * intensity,
    },
    {
      x: width * (0.78 + Math.sin(time * 0.04) * 0.03),
      y: height * (0.16 + Math.cos(time * 0.055) * 0.025),
      radius: Math.max(width, height) * 0.28,
      color: palette.accent,
      alpha: 0.14 * intensity,
    },
    {
      x: width * (0.2 + Math.cos(time * 0.05) * 0.03),
      y: height * (0.84 + Math.sin(time * 0.04) * 0.02),
      radius: Math.max(width, height) * 0.24,
      color: palette.accent,
      alpha: 0.09 * intensity,
    },
  ];

  for (const blob of blobs) {
    const gradient = ctx.createRadialGradient(
      blob.x,
      blob.y,
      0,
      blob.x,
      blob.y,
      blob.radius,
    );
    gradient.addColorStop(0, rgba(blob.color, blob.alpha));
    gradient.addColorStop(1, rgba(blob.color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
}

function strokeEdge(
  ctx: CanvasRenderingContext2D,
  edge: Edge,
  color: string,
  width: number,
) {
  ctx.beginPath();
  ctx.moveTo(edge.points[0].x, edge.points[0].y);
  for (let index = 1; index < edge.points.length; index += 1) {
    ctx.lineTo(edge.points[index].x, edge.points[index].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawCircuit(
  ctx: CanvasRenderingContext2D,
  graph: Graph,
  palette: Palette,
  fade: number,
  dt: number,
) {
  if (fade < 0.01) return;
  const strength = fade * palette.brightness * palette.lineAlpha;
  const lightBackground = luminance(palette.bg0) > 0.6;
  const core = lightBackground ? palette.line : mix(palette.line, { r: 255, g: 255, b: 255, a: 1 }, 0.72);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const edge of graph.edges) {
    strokeEdge(ctx, edge, rgba(palette.line, 0.16 * edge.alpha * strength), 3.2);
    strokeEdge(ctx, edge, rgba(palette.line, 0.55 * edge.alpha * strength), 1.05);
  }

  ctx.fillStyle = rgba(palette.line, 0.7 * strength);
  for (const edge of graph.edges) {
    for (const point of edge.points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const spark of graph.sparks) {
    const edge = graph.edges[spark.edge];
    if (!edge) continue;
    spark.t += (spark.dir * spark.speed * dt) / edge.length;
    if (spark.t > 1) spark.t -= 1;
    if (spark.t < 0) spark.t += 1;

    for (let step = 5; step >= 0; step -= 1) {
      const distance = step * 12;
      const t = spark.t - spark.dir * (distance / edge.length);
      const point = pointAlong(edge.points, edge.length, t);
      if (!point) continue;
      const head = step === 0;
      ctx.beginPath();
      ctx.fillStyle = rgba(
        head ? core : palette.line,
        (head ? 0.95 : 0.08 + (5 - step) * 0.07) * strength,
      );
      ctx.arc(point.x, point.y, head ? spark.size * 1.7 : spark.size * (1.15 - step * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;

    let width = 0;
    let height = 0;
    let graph: Graph | null = null;
    let frame = 0;
    let running = true;
    let lineFade = document.documentElement.dataset.lines === "off" ? 0 : 1;
    let last = performance.now();
    const palette = readPalette();

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(rect.width));
      const nextHeight = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(nextWidth * dpr);
      canvas.height = Math.floor(nextHeight * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (Math.abs(nextWidth - width) > 2 || Math.abs(nextHeight - height) > 2) {
        width = nextWidth;
        height = nextHeight;
        graph = buildGraph(width, height);
      }
    };

    const tick = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      lerpPalette(palette, readPalette(), 0.08);
      const fadeTarget = document.documentElement.dataset.lines === "off" ? 0 : 1;
      lineFade += (fadeTarget - lineFade) * 0.08;
      if (Math.abs(lineFade - fadeTarget) < 0.004) lineFade = fadeTarget;

      if (width > 0 && height > 0) {
        drawWash(context, width, height, palette, now / 1000);
        if (graph) drawCircuit(context, graph, palette, lineFade, dt);
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    frame = requestAnimationFrame(tick);
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
        return;
      }
      if (!running) {
        running = true;
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,var(--bg-0)_100%)] opacity-80" />
    </div>
  );
}
