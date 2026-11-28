'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Crosshair,
  Shield,
  Magnet,
  Zap,
  Star,
  ChevronRight,
  Map,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Terminal,
  Sparkles,
  FastForward,
  Lock,
  Eye,
} from 'lucide-react';

// ============================================================================
// 1. TYPES & DATA STRUCTURES
// ============================================================================

export type MathMode = 'LINE_EQUATION' | 'NORMAL_VECTOR' | 'ANGLE_POINT';

export interface Vec2 {
  x: number;
  y: number;
}

export interface WallRect {
  x: number; // Left edge in world coordinates
  y: number; // Bottom edge in world coordinates
  w: number; // Width
  h: number; // Height
}

export interface BonusNode {
  id: string;
  x: number;
  y: number;
  radius?: number;
}

export interface BoostRing {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface ReflectorParams {
  // LINE_EQUATION: y = k * x + b, centered at x = cx
  k: number;
  b: number;
  cx: number;
  // NORMAL_VECTOR: normal n = (nx, ny), centered at (px, py)
  nx: number;
  ny: number;
  // ANGLE_POINT: inclination angle in degrees, centered at (px, py)
  angle: number;
  // Shared anchor point for NORMAL_VECTOR & ANGLE_POINT
  px: number;
  py: number;
}

export interface ReflectorSegment {
  id: string;
  p1: Vec2;
  p2: Vec2;
  center: Vec2;
  normal: Vec2; // Unit normal
  formulaLabel: string;
  active: boolean; // Armed on field
}

export interface LevelConfig {
  id: number;
  code: string;
  title: string;
  topic: string;
  mathMode: MathMode;
  maxBounces: number;
  start: Vec2;
  velocity: Vec2;
  portal: { x: number; y: number; radius: number };
  walls: WallRect[];
  bonuses: BonusNode[];
  boostRings: BoostRing[];
  hint: string;
  initialParams: Partial<ReflectorParams>;
}

interface LevelProgress {
  stars: number; // 0..3
  bestScore: number;
  cleared: boolean;
}

interface SavedState {
  levels: Record<number, LevelProgress>;
  unlockedLevel: number;
  powerUps: {
    scan: number;
    phase: number;
    magnet: number;
  };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

// ============================================================================
// 2. ESCALATING LEVEL CONFIGURATIONS (EXPANDABLE TO 12+ LECTURE LEVELS)
// ============================================================================

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    code: 'SEC-01',
    title: 'LINEAR REFLECTION',
    topic: 'LEC 01 // Slope-Intercept Reflectors (y = kx + b)',
    mathMode: 'LINE_EQUATION',
    maxBounces: 1,
    start: { x: -7, y: -2 },
    velocity: { x: 5, y: 0 },
    portal: { x: 2, y: 4, radius: 0.65 },
    walls: [
      { x: 4.6, y: -4.2, w: 0.6, h: 8.4 },
      { x: -4.2, y: 0.5, w: 0.6, h: 4.2 },
    ],
    bonuses: [{ id: 'l1-b1', x: 2, y: 1.5 }],
    boostRings: [],
    hint: 'The orb travels horizontally along y = -2. To reflect it straight UP along x = 2 through the Data Node (2, 1.5) into the portal (2, 4), place a 45° mirror (k = 1) passing through (2, -2). Solve -2 = 1(2) + b → b = -4, with Center X = 2.',
    initialParams: { k: 0.5, b: -1, cx: 0 },
  },
  {
    id: 2,
    code: 'SEC-02',
    title: 'ORTHOGONAL NORMALS',
    topic: 'LEC 02 // Normal Vector Reflection (r = v - 2(v·n̂)n̂)',
    mathMode: 'NORMAL_VECTOR',
    maxBounces: 1,
    start: { x: -7, y: 3 },
    velocity: { x: 4, y: -4 },
    portal: { x: 5, y: 3, radius: 0.65 },
    walls: [
      { x: -0.3, y: 0.6, w: 0.6, h: 4.8 },
      { x: -4.5, y: -5.3, w: 9.0, h: 0.5 },
    ],
    bonuses: [{ id: 'l2-b1', x: 3, y: 1 }],
    boostRings: [],
    hint: 'Moving at v = (4, -4) from (-7, 3), the orb passes through (-1, -3). Reflecting across a horizontal surface (normal n = (0, 1)) flips vy to +4, sending the orb along (4, 4) right through the Data Node (3, 1) into (5, 3).',
    initialParams: { nx: 1, ny: 1, px: -1, py: -2 },
  },
  {
    id: 3,
    code: 'SEC-03',
    title: 'ANGULAR INCIDENCE',
    topic: 'LEC 03 // Multi-Bounce & Boost Ring Kinematics',
    mathMode: 'ANGLE_POINT',
    maxBounces: 2,
    start: { x: -7, y: -4 },
    velocity: { x: 5, y: 0 },
    portal: { x: 7, y: 4, radius: 0.65 },
    walls: [
      { x: 1.5, y: -4.8, w: 0.65, h: 7.0 },
      { x: -4.4, y: -1.6, w: 0.65, h: 6.6 },
    ],
    bonuses: [{ id: 'l3-b1', x: 3, y: 4 }],
    boostRings: [{ id: 'l3-r1', x: -1, y: 0, radius: 0.85 }],
    hint: 'Bounce 1: Place a 45° reflector at (-1, -4) to redirect the orb straight UP through the Boost Ring at (-1, 0). Bounce 2: During mid-flight pause, place another 45° reflector at (-1, 4) to fire right through (3, 4) into the portal.',
    initialParams: { angle: 30, px: -1, py: -4 },
  },
  {
    id: 4,
    code: 'SEC-04',
    title: 'COMPOUND EQUATIONS',
    topic: 'LEC 04 // Chained Linear Reflectors & Dual Nodes',
    mathMode: 'LINE_EQUATION',
    maxBounces: 2,
    start: { x: -7, y: 4 },
    velocity: { x: 0, y: -5 },
    portal: { x: 6, y: 4, radius: 0.65 },
    walls: [
      { x: -3.8, y: -0.9, w: 7.4, h: 0.7 },
      { x: -4.4, y: -0.9, w: 0.65, h: 5.7 },
      { x: 8.1, y: -4.6, w: 0.6, h: 9.2 },
    ],
    bonuses: [
      { id: 'l4-b1', x: -2, y: -3 },
      { id: 'l4-b2', x: 6, y: 1 },
    ],
    boostRings: [{ id: 'l4-r1', x: 2, y: -3, radius: 0.85 }],
    hint: 'Bounce 1: Reflect downward velocity v=(0,-5) right along y = -3 using k = -1, b = -10, cx = -7. Bounce 2: After the Boost Ring, reflect upward along x = 6 using k = 1, b = -9, cx = 6.',
    initialParams: { k: -0.5, b: -6, cx: -7 },
  },
  {
    id: 5,
    code: 'SEC-05',
    title: 'TRIPLE PROTOCOL',
    topic: 'LEC 05 // 3-Stage Tactical Ricochet Synthesis',
    mathMode: 'ANGLE_POINT',
    maxBounces: 3,
    start: { x: -8, y: 4 },
    velocity: { x: 5, y: 0 },
    portal: { x: 6, y: 4, radius: 0.65 },
    walls: [
      { x: 0.5, y: 0.6, w: 0.7, h: 4.9 },
      { x: -6.0, y: -5.4, w: 0.7, h: 6.8 },
      { x: 2.8, y: -1.8, w: 0.7, h: 5.2 },
    ],
    bonuses: [
      { id: 'l5-b1', x: -2, y: 0 },
      { id: 'l5-b2', x: 6, y: 0.5 },
    ],
    boostRings: [{ id: 'l5-r1', x: 2, y: -4, radius: 0.85 }],
    hint: 'Stage 1: Place -45° (or 135°) at (-2, 4) to dive down through (-2, 0). Stage 2: Place -45° at (-2, -4) to shoot right through the Boost Ring (2, -4). Stage 3: Place 45° at (6, -4) to ascend through (6, 0.5) into (6, 4).',
    initialParams: { angle: -30, px: -2, py: 4 },
  },
];

// ============================================================================
// 3. CONSTANTS & MATH UTILITIES
// ============================================================================

const WORLD_X_MIN = -10;
const WORLD_X_MAX = 10;
const WORLD_Y_MIN = -6;
const WORLD_Y_MAX = 6;
const WORLD_WIDTH = WORLD_X_MAX - WORLD_X_MIN; // 20
const WORLD_HEIGHT = WORLD_Y_MAX - WORLD_Y_MIN; // 12
const ORB_RADIUS = 0.28;
const REFLECTOR_LENGTH = 3.2;
const STORAGE_KEY = 'vector_ricochet_protocol_v1';

const DEFAULT_PARAMS: ReflectorParams = {
  k: 1,
  b: 0,
  cx: 0,
  nx: 0,
  ny: 1,
  angle: 45,
  px: 0,
  py: 0,
};

const DEFAULT_SAVED_STATE: SavedState = {
  levels: {},
  unlockedLevel: 1,
  powerUps: { scan: 2, phase: 2, magnet: 2 },
};

function createInitialEmbers(): Ember[] {
  return Array.from({ length: 34 }, (_, i) => {
    const s1 = ((i * 73 + 19) % 97) / 97;
    const s2 = ((i * 41 + 53) % 89) / 89;
    const s3 = ((i * 29 + 11) % 83) / 83;
    const s4 = ((i * 61 + 7) % 79) / 79;
    return {
      x: WORLD_X_MIN + s1 * WORLD_WIDTH,
      y: WORLD_Y_MIN + s2 * WORLD_HEIGHT,
      vx: (s3 - 0.5) * 0.25,
      vy: 0.15 + s4 * 0.35,
      size: 1 + s3 * 2.2,
      alpha: 0.12 + s4 * 0.35,
    };
  });
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len < 1e-6) return { x: 0, y: 1 };
  return { x: v.x / len, y: v.y / len };
}

/** Exact vector reflection: r = v - 2 * dot(v, n_hat) * n_hat */
function reflectVector(v: Vec2, nHat: Vec2): Vec2 {
  const d = dot(v, nHat);
  return {
    x: v.x - 2 * d * nHat.x,
    y: v.y - 2 * d * nHat.y,
  };
}

/** Construct a reflector segment from the active math mode parameters */
function buildReflector(
  mode: MathMode,
  params: ReflectorParams,
  id: string,
  active: boolean
): ReflectorSegment {
  const halfLen = REFLECTOR_LENGTH / 2;
  let center: Vec2;
  let dir: Vec2;
  let normal: Vec2;
  let formulaLabel: string;

  if (mode === 'LINE_EQUATION') {
    const k = Number.isFinite(params.k) ? params.k : 0;
    const b = Number.isFinite(params.b) ? params.b : 0;
    const cx = Number.isFinite(params.cx) ? params.cx : 0;
    center = { x: cx, y: k * cx + b };
    dir = normalize({ x: 1, y: k });
    normal = normalize({ x: -k, y: 1 });
    const bSign = b >= 0 ? '+' : '-';
    formulaLabel = `y = ${k.toFixed(2)}x ${bSign} ${Math.abs(b).toFixed(2)}`;
  } else if (mode === 'NORMAL_VECTOR') {
    const nx = Number.isFinite(params.nx) ? params.nx : 0;
    const ny = Number.isFinite(params.ny) ? params.ny : 1;
    normal = normalize(Math.hypot(nx, ny) < 1e-4 ? { x: 0, y: 1 } : { x: nx, y: ny });
    dir = { x: -normal.y, y: normal.x };
    center = { x: params.px, y: params.py };
    formulaLabel = `n = (${nx.toFixed(1)}, ${ny.toFixed(1)}) @ (${params.px.toFixed(1)}, ${params.py.toFixed(1)})`;
  } else {
    const rad = (params.angle * Math.PI) / 180;
    dir = { x: Math.cos(rad), y: Math.sin(rad) };
    normal = { x: -Math.sin(rad), y: Math.cos(rad) };
    center = { x: params.px, y: params.py };
    formulaLabel = `θ = ${params.angle.toFixed(1)}° @ (${params.px.toFixed(1)}, ${params.py.toFixed(1)})`;
  }

  return {
    id,
    center,
    normal,
    p1: { x: center.x - dir.x * halfLen, y: center.y - dir.y * halfLen },
    p2: { x: center.x + dir.x * halfLen, y: center.y + dir.y * halfLen },
    formulaLabel,
    active,
  };
}

/** Closest point on segment AB to point P */
function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 1e-8) return a;
  const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq, 0, 1);
  return { x: a.x + t * abx, y: a.y + t * aby };
}

/** Ray vs Segment intersection for Laser Scan preview */
function raySegmentIntersect(
  origin: Vec2,
  dir: Vec2,
  a: Vec2,
  b: Vec2
): { t: number; point: Vec2 } | null {
  const v1x = origin.x - a.x;
  const v1y = origin.y - a.y;
  const v2x = b.x - a.x;
  const v2y = b.y - a.y;
  const v3x = -dir.y;
  const v3y = dir.x;

  const denom = v2x * v3x + v2y * v3y;
  if (Math.abs(denom) < 1e-6) return null;

  const t1 = (v2x * v1y - v2y * v1x) / denom;
  const t2 = (v1x * v3x + v1y * v3y) / denom;

  if (t1 > 0.05 && t2 >= 0 && t2 <= 1) {
    return {
      t: t1,
      point: { x: origin.x + dir.x * t1, y: origin.y + dir.y * t1 },
    };
  }
  return null;
}

/** Circle vs Axis-Aligned Rectangle collision with normal */
function circleRectCollision(
  c: Vec2,
  r: number,
  rect: WallRect
): { hit: boolean; normal: Vec2; penetration: number } {
  const closestX = clamp(c.x, rect.x, rect.x + rect.w);
  const closestY = clamp(c.y, rect.y, rect.y + rect.h);
  const dx = c.x - closestX;
  const dy = c.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq >= r * r) {
    return { hit: false, normal: { x: 0, y: 1 }, penetration: 0 };
  }

  const dist = Math.sqrt(distSq);
  if (dist > 1e-5) {
    return {
      hit: true,
      normal: { x: dx / dist, y: dy / dist },
      penetration: r - dist,
    };
  }

  // Fallback if center is inside rect
  const left = Math.abs(c.x - rect.x);
  const right = Math.abs(rect.x + rect.w - c.x);
  const bottom = Math.abs(c.y - rect.y);
  const top = Math.abs(rect.y + rect.h - c.y);
  const minD = Math.min(left, right, bottom, top);
  if (minD === left) return { hit: true, normal: { x: -1, y: 0 }, penetration: r };
  if (minD === right) return { hit: true, normal: { x: 1, y: 0 }, penetration: r };
  if (minD === bottom) return { hit: true, normal: { x: 0, y: -1 }, penetration: r };
  return { hit: true, normal: { x: 0, y: 1 }, penetration: r };
}

// ============================================================================
// 4. PROCEDURAL WEB AUDIO SYNTHESIZER (ZERO EXTERNAL AUDIO FILES)
// ============================================================================

class TacticalSynth {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** Punchy bass pulse + crisp transient on ricochet */
  playRicochet() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Sub-bass punch
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.16);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);

    // Metallic harmonic ping
    const ping = ctx.createOscillator();
    const pingGain = ctx.createGain();
    ping.type = 'triangle';
    ping.frequency.setValueAtTime(920, now);
    ping.frequency.exponentialRampToValueAtTime(340, now + 0.08);
    pingGain.gain.setValueAtTime(0.14, now);
    pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    ping.connect(pingGain);
    pingGain.connect(ctx.destination);
    ping.start(now);
    ping.stop(now + 0.1);
  }

  /** Crystalline chime on Data Node bonus pickup */
  playBonus() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const freqs = [880, 1318.5, 1760];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  /** High-energy whoosh on Boost Ring */
  playBoost() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.25);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.25);
    filter.Q.value = 3;

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Low distortion thud on armored wall collision */
  playWallHit() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const shaper = ctx.createWaveShaper();
    const gain = ctx.createGain();

    // Soft clipping curve for gritty distortion
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((3 + 18) * x * 20 * (Math.PI / 180)) / (Math.PI + 18 * Math.abs(x));
    }
    shaper.curve = curve;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.24);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  /** Rising sci-fi chord on level victory */
  playVictory() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [261.63, 392.0, 493.88, 587.33, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    });
  }

  /** Subtle tactical UI click */
  playClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.03);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }

  /** Power-up activation chime */
  playPowerUp() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(1100, now + 0.16);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

const synth = new TacticalSynth();

// ============================================================================
// 5. LOCAL STORAGE HELPERS
// ============================================================================

function loadSavedState(): SavedState {
  if (typeof window === 'undefined') return DEFAULT_SAVED_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SAVED_STATE;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    return {
      levels: parsed.levels ?? {},
      unlockedLevel: Math.max(1, parsed.unlockedLevel ?? 1),
      powerUps: {
        scan: parsed.powerUps?.scan ?? 2,
        phase: parsed.powerUps?.phase ?? 2,
        magnet: parsed.powerUps?.magnet ?? 2,
      },
    };
  } catch {
    return DEFAULT_SAVED_STATE;
  }
}

function saveState(state: SavedState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}

// ============================================================================
// 6. REUSABLE TACTICAL UI SUB-COMPONENTS
// ============================================================================

const HudBrackets: React.FC<{ color?: string }> = ({ color = '#ff1e42' }) => (
  <>
    <span
      className="pointer-events-none absolute top-0 left-0 h-2.5 w-2.5 border-t-2 border-l-2"
      style={{ borderColor: color }}
    />
    <span
      className="pointer-events-none absolute top-0 right-0 h-2.5 w-2.5 border-t-2 border-r-2"
      style={{ borderColor: color }}
    />
    <span
      className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b-2 border-l-2"
      style={{ borderColor: color }}
    />
    <span
      className="pointer-events-none absolute right-0 bottom-0 h-2.5 w-2.5 border-r-2 border-b-2"
      style={{ borderColor: color }}
    />
  </>
);

interface ParamSliderProps {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  onChange: (val: number) => void;
}

const ParamControl: React.FC<ParamSliderProps> = ({
  label,
  symbol,
  value,
  min,
  max,
  step,
  unit = '',
  disabled = false,
  onChange,
}) => {
  const adjust = (delta: number) => {
    const next = Math.round((value + delta) * 100) / 100;
    onChange(clamp(next, min, max));
  };

  return (
    <div className="space-y-1.5 rounded border border-[#ff1e42]/25 bg-[#12060a]/80 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex h-5 min-w-[24px] items-center justify-center rounded bg-[#ff1e42]/20 px-1.5 font-mono text-xs font-bold text-[#ff4d6d]">
            {symbol}
          </span>
          <span className="text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => adjust(-step)}
            className="flex h-6 w-6 items-center justify-center rounded border border-[#ff1e42]/30 bg-[#3b0712]/60 font-mono text-xs text-zinc-200 transition hover:border-[#ff1e42] hover:bg-[#ff1e42]/25 disabled:opacity-40"
            aria-label={`Decrease ${label}`}
          >
            -
          </button>
          <input
            type="number"
            disabled={disabled}
            value={Number.isFinite(value) ? value : 0}
            step={step}
            min={min}
            max={max}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) onChange(clamp(v, min, max));
            }}
            className="w-16 rounded border border-[#ff1e42]/40 bg-[#070305] px-1.5 py-0.5 text-center font-mono text-xs font-semibold text-white outline-none focus:border-[#ff4d6d] focus:ring-1 focus:ring-[#ff1e42]/50 disabled:opacity-50"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => adjust(step)}
            className="flex h-6 w-6 items-center justify-center rounded border border-[#ff1e42]/30 bg-[#3b0712]/60 font-mono text-xs text-zinc-200 transition hover:border-[#ff1e42] hover:bg-[#ff1e42]/25 disabled:opacity-40"
            aria-label={`Increase ${label}`}
          >
            +
          </button>
          {unit && <span className="ml-0.5 font-mono text-[11px] text-zinc-400">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={clamp(Number.isFinite(value) ? value : 0, min, max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="vrp-slider w-full cursor-pointer disabled:opacity-40"
      />
    </div>
  );
};

// ============================================================================
// 7. MAIN COMPONENT: VECTOR RICOCHET // PROTOCOL
// ============================================================================

export default function VectorRicochetGame() {
  // --- Persistent Progress ---
  const [saved, setSaved] = useState<SavedState>(() => loadSavedState());
  const [muted, setMuted] = useState(false);

  // --- Screens & Overlays ---
  const [screen, setScreen] = useState<'START' | 'MAP' | 'PLAY'>('START');
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // --- Gameplay React UI State ---
  const [phase, setPhase] = useState<'PAUSED' | 'RUNNING' | 'FAILED' | 'VICTORY'>('PAUSED');
  const [failReason, setFailReason] = useState<string>('');
  const [attempts, setAttempts] = useState(1);
  const [bouncesUsed, setBouncesUsed] = useState(0);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [collectedBonusIds, setCollectedBonusIds] = useState<string[]>([]);
  const [hoverCoord, setHoverCoord] = useState<Vec2 | null>(null);
  const [orbTelemetry, setOrbTelemetry] = useState<{ pos: Vec2; vel: Vec2 }>({
    pos: LEVELS[0].start,
    vel: LEVELS[0].velocity,
  });

  // --- Tactical Power-Up Active States ---
  const [scanRemaining, setScanRemaining] = useState(0);
  const [phaseShieldActive, setPhaseShieldActive] = useState(false);
  const [graviLockActive, setGraviLockActive] = useState(false);

  // --- Victory Modal Animated Tally ---
  const [victoryStats, setVictoryStats] = useState<{
    totalScore: number;
    stars: number;
    firstTry: boolean;
    allBonuses: boolean;
    replenished: boolean;
  } | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  // --- Math Control Panel Parameters ---
  const [params, setParams] = useState<ReflectorParams>({
    ...DEFAULT_PARAMS,
    ...LEVELS[0].initialParams,
  });

  const level = LEVELS[currentLevelIdx];

  // --- Mutable Physics & VFX Engine Ref (60fps loop without React re-render overhead) ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const simRef = useRef<{
    phase: 'PAUSED' | 'RUNNING' | 'FAILED' | 'VICTORY';
    orb: { x: number; y: number; vx: number; vy: number };
    trail: { x: number; y: number; boosted: boolean }[];
    reflectors: ReflectorSegment[];
    previewReflector: ReflectorSegment;
    collectedBonuses: Set<string>;
    triggeredBoosts: Set<string>;
    boosted: boolean;
    bouncesUsed: number;
    combo: number;
    score: number;
    attempts: number;
    // VFX timers
    hitStopTimer: number;
    pauseDelayTimer: number;
    shakeTimer: number;
    shakeIntensity: number;
    glitchTimer: number;
    scanTimer: number;
    phaseShield: boolean;
    graviLock: boolean;
    lastReflectorId: string | null;
    reflectorCooldown: number;
    particles: Particle[];
    shockwaves: Shockwave[];
    embers: Ember[];
    time: number;
    // Cached canvas transform for pointer coordinate conversion
    scale: number;
    offsetX: number;
    offsetY: number;
  }>({
    phase: 'PAUSED',
    orb: { x: -7, y: -2, vx: 5, vy: 0 },
    trail: [],
    reflectors: [],
    previewReflector: buildReflector(
      'LINE_EQUATION',
      { ...DEFAULT_PARAMS, ...LEVELS[0].initialParams },
      'preview',
      false
    ),
    collectedBonuses: new Set(),
    triggeredBoosts: new Set(),
    boosted: false,
    bouncesUsed: 0,
    combo: 0,
    score: 0,
    attempts: 1,
    hitStopTimer: 0,
    pauseDelayTimer: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    glitchTimer: 0,
    scanTimer: 0,
    phaseShield: false,
    graviLock: false,
    lastReflectorId: null,
    reflectorCooldown: 0,
    particles: [],
    shockwaves: [],
    embers: createInitialEmbers(),
    time: 0,
    scale: 40,
    offsetX: 400,
    offsetY: 240,
  });

  // Sync mute state to audio engine
  useEffect(() => {
    synth.muted = muted;
  }, [muted]);

  // Sync preview reflector whenever parameters or level change
  useEffect(() => {
    simRef.current.previewReflector = buildReflector(
      level.mathMode,
      params,
      `preview-${bouncesUsed}`,
      false
    );
  }, [level.mathMode, params, bouncesUsed]);

  // Victory score tallying animation
  useEffect(() => {
    if (!victoryStats) return;
    let raf = 0;
    const start = performance.now();
    const duration = 950;
    const target = victoryStats.totalScore;
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [victoryStats]);

  // --- Initialize / Reset Level ---
  const initLevel = useCallback((idx: number, keepAttempts = false) => {
    const lvl = LEVELS[idx];
    const nextParams: ReflectorParams = { ...DEFAULT_PARAMS, ...lvl.initialParams };
    const nextAttempts = keepAttempts ? simRef.current.attempts + 1 : 1;

    setCurrentLevelIdx(idx);
    setParams(nextParams);
    setPhase('PAUSED');
    setFailReason('');
    setAttempts(nextAttempts);
    setBouncesUsed(0);
    setCombo(0);
    setScore(0);
    setMultiplier(1);
    setCollectedBonusIds([]);
    setScanRemaining(0);
    setPhaseShieldActive(false);
    setGraviLockActive(false);
    setVictoryStats(null);
    setDisplayScore(0);
    setShowHint(false);
    setOrbTelemetry({ pos: lvl.start, vel: lvl.velocity });

    const s = simRef.current;
    s.phase = 'PAUSED';
    s.orb = { x: lvl.start.x, y: lvl.start.y, vx: lvl.velocity.x, vy: lvl.velocity.y };
    s.trail = [];
    s.reflectors = [];
    s.previewReflector = buildReflector(lvl.mathMode, nextParams, 'preview-0', false);
    s.collectedBonuses = new Set();
    s.triggeredBoosts = new Set();
    s.boosted = false;
    s.bouncesUsed = 0;
    s.combo = 0;
    s.score = 0;
    s.attempts = nextAttempts;
    s.hitStopTimer = 0;
    s.pauseDelayTimer = 0;
    s.shakeTimer = 0;
    s.glitchTimer = 0;
    s.scanTimer = 0;
    s.phaseShield = false;
    s.graviLock = false;
    s.lastReflectorId = null;
    s.reflectorCooldown = 0;
    s.particles = [];
    s.shockwaves = [];
  }, []);

  // --- Spawn VFX Helpers ---
  const spawnSparks = useCallback((x: number, y: number, color: string, count = 20, speed = 5.5) => {
    const s = simRef.current;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.9) * speed;
      s.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
  }, []);

  const spawnShockwave = useCallback((x: number, y: number, color: string, maxRadius = 2.2) => {
    simRef.current.shockwaves.push({
      x,
      y,
      radius: 0.15,
      maxRadius,
      life: 0.42,
      maxLife: 0.42,
      color,
    });
  }, []);

  // --- Actions: Deploy & Launch / Resume ---
  const handleEngage = useCallback(
    (placeReflector: boolean) => {
      const s = simRef.current;
      if (s.phase !== 'PAUSED') return;
      synth.playClick();

      if (placeReflector && s.bouncesUsed < level.maxBounces) {
        const armed = buildReflector(
          level.mathMode,
          params,
          `ref-${Date.now()}-${s.reflectors.length}`,
          true
        );
        s.reflectors.push(armed);
      }

      s.phase = 'RUNNING';
      s.scanTimer = 0;
      setScanRemaining(0);
      setPhase('RUNNING');
    },
    [level.mathMode, level.maxBounces, params]
  );

  // --- Power-Up Activators ---
  const activatePowerUp = useCallback(
    (type: 'scan' | 'phase' | 'magnet') => {
      if (phase === 'VICTORY' || phase === 'FAILED') return;
      if (saved.powerUps[type] <= 0) return;

      if (type === 'scan' && (phase !== 'PAUSED' || scanRemaining > 0)) return;
      if (type === 'phase' && phaseShieldActive) return;
      if (type === 'magnet' && graviLockActive) return;

      synth.playPowerUp();
      const nextSaved: SavedState = {
        ...saved,
        powerUps: {
          ...saved.powerUps,
          [type]: saved.powerUps[type] - 1,
        },
      };
      setSaved(nextSaved);
      saveState(nextSaved);

      if (type === 'scan') {
        simRef.current.scanTimer = 2.0;
        setScanRemaining(2.0);
      } else if (type === 'phase') {
        simRef.current.phaseShield = true;
        setPhaseShieldActive(true);
      } else if (type === 'magnet') {
        simRef.current.graviLock = true;
        setGraviLockActive(true);
      }
    },
    [phase, saved, scanRemaining, phaseShieldActive, graviLockActive]
  );

  // --- Victory Handler ---
  const triggerVictory = useCallback(() => {
    const s = simRef.current;
    s.phase = 'VICTORY';
    setPhase('VICTORY');
    synth.playVictory();
    spawnShockwave(level.portal.x, level.portal.y, '#ffffff', 3.4);
    spawnShockwave(level.portal.x, level.portal.y, '#ff1e42', 2.6);
    spawnSparks(level.portal.x, level.portal.y, '#ffffff', 28, 7);
    spawnSparks(level.portal.x, level.portal.y, '#fbbf24', 20, 5.5);

    const firstTry = s.attempts === 1;
    const allBonuses = s.collectedBonuses.size >= level.bonuses.length;
    let stars = 1;
    if (firstTry && allBonuses) stars = 3;
    else if (firstTry || allBonuses) stars = 2;

    const mult = s.boosted ? 2 : 1;
    const baseClear = 1000;
    const comboPts = s.combo * 150;
    const firstTryPts = firstTry ? 500 : 0;
    const totalScore = s.score + (baseClear + comboPts + firstTryPts) * mult;
    s.score = totalScore;
    setScore(totalScore);

    setSaved((prev) => {
      const existing = prev.levels[level.id];
      const bestStars = Math.max(existing?.stars ?? 0, stars);
      const bestScore = Math.max(existing?.bestScore ?? 0, totalScore);
      const nextUnlocked = Math.min(LEVELS.length, Math.max(prev.unlockedLevel, level.id + 1));
      const replenished = firstTry;
      const nextPowerUps = replenished
        ? {
            scan: Math.min(3, prev.powerUps.scan + 1),
            phase: Math.min(3, prev.powerUps.phase + 1),
            magnet: Math.min(3, prev.powerUps.magnet + 1),
          }
        : prev.powerUps;

      const updated: SavedState = {
        levels: {
          ...prev.levels,
          [level.id]: { stars: bestStars, bestScore, cleared: true },
        },
        unlockedLevel: nextUnlocked,
        powerUps: nextPowerUps,
      };
      saveState(updated);
      return updated;
    });

    setVictoryStats({
      totalScore,
      stars,
      firstTry,
      allBonuses,
      replenished: firstTry,
    });
  }, [level, spawnShockwave, spawnSparks]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (screen !== 'PLAY') return;
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)
      ) {
        return;
      }
      if (activeEl instanceof HTMLInputElement && activeEl.type === 'number') {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleEngage(true);
        }
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        if (phase === 'PAUSED') {
          e.preventDefault();
          handleEngage(true);
        } else if (phase === 'FAILED') {
          e.preventDefault();
          initLevel(currentLevelIdx, true);
        }
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        initLevel(currentLevelIdx, phase === 'FAILED');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, phase, currentLevelIdx, handleEngage, initLevel]);

  // ==========================================================================
  // 8. MAIN SIMULATION & CANVAS RENDERING LOOP (DELTA-TIME + SUB-STEPPING)
  // ==========================================================================

  useEffect(() => {
    if (screen !== 'PLAY') return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive canvas sizing with DPR crispness
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(300, Math.floor(rect.width * dpr));
      canvas.height = Math.max(240, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = simRef.current;
      s.time += rawDt;

      // Update scan preview timer
      if (s.scanTimer > 0) {
        s.scanTimer = Math.max(0, s.scanTimer - rawDt);
        setScanRemaining(Number(s.scanTimer.toFixed(1)));
      }

      // Update screen shake & glitch timers
      if (s.shakeTimer > 0) s.shakeTimer = Math.max(0, s.shakeTimer - rawDt);
      if (s.glitchTimer > 0) s.glitchTimer = Math.max(0, s.glitchTimer - rawDt);

      // Ambient embers
      for (const e of s.embers) {
        e.x += e.vx * rawDt;
        e.y += e.vy * rawDt;
        if (e.y > WORLD_Y_MAX + 0.5) {
          e.y = WORLD_Y_MIN - 0.5;
          e.x = WORLD_X_MIN + Math.random() * WORLD_WIDTH;
        }
        if (e.x < WORLD_X_MIN - 0.5) e.x = WORLD_X_MAX + 0.5;
        if (e.x > WORLD_X_MAX + 0.5) e.x = WORLD_X_MIN - 0.5;
      }

      // Update particles & shockwaves (always animate even during pause for visual polish)
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * rawDt;
        p.y += p.vy * rawDt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= rawDt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      for (let i = s.shockwaves.length - 1; i >= 0; i--) {
        const sw = s.shockwaves[i];
        sw.life -= rawDt;
        const t = 1 - Math.max(0, sw.life / sw.maxLife);
        sw.radius = 0.15 + (sw.maxRadius - 0.15) * (1 - Math.pow(1 - t, 2));
        if (sw.life <= 0) s.shockwaves.splice(i, 1);
      }

      // --- PHYSICS UPDATE WITH HIT-STOP & SUB-STEPPING ---
      if (s.phase === 'RUNNING') {
        if (s.hitStopTimer > 0) {
          // 40ms micro-pause for visceral impact weight
          s.hitStopTimer = Math.max(0, s.hitStopTimer - rawDt);
        } else {
          // Delayed tactical pause after bounce so player sees shockwave & new direction
          if (s.pauseDelayTimer > 0) {
            s.pauseDelayTimer -= rawDt;
            if (s.pauseDelayTimer <= 0) {
              s.phase = 'PAUSED';
              setPhase('PAUSED');
              setOrbTelemetry({
                pos: { x: Number(s.orb.x.toFixed(2)), y: Number(s.orb.y.toFixed(2)) },
                vel: { x: Number(s.orb.vx.toFixed(2)), y: Number(s.orb.vy.toFixed(2)) },
              });
            }
          }

          if (s.phase === 'RUNNING') {
            const SUBSTEPS = 10;
            const subDt = rawDt / SUBSTEPS;

            for (let step = 0; step < SUBSTEPS; step++) {
              if (s.phase !== 'RUNNING' || s.hitStopTimer > 0) break;

              s.orb.x += s.orb.vx * subDt;
              s.orb.y += s.orb.vy * subDt;

              if (s.reflectorCooldown > 0) {
                s.reflectorCooldown -= subDt;
              }

              // 1. Check Portal Capture
              const captureRadius = s.graviLock
                ? level.portal.radius * 2.15
                : level.portal.radius;
              const distPortal = Math.hypot(s.orb.x - level.portal.x, s.orb.y - level.portal.y);
              if (distPortal <= captureRadius) {
                triggerVictory();
                break;
              }

              // 2. Check Data Nodes (Bonuses)
              for (const b of level.bonuses) {
                if (s.collectedBonuses.has(b.id)) continue;
                const d = Math.hypot(s.orb.x - b.x, s.orb.y - b.y);
                if (d <= (b.radius ?? 0.48) + ORB_RADIUS) {
                  s.collectedBonuses.add(b.id);
                  s.combo += 1;
                  const pts = 500 * (s.boosted ? 2 : 1);
                  s.score += pts;
                  setCollectedBonusIds(Array.from(s.collectedBonuses));
                  setCombo(s.combo);
                  setScore(s.score);
                  synth.playBonus();
                  spawnShockwave(b.x, b.y, '#fbbf24', 1.8);
                  spawnSparks(b.x, b.y, '#fbbf24', 18, 5);
                }
              }

              // 3. Check Boost Rings
              for (const ring of level.boostRings) {
                if (s.triggeredBoosts.has(ring.id)) continue;
                const d = Math.hypot(s.orb.x - ring.x, s.orb.y - ring.y);
                if (d <= ring.radius + ORB_RADIUS * 0.4) {
                  s.triggeredBoosts.add(ring.id);
                  s.boosted = true;
                  s.orb.vx *= 1.45;
                  s.orb.vy *= 1.45;
                  s.combo += 1;
                  setCombo(s.combo);
                  setMultiplier(2);
                  synth.playBoost();
                  spawnShockwave(ring.x, ring.y, '#ffffff', 2.4);
                  spawnSparks(ring.x, ring.y, '#ff4d6d', 22, 6.5);
                }
              }

              // 4. Check Armed Reflector Segments
              for (const ref of s.reflectors) {
                if (s.reflectorCooldown > 0 && s.lastReflectorId === ref.id) continue;
                const cp = closestPointOnSegment({ x: s.orb.x, y: s.orb.y }, ref.p1, ref.p2);
                const dx = s.orb.x - cp.x;
                const dy = s.orb.y - cp.y;
                const dist = Math.hypot(dx, dy);

                if (dist <= ORB_RADIUS + 0.06) {
                  const reflected = reflectVector({ x: s.orb.vx, y: s.orb.vy }, ref.normal);
                  s.orb.vx = reflected.x;
                  s.orb.vy = reflected.y;

                  // Push slightly off the line along reflected direction to avoid double-trigger
                  const rDir = normalize(reflected);
                  s.orb.x = cp.x + rDir.x * (ORB_RADIUS + 0.08);
                  s.orb.y = cp.y + rDir.y * (ORB_RADIUS + 0.08);

                  s.lastReflectorId = ref.id;
                  s.reflectorCooldown = 0.08;
                  s.bouncesUsed += 1;
                  s.combo += 1;
                  s.score += 200 * (s.boosted ? 2 : 1);

                  setBouncesUsed(s.bouncesUsed);
                  setCombo(s.combo);
                  setScore(s.score);

                  // Impact VFX: 40ms hit-stop, shockwave, sparks, screen shake
                  s.hitStopTimer = 0.04;
                  s.shakeTimer = 0.16;
                  s.shakeIntensity = 6;
                  synth.playRicochet();
                  spawnShockwave(cp.x, cp.y, '#ff1e42', 2.2);
                  spawnSparks(cp.x, cp.y, '#ff4d6d', 24, 6.2);
                  spawnSparks(cp.x, cp.y, '#ffffff', 8, 4.0);

                  // Schedule Tactical Pause if more bounces are available
                  if (s.bouncesUsed < level.maxBounces) {
                    s.pauseDelayTimer = 0.14;
                  }
                  break;
                }
              }

              if (s.hitStopTimer > 0) break;

              // 5. Check Armored Obstacle Walls
              let wallFailed = false;
              for (const w of level.walls) {
                const col = circleRectCollision({ x: s.orb.x, y: s.orb.y }, ORB_RADIUS, w);
                if (col.hit) {
                  if (s.phaseShield) {
                    // Phase Shield absorbs 1 wall collision and reflects the orb!
                    s.phaseShield = false;
                    setPhaseShieldActive(false);
                    const reflected = reflectVector({ x: s.orb.vx, y: s.orb.vy }, col.normal);
                    s.orb.vx = reflected.x;
                    s.orb.vy = reflected.y;
                    s.orb.x += col.normal.x * (col.penetration + 0.08);
                    s.orb.y += col.normal.y * (col.penetration + 0.08);
                    s.hitStopTimer = 0.04;
                    s.shakeTimer = 0.18;
                    s.shakeIntensity = 7;
                    synth.playRicochet();
                    spawnShockwave(s.orb.x, s.orb.y, '#fbbf24', 2.4);
                    spawnSparks(s.orb.x, s.orb.y, '#fbbf24', 24, 6);
                  } else {
                    s.phase = 'FAILED';
                    s.glitchTimer = 0.35;
                    s.shakeTimer = 0.25;
                    s.shakeIntensity = 9;
                    synth.playWallHit();
                    spawnSparks(s.orb.x, s.orb.y, '#ff1e42', 28, 6.5);
                    setPhase('FAILED');
                    setFailReason('ARMORED BARRIER IMPACT // SIGNAL TERMINATED');
                    wallFailed = true;
                  }
                  break;
                }
              }
              if (wallFailed) break;

              // 6. Check Grid Bounds
              if (
                s.orb.x < WORLD_X_MIN - 0.6 ||
                s.orb.x > WORLD_X_MAX + 0.6 ||
                s.orb.y < WORLD_Y_MIN - 0.6 ||
                s.orb.y > WORLD_Y_MAX + 0.6
              ) {
                s.phase = 'FAILED';
                s.glitchTimer = 0.28;
                synth.playWallHit();
                setPhase('FAILED');
                setFailReason('SIGNAL LOST BEYOND SECTOR PERIMETER');
                break;
              }
            }

            // Append plasma trail point
            s.trail.push({ x: s.orb.x, y: s.orb.y, boosted: s.boosted });
            if (s.trail.length > 48) s.trail.shift();
          }
        }
      }

      // ======================================================================
      // RENDER CANVAS
      // ======================================================================
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;

      // Isotropic scale so 45 degrees is mathematically and visually exact
      const pad = 26;
      const scale = Math.min((cw - pad * 2) / WORLD_WIDTH, (ch - pad * 2) / WORLD_HEIGHT);
      const offsetX = cw / 2;
      const offsetY = ch / 2;
      s.scale = scale;
      s.offsetX = offsetX;
      s.offsetY = offsetY;

      const toScreenX = (wx: number) => offsetX + wx * scale;
      const toScreenY = (wy: number) => offsetY - wy * scale;

      ctx.save();

      // Camera Screen Shake
      if (s.shakeTimer > 0) {
        const mag = (s.shakeTimer / 0.2) * s.shakeIntensity;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      // 1. Deep Obsidian Background
      ctx.fillStyle = '#070305';
      ctx.fillRect(-20, -20, cw + 40, ch + 40);

      // Subtle crimson ambient core glow
      const bgGlow = ctx.createRadialGradient(
        offsetX,
        offsetY,
        scale * 0.5,
        offsetX,
        offsetY,
        scale * 11.5
      );
      bgGlow.addColorStop(0, 'rgba(59, 7, 18, 0.34)');
      bgGlow.addColorStop(0.6, 'rgba(20, 4, 9, 0.16)');
      bgGlow.addColorStop(1, 'rgba(7, 3, 5, 0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, cw, ch);

      // 2. Ambient Floating Red Embers
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const e of s.embers) {
        ctx.fillStyle = `rgba(255, 30, 66, ${e.alpha})`;
        ctx.beginPath();
        ctx.arc(toScreenX(e.x), toScreenY(e.y), e.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Clean Cartesian Coordinate Grid
      ctx.save();
      ctx.lineWidth = 1;
      for (let x = WORLD_X_MIN; x <= WORLD_X_MAX; x++) {
        const sx = toScreenX(x);
        ctx.strokeStyle = x === 0 ? 'rgba(255, 77, 109, 0.42)' : 'rgba(255, 30, 66, 0.10)';
        ctx.beginPath();
        ctx.moveTo(sx, toScreenY(WORLD_Y_MAX));
        ctx.lineTo(sx, toScreenY(WORLD_Y_MIN));
        ctx.stroke();
      }
      for (let y = WORLD_Y_MIN; y <= WORLD_Y_MAX; y++) {
        const sy = toScreenY(y);
        ctx.strokeStyle = y === 0 ? 'rgba(255, 77, 109, 0.42)' : 'rgba(255, 30, 66, 0.10)';
        ctx.beginPath();
        ctx.moveTo(toScreenX(WORLD_X_MIN), sy);
        ctx.lineTo(toScreenX(WORLD_X_MAX), sy);
        ctx.stroke();
      }

      // Soft radial edge fade over the grid
      const vignette = ctx.createRadialGradient(
        offsetX,
        offsetY,
        scale * 5.5,
        offsetX,
        offsetY,
        Math.max(cw, ch) * 0.68
      );
      vignette.addColorStop(0, 'rgba(7, 3, 5, 0)');
      vignette.addColorStop(1, 'rgba(7, 3, 5, 0.82)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, cw, ch);

      // Crisp Axis Tick Labels
      ctx.font = '10px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = 'rgba(255, 160, 178, 0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let x = WORLD_X_MIN; x <= WORLD_X_MAX; x += 2) {
        if (x === 0) continue;
        ctx.fillText(String(x), toScreenX(x), toScreenY(0) + 5);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = WORLD_Y_MIN; y <= WORLD_Y_MAX; y += 2) {
        if (y === 0) continue;
        ctx.fillText(String(y), toScreenX(0) - 6, toScreenY(y));
      }
      // Axis symbols
      ctx.fillStyle = 'rgba(255, 77, 109, 0.85)';
      ctx.textAlign = 'left';
      ctx.fillText('X', toScreenX(WORLD_X_MAX) - 10, toScreenY(0) - 10);
      ctx.fillText('Y', toScreenX(0) + 8, toScreenY(WORLD_Y_MAX) + 10);
      ctx.restore();

      // 4. Armored Obstacle Walls
      for (const w of level.walls) {
        const wx = toScreenX(w.x);
        const wy = toScreenY(w.y + w.h);
        const ww = w.w * scale;
        const wh = w.h * scale;

        ctx.save();
        ctx.fillStyle = '#24050c';
        ctx.strokeStyle = '#ff1e42';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#ff1e42';
        ctx.shadowBlur = 8;
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeRect(wx, wy, ww, wh);

        // Tactical diagonal hazard hatching
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.rect(wx, wy, ww, wh);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255, 30, 66, 0.22)';
        ctx.lineWidth = 1;
        const step = 10;
        for (let d = -wh; d < ww + wh; d += step) {
          ctx.moveTo(wx + d, wy);
          ctx.lineTo(wx + d - wh, wy + wh);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 5. Boost Rings
      for (const ring of level.boostRings) {
        const rx = toScreenX(ring.x);
        const ry = toScreenY(ring.y);
        const rr = ring.radius * scale;
        const used = s.triggeredBoosts.has(ring.id);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = used ? 'rgba(255, 255, 255, 0.35)' : '#ff4d6d';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff1e42';
        ctx.shadowBlur = used ? 4 : 16;

        // Outer rotating dashed ring
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(s.time * 1.4);
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Inner pulsing core ring
        ctx.strokeStyle = used ? 'rgba(255,255,255,0.2)' : '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, rr * (0.68 + Math.sin(s.time * 5) * 0.05), 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillStyle = used ? 'rgba(255,255,255,0.35)' : '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('2X BOOST', rx, ry);
        ctx.restore();
      }

      // 6. Data Nodes (Rotating Golden Diamonds)
      for (const b of level.bonuses) {
        if (s.collectedBonuses.has(b.id)) continue;
        const bx = toScreenX(b.x);
        const by = toScreenY(b.y);
        const sz = 0.34 * scale;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(bx, by);
        ctx.rotate(s.time * 1.8);
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 16;

        ctx.fillStyle = 'rgba(251, 191, 36, 0.28)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -sz);
        ctx.lineTo(sz, 0);
        ctx.lineTo(0, sz);
        ctx.lineTo(-sz, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner white crystal core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, sz * 0.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. Target Portal (Pulsing White-Crimson)
      {
        const px = toScreenX(level.portal.x);
        const py = toScreenY(level.portal.y);
        const pr = level.portal.radius * scale;
        const pulse = 1 + Math.sin(s.time * 4.5) * 0.08;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Gravi-Lock expanded radius indicator
        if (s.graviLock) {
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(px, py, pr * 2.15, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Outer crimson halo
        ctx.shadowColor = '#ff1e42';
        ctx.shadowBlur = 24;
        ctx.strokeStyle = '#ff1e42';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, pr * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Rotating tactical bracket arcs
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-s.time * 1.2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.arc(0, 0, pr * 0.72, k * (Math.PI / 2), k * (Math.PI / 2) + 0.8);
          ctx.stroke();
        }
        ctx.restore();

        // Crisp white core
        const coreGrad = ctx.createRadialGradient(px, py, 1, px, py, pr * 0.55);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.5, 'rgba(255, 77, 109, 0.8)');
        coreGrad.addColorStop(1, 'rgba(255, 30, 66, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 8. Armed Reflector Segments
      const drawReflector = (ref: ReflectorSegment, isPreview: boolean) => {
        const x1 = toScreenX(ref.p1.x);
        const y1 = toScreenY(ref.p1.y);
        const x2 = toScreenX(ref.p2.x);
        const y2 = toScreenY(ref.p2.y);
        const cx = toScreenX(ref.center.x);
        const cy = toScreenY(ref.center.y);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = isPreview ? '#ff4d6d' : '#ff1e42';
        ctx.shadowColor = '#ff1e42';
        ctx.shadowBlur = isPreview ? 18 : 14;
        ctx.lineWidth = isPreview ? 3.5 : 3;
        if (isPreview) ctx.setLineDash([10, 5]);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Crisp white inner filament
        ctx.setLineDash([]);
        ctx.strokeStyle = isPreview ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Endpoint caps
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x1, y1, 3.2, 0, Math.PI * 2);
        ctx.arc(x2, y2, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Normal Vector Indicator (especially helpful during Tactical Pause)
        if (isPreview) {
          const nLen = 0.85 * scale;
          const nx = cx + ref.normal.x * nLen;
          const ny = cy - ref.normal.y * nLen;
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 8;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          // Small arrowhead for normal
          const ang = Math.atan2(ny - cy, nx - cx);
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(nx - 7 * Math.cos(ang - 0.45), ny - 7 * Math.sin(ang - 0.45));
          ctx.lineTo(nx - 7 * Math.cos(ang + 0.45), ny - 7 * Math.sin(ang + 0.45));
          ctx.closePath();
          ctx.fill();

          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText('n̂', nx + 6, ny - 4);
        }
        ctx.restore();
      };

      for (const ref of s.reflectors) {
        drawReflector(ref, false);
      }
      if (s.phase === 'PAUSED' && s.bouncesUsed < level.maxBounces) {
        drawReflector(s.previewReflector, true);
      }

      // 9. Laser Scan Power-Up Preview (Dashed 1st-bounce trajectory for 2s)
      if (s.phase === 'PAUSED' && s.scanTimer > 0) {
        const origin = { x: s.orb.x, y: s.orb.y };
        const dir = normalize({ x: s.orb.vx, y: s.orb.vy });
        const candidates: ReflectorSegment[] = [...s.reflectors];
        if (s.bouncesUsed < level.maxBounces) candidates.push(s.previewReflector);

        let closestHit: { t: number; point: Vec2; normal: Vec2 } | null = null;
        for (const seg of candidates) {
          const hit = raySegmentIntersect(origin, dir, seg.p1, seg.p2);
          if (hit && (!closestHit || hit.t < closestHit.t)) {
            closestHit = { ...hit, normal: seg.normal };
          }
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([7, 6]);

        ctx.beginPath();
        ctx.moveTo(toScreenX(origin.x), toScreenY(origin.y));
        if (closestHit) {
          ctx.lineTo(toScreenX(closestHit.point.x), toScreenY(closestHit.point.y));
          const rDir = normalize(reflectVector(dir, closestHit.normal));
          const endPt = {
            x: closestHit.point.x + rDir.x * 16,
            y: closestHit.point.y + rDir.y * 16,
          };
          ctx.lineTo(toScreenX(endPt.x), toScreenY(endPt.y));
        } else {
          ctx.lineTo(toScreenX(origin.x + dir.x * 18), toScreenY(origin.y + dir.y * 18));
        }
        ctx.stroke();
        ctx.restore();
      }

      // 10. Plasma Trail Behind Orb
      if (s.trail.length > 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        for (let i = 1; i < s.trail.length; i++) {
          const p0 = s.trail[i - 1];
          const p1 = s.trail[i];
          const ratio = i / s.trail.length;
          ctx.strokeStyle = p1.boosted
            ? `rgba(255, 255, 255, ${ratio * 0.85})`
            : `rgba(255, 30, 66, ${ratio * 0.78})`;
          ctx.shadowColor = p1.boosted ? '#ff4d6d' : '#ff1e42';
          ctx.shadowBlur = p1.boosted ? 16 : 10;
          ctx.lineWidth = Math.max(1, ratio * ORB_RADIUS * scale * 1.5);
          ctx.beginPath();
          ctx.moveTo(toScreenX(p0.x), toScreenY(p0.y));
          ctx.lineTo(toScreenX(p1.x), toScreenY(p1.y));
          ctx.stroke();
        }
        ctx.restore();
      }

      // 11. Velocity Vector Arrow (shown during Tactical Pause)
      if (s.phase === 'PAUSED') {
        const ox = toScreenX(s.orb.x);
        const oy = toScreenY(s.orb.y);
        const vNorm = normalize({ x: s.orb.vx, y: s.orb.vy });
        const arrowLen = 1.65 * scale;
        const ax = ox + vNorm.x * arrowLen;
        const ay = oy - vNorm.y * arrowLen;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = '#ff4d6d';
        ctx.shadowColor = '#ff1e42';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ax, ay);
        ctx.stroke();

        const ang = Math.atan2(ay - oy, ax - ox);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 9 * Math.cos(ang - 0.4), ay - 9 * Math.sin(ang - 0.4));
        ctx.lineTo(ax - 9 * Math.cos(ang + 0.4), ay - 9 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fill();

        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(
          `v=(${s.orb.vx.toFixed(1)}, ${s.orb.vy.toFixed(1)})`,
          ax + (vNorm.x >= 0 ? 8 : -96),
          ay + (vNorm.y >= 0 ? -8 : 14)
        );
        ctx.restore();
      }

      // 12. The Orb (Glowing Crimson-White Core)
      {
        const ox = toScreenX(s.orb.x);
        const oy = toScreenY(s.orb.y);
        const or = ORB_RADIUS * scale;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Phase Shield Aura
        if (s.phaseShield) {
          ctx.strokeStyle = '#fbbf24';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 14;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ox, oy, or * 1.85, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Outer plasma glow
        ctx.shadowColor = s.boosted ? '#ffffff' : '#ff1e42';
        ctx.shadowBlur = 22;
        ctx.fillStyle = s.boosted ? '#ff4d6d' : '#ff1e42';
        ctx.beginPath();
        ctx.arc(ox, oy, or * 1.15, 0, Math.PI * 2);
        ctx.fill();

        // Crisp white center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ox, oy, or * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 13. Shockwaves & Physics Sparks
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const sw of s.shockwaves) {
        const alpha = Math.max(0, sw.life / sw.maxLife);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2.5 * alpha + 0.5;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(toScreenX(sw.x), toScreenY(sw.y), sw.radius * scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (const p of s.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(toScreenX(p.x), toScreenY(p.y), p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 14. Wall Collision Red Glitch Effect (Chromatic Aberration Flash)
      if (s.glitchTimer > 0) {
        const intensity = s.glitchTimer / 0.35;
        ctx.save();
        ctx.fillStyle = `rgba(255, 30, 66, ${intensity * 0.22})`;
        ctx.fillRect(0, 0, cw, ch);

        // Horizontal RGB split scan bands
        for (let i = 0; i < 6; i++) {
          const gy = Math.random() * ch;
          const gh = 4 + Math.random() * 14;
          ctx.fillStyle =
            i % 2 === 0
              ? `rgba(255, 30, 66, ${intensity * 0.45})`
              : `rgba(0, 255, 255, ${intensity * 0.25})`;
          ctx.fillRect((Math.random() - 0.5) * 30, gy, cw, gh);
        }
        ctx.restore();
      }

      ctx.restore();
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [screen, level, triggerVictory, spawnShockwave, spawnSparks]);

  // --- Pointer Coordinate Inspection on Canvas ---
  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { scale, offsetX, offsetY } = simRef.current;
    const wx = (sx - offsetX) / scale;
    const wy = (offsetY - sy) / scale;
    if (wx >= WORLD_X_MIN && wx <= WORLD_X_MAX && wy >= WORLD_Y_MIN && wy <= WORLD_Y_MAX) {
      setHoverCoord({ x: Math.round(wx * 10) / 10, y: Math.round(wy * 10) / 10 });
    } else {
      setHoverCoord(null);
    }
  };

  // Total stars earned across all levels
  const totalStars = Object.values(saved.levels).reduce((acc, l) => acc + (l.stars || 0), 0);
  const maxTotalStars = LEVELS.length * 3;

  const mathModeLabel =
    level.mathMode === 'LINE_EQUATION'
      ? 'LINE EQUATION // y = kx + b'
      : level.mathMode === 'NORMAL_VECTOR'
        ? 'NORMAL VECTOR // n = (nx, ny)'
        : 'ANGLE & POINT // θ° @ (x, y)';

  const liveFormulaText = buildReflector(level.mathMode, params, 'lbl', false).formulaLabel;

  return (
    <section className="vrp-root relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#ff1e42]/35 bg-[#070305] font-sans text-zinc-100 shadow-[var(--panel-shadow)] select-none">
      {/* Scoped self-contained CSS (avoids host website conflicts) */}
      <style>{`
        .vrp-root {
          --vrp-bg: #070305;
          --vrp-crimson: #ff1e42;
          --vrp-glow: #ff4d6d;
          --vrp-burgundy: #3b0712;
          --vrp-amber: #fbbf24;
        }
        .vrp-scanlines {
          background: repeating-linear-gradient(
            0deg,
            rgba(255, 30, 66, 0.03) 0px,
            rgba(255, 30, 66, 0.03) 1px,
            transparent 1px,
            transparent 3px
          );
        }
        .vrp-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: rgba(255, 30, 66, 0.25);
          border-radius: 2px;
          outline: none;
        }
        .vrp-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 2px;
          background: #ff1e42;
          border: 1.5px solid #ffffff;
          box-shadow: 0 0 10px rgba(255, 30, 66, 0.9);
          cursor: pointer;
        }
        .vrp-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          background: #ff1e42;
          border: 1.5px solid #ffffff;
          box-shadow: 0 0 10px rgba(255, 30, 66, 0.9);
          cursor: pointer;
        }
      `}</style>

      {/* Subtle CRT Scanline Overlay (scoped to game container) */}
      <div className="vrp-scanlines pointer-events-none absolute inset-0 z-30 opacity-70" />

      {/* ==================================================================== */}
      {/* HEADER HUD BAR                                                       */}
      {/* ==================================================================== */}
      <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#ff1e42]/30 bg-[#0d0407]/85 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-[#ff1e42]/60 bg-[#3b0712]/80 shadow-[0_0_15px_rgba(255,30,66,0.35)]">
            <Terminal className="h-5 w-5 text-[#ff1e42]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-[0.18em] text-white sm:text-base">
                VECTOR RICOCHET <span className="text-[#ff1e42]">{'//'}</span> PROTOCOL
              </h1>
              <span className="hidden rounded border border-[#ff1e42]/40 bg-[#ff1e42]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#ff4d6d] sm:inline-block">
                v2.4
              </span>
            </div>
            <p className="font-mono text-[10px] tracking-wider text-zinc-400">
              {screen === 'PLAY' ? level.topic : 'TACTICAL ANALYTIC GEOMETRY SIMULATOR'}
            </p>
          </div>
        </div>

        {/* Center Status Telemetry (Play Screen) */}
        {screen === 'PLAY' && (
          <div className="hidden items-center gap-4 font-mono text-xs lg:flex">
            <div className="flex items-center gap-1.5 rounded border border-[#ff1e42]/25 bg-[#16060b]/80 px-2.5 py-1">
              <span className="text-zinc-400">SCORE</span>
              <span className="font-bold text-white">{score.toLocaleString()}</span>
              {multiplier > 1 && (
                <span className="ml-1 rounded bg-[#fbbf24]/20 px-1 text-[10px] font-bold text-[#fbbf24]">
                  {multiplier}X
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded border border-[#ff1e42]/25 bg-[#16060b]/80 px-2.5 py-1">
              <span className="text-zinc-400">COMBO</span>
              <span className="font-bold text-[#ff4d6d]">x{combo}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded border border-[#ff1e42]/25 bg-[#16060b]/80 px-2.5 py-1">
              <span className="text-zinc-400">ATTEMPT</span>
              <span
                className={
                  attempts === 1 ? 'font-bold text-emerald-400' : 'font-bold text-amber-400'
                }
              >
                #{attempts}
              </span>
            </div>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded border border-[#fbbf24]/30 bg-[#1c1006]/70 px-2.5 py-1 font-mono text-xs text-[#fbbf24]">
            <Star className="h-3.5 w-3.5 fill-[#fbbf24]" />
            <span>
              {totalStars}/{maxTotalStars}
            </span>
          </div>

          {screen === 'PLAY' && (
            <button
              type="button"
              onClick={() => {
                synth.playClick();
                setScreen('MAP');
              }}
              className="flex items-center gap-1.5 rounded border border-[#ff1e42]/40 bg-[#3b0712]/60 px-2.5 py-1.5 font-mono text-xs text-zinc-200 transition hover:border-[#ff1e42] hover:bg-[#ff1e42]/20"
            >
              <Map className="h-3.5 w-3.5 text-[#ff4d6d]" />
              <span className="hidden sm:inline">SECTORS</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="flex h-8 w-8 items-center justify-center rounded border border-[#ff1e42]/40 bg-[#16060b] text-zinc-200 transition hover:border-[#ff1e42] hover:text-[#ff4d6d]"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-zinc-500" />
            ) : (
              <Volume2 className="h-4 w-4 text-[#ff4d6d]" />
            )}
          </button>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* SCREEN 1: START OVERLAY                                              */}
      {/* ==================================================================== */}
      {screen === 'START' && (
        <main className="scroll-thin relative z-10 flex min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="relative m-auto w-full max-w-2xl overflow-hidden rounded-lg border border-[#ff1e42]/45 bg-[#0e0408]/90 p-6 shadow-[0_0_50px_rgba(255,30,66,0.2)] backdrop-blur-xl sm:p-10">
            <HudBrackets />
            <div className="mb-3 inline-flex items-center gap-2 rounded border border-[#ff1e42]/40 bg-[#3b0712]/70 px-3 py-1 font-mono text-[11px] tracking-widest text-[#ff4d6d]">
              <Sparkles className="h-3.5 w-3.5" />
              CLASSIFIED MATH-COMBAT TRAINING MODULE
            </div>

            <h2 className="font-mono text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              VECTOR RICOCHET
              <span className="block text-xl font-bold tracking-[0.28em] text-[#ff1e42] sm:text-2xl">
                {'// PROTOCOL'}
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
              Freeze time in <span className="font-mono text-[#ff4d6d]">TACTICAL PAUSE</span>,
              compute exact linear equations, orthogonal normals, and incidence angles, and deploy
              neon reflectors to guide the plasma orb into the extraction portal.
            </p>

            {/* Key Feature Pills */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-[#ff1e42]/25 bg-[#17060b]/80 p-3">
                <div className="font-mono text-xs font-bold text-[#ff4d6d]">r = v - 2(v·n̂)n̂</div>
                <div className="mt-1 text-[11px] text-zinc-400">
                  Exact sub-stepped vector reflection physics on a true-scale Cartesian grid.
                </div>
              </div>
              <div className="rounded border border-[#fbbf24]/25 bg-[#170f06]/70 p-3">
                <div className="font-mono text-xs font-bold text-[#fbbf24]">DATA NODES & BOOST</div>
                <div className="mt-1 text-[11px] text-zinc-400">
                  Intercept golden diamonds & 2x Boost Rings for 3-star tactical ratings.
                </div>
              </div>
              <div className="rounded border border-white/20 bg-[#15080d]/80 p-3">
                <div className="font-mono text-xs font-bold text-white">3 MATH MODES</div>
                <div className="mt-1 text-[11px] text-zinc-400">
                  Slope-Intercept, Normal Vectors, and Angle-Point across 5 escalating sectors.
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  synth.playClick();
                  initLevel(0);
                  setScreen('PLAY');
                }}
                className="group relative flex items-center gap-2 rounded border border-[#ff4d6d] bg-[#ff1e42] px-6 py-3 font-mono text-sm font-bold tracking-wider text-white shadow-[0_0_25px_rgba(255,30,66,0.55)] transition hover:bg-[#ff3355] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-white" />
                INITIATE PROTOCOL
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  synth.playClick();
                  setScreen('MAP');
                }}
                className="flex items-center gap-2 rounded border border-[#ff1e42]/45 bg-[#3b0712]/60 px-5 py-3 font-mono text-sm font-semibold tracking-wider text-zinc-100 transition hover:border-[#ff1e42] hover:bg-[#ff1e42]/20"
              >
                <Map className="h-4 w-4 text-[#ff4d6d]" />
                SECTOR MAP
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 2: LEVEL SELECT TACTICAL MAP                                  */}
      {/* ==================================================================== */}
      {screen === 'MAP' && (
        <main className="scroll-thin relative z-10 flex min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="m-auto w-full max-w-5xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-xs tracking-widest text-[#ff4d6d]">
                  OPERATIONAL SECTORS
                </div>
                <h2 className="font-mono text-2xl font-bold text-white sm:text-3xl">
                  SELECT SIMULATION PROTOCOL
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  synth.playClick();
                  setScreen('START');
                }}
                className="rounded border border-[#ff1e42]/35 bg-[#18070d] px-3 py-1.5 font-mono text-xs text-zinc-300 transition hover:border-[#ff1e42] hover:text-white"
              >
                ← TERMINAL HOME
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {LEVELS.map((lvl, idx) => {
                const prog = saved.levels[lvl.id];
                const unlocked = lvl.id <= saved.unlockedLevel;
                const stars = prog?.stars ?? 0;

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      synth.playClick();
                      initLevel(idx);
                      setScreen('PLAY');
                    }}
                    className={`group relative flex flex-col justify-between rounded-lg border p-5 text-left transition ${
                      unlocked
                        ? 'border-[#ff1e42]/40 bg-[#12050a]/90 hover:-translate-y-0.5 hover:border-[#ff4d6d] hover:shadow-[0_0_24px_rgba(255,30,66,0.28)]'
                        : 'cursor-not-allowed border-zinc-800 bg-[#0b0406]/60 opacity-55'
                    }`}
                  >
                    {unlocked && <HudBrackets color="#ff1e42" />}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold tracking-widest text-[#ff4d6d]">
                          {lvl.code}
                        </span>
                        <span className="rounded border border-[#ff1e42]/30 bg-[#3b0712]/70 px-2 py-0.5 font-mono text-[10px] text-zinc-200">
                          {lvl.mathMode.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="mt-2 font-mono text-lg font-bold text-white group-hover:text-[#ff4d6d]">
                        {lvl.title}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400">{lvl.topic}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-[#ff1e42]/20 pt-3">
                      {unlocked ? (
                        <>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3].map((s) => (
                              <Star
                                key={s}
                                className={`h-4 w-4 ${
                                  s <= stars
                                    ? 'fill-[#fbbf24] text-[#fbbf24] drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-xs text-zinc-400">
                            {prog?.bestScore
                              ? `${prog.bestScore.toLocaleString()} PTS`
                              : `${lvl.maxBounces} BOUNCE${lvl.maxBounces > 1 ? 'S' : ''}`}
                          </span>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-500">
                          <Lock className="h-3.5 w-3.5" />
                          LOCKED // CLEAR PRIOR SECTOR
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 3: ACTIVE GAMEPLAY WORKSPACE                                  */}
      {/* ==================================================================== */}
      {screen === 'PLAY' && (
        <main className="scroll-thin relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden lg:p-4">
          {/* LEFT / CENTER: TACTICAL CANVAS STAGE */}
          <div className="relative flex min-h-[340px] shrink-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#ff1e42]/40 bg-[#070305] shadow-[0_0_30px_rgba(255,30,66,0.12)] lg:min-h-0 lg:shrink">
            <HudBrackets />

            {/* Top Canvas Overlay Bar */}
            <div className="pointer-events-none absolute top-2.5 right-3 left-3 z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider backdrop-blur-md ${
                    phase === 'PAUSED'
                      ? 'border-[#ff4d6d]/70 bg-[#3b0712]/80 text-[#ff4d6d]'
                      : phase === 'RUNNING'
                        ? 'border-emerald-400/60 bg-emerald-950/70 text-emerald-300'
                        : phase === 'FAILED'
                          ? 'border-red-500 bg-red-950/80 text-red-300'
                          : 'border-[#fbbf24] bg-amber-950/80 text-[#fbbf24]'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      phase === 'PAUSED'
                        ? 'animate-pulse bg-[#ff1e42]'
                        : phase === 'RUNNING'
                          ? 'animate-ping bg-emerald-400'
                          : 'bg-[#fbbf24]'
                    }`}
                  />
                  {phase === 'PAUSED'
                    ? bouncesUsed === 0
                      ? 'TACTICAL PAUSE // PRE-LAUNCH'
                      : `TACTICAL PAUSE // STAGE ${bouncesUsed + 1}`
                    : phase === 'RUNNING'
                      ? 'SIMULATION ACTIVE'
                      : phase === 'FAILED'
                        ? 'COLLISION FAULT'
                        : 'EXTRACTION COMPLETE'}
                </span>

                <span className="rounded border border-[#ff1e42]/30 bg-[#0d0407]/80 px-2 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur-md">
                  REFLECTORS: <strong className="text-white">{bouncesUsed}/{level.maxBounces}</strong>
                </span>
              </div>

              {/* Hover Coordinate Readout */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded border border-[#fbbf24]/30 bg-[#140c04]/80 px-2.5 py-1 font-mono text-[11px] text-[#fbbf24] backdrop-blur-md">
                  <Sparkles className="h-3 w-3" />
                  NODES: {collectedBonusIds.length}/{level.bonuses.length}
                </div>
                <div className="hidden items-center gap-1 rounded border border-white/15 bg-[#0d0407]/85 px-2.5 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur-md sm:flex">
                  <Crosshair className="h-3 w-3 text-[#ff4d6d]" />
                  {hoverCoord
                    ? `(${hoverCoord.x.toFixed(1)}, ${hoverCoord.y.toFixed(1)})`
                    : 'HOVER GRID'}
                </div>
              </div>
            </div>

            {/* HTML5 Canvas Container */}
            <div ref={containerRef} className="relative h-full min-h-[340px] w-full flex-1 lg:min-h-0">
              <canvas
                ref={canvasRef}
                onMouseMove={handleCanvasMove}
                onMouseLeave={() => setHoverCoord(null)}
                className="block h-full w-full cursor-crosshair"
              />
            </div>

            {/* Failure Banner Overlay */}
            {phase === 'FAILED' && (
              <div className="absolute inset-x-4 bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ff1e42] bg-[#1a0409]/95 px-4 py-3 shadow-[0_0_30px_rgba(255,30,66,0.45)] backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-[#ff1e42]" />
                  <div>
                    <div className="font-mono text-xs font-bold tracking-wider text-[#ff4d6d]">
                      {failReason}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Recalculate reflector parameters or engage Phase Shield to survive barrier impacts.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    synth.playClick();
                    initLevel(currentLevelIdx, true);
                  }}
                  className="flex items-center gap-1.5 rounded border border-[#ff4d6d] bg-[#ff1e42] px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-[#ff3355]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  RETRY PROTOCOL (R)
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: MATHEMATICAL CONTROL TERMINAL */}
          <aside className="scroll-thin relative flex w-full shrink-0 flex-col gap-3 rounded-lg border border-[#ff1e42]/35 bg-[#0e0408]/90 p-3.5 backdrop-blur-xl lg:min-h-0 lg:w-[345px] lg:overflow-y-auto xl:w-[375px]">
            <HudBrackets />

            {/* Sector & Math Mode Header */}
            <div className="border-b border-[#ff1e42]/25 pb-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold tracking-widest text-[#ff4d6d]">
                  {`${level.code} // ${level.title}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    synth.playClick();
                    setShowHint((h) => !h);
                  }}
                  className="flex items-center gap-1 rounded border border-[#fbbf24]/35 bg-[#fbbf24]/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-[#fbbf24] transition hover:bg-[#fbbf24]/20"
                >
                  <HelpCircle className="h-3 w-3" />
                  {showHint ? 'HIDE HINT' : 'HINT'}
                </button>
              </div>
              <div className="mt-1 font-mono text-[11px] text-zinc-400">{mathModeLabel}</div>

              {showHint && (
                <div className="mt-2 rounded border border-[#fbbf24]/35 bg-[#1b1205]/90 p-2.5 text-[11px] leading-relaxed text-amber-200/95">
                  {level.hint}
                </div>
              )}
            </div>

            {/* Live Orb Telemetry & Formula Readout */}
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="rounded border border-white/10 bg-[#070305] px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-500">ORB POSITION</div>
                <div className="font-bold text-white">
                  ({orbTelemetry.pos.x}, {orbTelemetry.pos.y})
                </div>
              </div>
              <div className="rounded border border-white/10 bg-[#070305] px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-500">VELOCITY VECTOR v</div>
                <div className="font-bold text-[#ff4d6d]">
                  ({orbTelemetry.vel.x}, {orbTelemetry.vel.y})
                </div>
              </div>
            </div>

            <div className="rounded border border-[#ff1e42]/40 bg-[#1a060c] px-3 py-2 text-center font-mono text-xs font-bold tracking-wide text-white shadow-inner">
              {liveFormulaText}
            </div>

            {/* Dynamic Mathematical Inputs per Level Mode */}
            <div className="space-y-2">
              {level.mathMode === 'LINE_EQUATION' && (
                <>
                  <ParamControl
                    label="Slope"
                    symbol="k"
                    value={params.k}
                    min={-5}
                    max={5}
                    step={0.25}
                    disabled={phase !== 'PAUSED'}
                    onChange={(k) => setParams((p) => ({ ...p, k }))}
                  />
                  <ParamControl
                    label="Y-Intercept"
                    symbol="b"
                    value={params.b}
                    min={-12}
                    max={12}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(b) => setParams((p) => ({ ...p, b }))}
                  />
                  <ParamControl
                    label="Segment Center X"
                    symbol="cx"
                    value={params.cx}
                    min={-9}
                    max={9}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(cx) => setParams((p) => ({ ...p, cx }))}
                  />
                </>
              )}

              {level.mathMode === 'NORMAL_VECTOR' && (
                <>
                  <ParamControl
                    label="Normal X"
                    symbol="nx"
                    value={params.nx}
                    min={-5}
                    max={5}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(nx) => setParams((p) => ({ ...p, nx }))}
                  />
                  <ParamControl
                    label="Normal Y"
                    symbol="ny"
                    value={params.ny}
                    min={-5}
                    max={5}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(ny) => setParams((p) => ({ ...p, ny }))}
                  />
                  <ParamControl
                    label="Anchor X"
                    symbol="px"
                    value={params.px}
                    min={-9}
                    max={9}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(px) => setParams((p) => ({ ...p, px }))}
                  />
                  <ParamControl
                    label="Anchor Y"
                    symbol="py"
                    value={params.py}
                    min={-5.5}
                    max={5.5}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(py) => setParams((p) => ({ ...p, py }))}
                  />
                </>
              )}

              {level.mathMode === 'ANGLE_POINT' && (
                <>
                  <ParamControl
                    label="Inclination Angle"
                    symbol="θ"
                    value={params.angle}
                    min={-180}
                    max={180}
                    step={5}
                    unit="°"
                    disabled={phase !== 'PAUSED'}
                    onChange={(angle) => setParams((p) => ({ ...p, angle }))}
                  />
                  <ParamControl
                    label="Anchor X"
                    symbol="px"
                    value={params.px}
                    min={-9}
                    max={9}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(px) => setParams((p) => ({ ...p, px }))}
                  />
                  <ParamControl
                    label="Anchor Y"
                    symbol="py"
                    value={params.py}
                    min={-5.5}
                    max={5.5}
                    step={0.5}
                    disabled={phase !== 'PAUSED'}
                    onChange={(py) => setParams((p) => ({ ...p, py }))}
                  />
                </>
              )}
            </div>

            {/* Tactical Power-Ups Row */}
            <div className="space-y-1.5 border-t border-[#ff1e42]/20 pt-2.5">
              <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-zinc-400">
                <span>TACTICAL POWER-UPS</span>
                <span className="text-[#fbbf24]">+1 ON 1ST-TRY CLEAR</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={saved.powerUps.scan <= 0 || phase !== 'PAUSED' || scanRemaining > 0}
                  onClick={() => activatePowerUp('scan')}
                  className={`flex flex-col items-center rounded border p-2 font-mono text-[10px] transition ${
                    scanRemaining > 0
                      ? 'border-[#fbbf24] bg-[#fbbf24]/20 text-[#fbbf24]'
                      : 'border-[#ff1e42]/30 bg-[#18070d] text-zinc-200 hover:border-[#fbbf24] hover:text-[#fbbf24] disabled:opacity-40'
                  }`}
                >
                  <Eye className="mb-1 h-4 w-4" />
                  <span className="font-bold">SCAN</span>
                  <span className="text-[9px] text-zinc-400">
                    {scanRemaining > 0 ? `${scanRemaining}s` : `x${saved.powerUps.scan}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saved.powerUps.phase <= 0 || phaseShieldActive || phase === 'VICTORY'}
                  onClick={() => activatePowerUp('phase')}
                  className={`flex flex-col items-center rounded border p-2 font-mono text-[10px] transition ${
                    phaseShieldActive
                      ? 'border-[#fbbf24] bg-[#fbbf24]/20 text-[#fbbf24]'
                      : 'border-[#ff1e42]/30 bg-[#18070d] text-zinc-200 hover:border-[#fbbf24] hover:text-[#fbbf24] disabled:opacity-40'
                  }`}
                >
                  <Shield className="mb-1 h-4 w-4" />
                  <span className="font-bold">PHASE</span>
                  <span className="text-[9px] text-zinc-400">
                    {phaseShieldActive ? 'ARMED' : `x${saved.powerUps.phase}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saved.powerUps.magnet <= 0 || graviLockActive || phase === 'VICTORY'}
                  onClick={() => activatePowerUp('magnet')}
                  className={`flex flex-col items-center rounded border p-2 font-mono text-[10px] transition ${
                    graviLockActive
                      ? 'border-[#fbbf24] bg-[#fbbf24]/20 text-[#fbbf24]'
                      : 'border-[#ff1e42]/30 bg-[#18070d] text-zinc-200 hover:border-[#fbbf24] hover:text-[#fbbf24] disabled:opacity-40'
                  }`}
                >
                  <Magnet className="mb-1 h-4 w-4" />
                  <span className="font-bold">MAGNET</span>
                  <span className="text-[9px] text-zinc-400">
                    {graviLockActive ? 'LOCKED' : `x${saved.powerUps.magnet}`}
                  </span>
                </button>
              </div>
            </div>

            {/* Primary Tactical Action Buttons */}
            <div className="mt-auto space-y-2 pt-2">
              <button
                type="button"
                disabled={phase !== 'PAUSED'}
                onClick={() => handleEngage(true)}
                className="flex w-full items-center justify-center gap-2 rounded border border-[#ff4d6d] bg-[#ff1e42] py-2.5 font-mono text-xs font-bold tracking-widest text-white shadow-[0_0_20px_rgba(255,30,66,0.45)] transition hover:bg-[#ff3355] active:scale-[0.99] disabled:opacity-40"
              >
                <Zap className="h-4 w-4 fill-white" />
                {bouncesUsed === 0 ? 'ENGAGE // LAUNCH' : 'DEPLOY & RESUME'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                {bouncesUsed > 0 && phase === 'PAUSED' ? (
                  <button
                    type="button"
                    onClick={() => handleEngage(false)}
                    className="flex items-center justify-center gap-1.5 rounded border border-white/25 bg-[#1b080e] py-2 font-mono text-[11px] font-semibold text-zinc-200 transition hover:border-white/50 hover:text-white"
                  >
                    <FastForward className="h-3.5 w-3.5 text-[#ff4d6d]" />
                    SKIP MIRROR
                  </button>
                ) : (
                  <div className="flex items-center justify-center rounded border border-white/10 bg-[#0c0407] px-2 py-2 font-mono text-[10px] text-zinc-500">
                    SPACE: LAUNCH
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    synth.playClick();
                    initLevel(currentLevelIdx, phase === 'FAILED');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded border border-[#ff1e42]/35 bg-[#3b0712]/50 py-2 font-mono text-[11px] font-semibold text-zinc-200 transition hover:border-[#ff1e42] hover:bg-[#ff1e42]/20"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#ff4d6d]" />
                  ABORT / RESET
                </button>
              </div>
            </div>
          </aside>
        </main>
      )}

      {/* ==================================================================== */}
      {/* VICTORY MODAL WITH ANIMATED SCORE TALLYING                           */}
      {/* ==================================================================== */}
      {screen === 'PLAY' && phase === 'VICTORY' && victoryStats && (
        <div className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative my-auto w-full max-w-md rounded-lg border border-[#ff4d6d] bg-[#110408]/95 p-6 shadow-[0_0_55px_rgba(255,30,66,0.4)]">
            <HudBrackets color="#fbbf24" />
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded border border-emerald-400/40 bg-emerald-950/60 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                EXTRACTION VERIFIED // {level.code}
              </div>

              <h3 className="mt-3 font-mono text-2xl font-extrabold tracking-wider text-white">
                PROTOCOL CLEARED
              </h3>

              {/* 3-Star Display */}
              <div className="my-5 flex items-center justify-center gap-3">
                {[1, 2, 3].map((s) => (
                  <Star
                    key={s}
                    className={`h-10 w-10 transition-transform duration-500 ${
                      s <= victoryStats.stars
                        ? 'scale-110 fill-[#fbbf24] text-[#fbbf24] drop-shadow-[0_0_14px_rgba(251,191,36,0.85)]'
                        : 'text-zinc-800'
                    }`}
                  />
                ))}
              </div>

              {/* Animated Score Tally */}
              <div className="rounded border border-[#ff1e42]/35 bg-[#070305] py-3">
                <div className="font-mono text-[10px] tracking-widest text-zinc-400">
                  FINAL TACTICAL SCORE
                </div>
                <div className="mt-0.5 font-mono text-3xl font-extrabold text-white">
                  {displayScore.toLocaleString()}
                </div>
              </div>

              {/* Star Criteria Breakdown */}
              <div className="mt-4 space-y-1.5 text-left font-mono text-xs">
                <div className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5">
                  <span className="text-zinc-300">1★ Portal Extraction</span>
                  <span className="text-emerald-400">COMPLETE</span>
                </div>
                <div className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5">
                  <span className="text-zinc-300">2★ 1st Attempt Precision</span>
                  <span className={victoryStats.firstTry ? 'text-emerald-400' : 'text-zinc-500'}>
                    {victoryStats.firstTry ? 'VERIFIED (+1 POWER-UPS)' : `ATTEMPT #${attempts}`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5">
                  <span className="text-zinc-300">3★ All Data Nodes Collected</span>
                  <span className={victoryStats.allBonuses ? 'text-[#fbbf24]' : 'text-zinc-500'}>
                    {collectedBonusIds.length}/{level.bonuses.length}
                  </span>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {currentLevelIdx < LEVELS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      synth.playClick();
                      initLevel(currentLevelIdx + 1);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#ff4d6d] bg-[#ff1e42] py-2.5 font-mono text-xs font-bold tracking-wider text-white shadow-[0_0_20px_rgba(255,30,66,0.45)] transition hover:bg-[#ff3355]"
                  >
                    NEXT PROTOCOL
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      synth.playClick();
                      setScreen('MAP');
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#fbbf24] bg-[#fbbf24] py-2.5 font-mono text-xs font-bold tracking-wider text-black transition hover:bg-amber-300"
                  >
                    ALL SECTORS COMPLETE // MAP
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    synth.playClick();
                    initLevel(currentLevelIdx, false);
                  }}
                  className="flex items-center justify-center gap-1.5 rounded border border-[#ff1e42]/45 bg-[#3b0712]/60 px-4 py-2.5 font-mono text-xs font-semibold text-zinc-100 transition hover:border-[#ff1e42]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  RETRY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
