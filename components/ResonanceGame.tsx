'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Crosshair,
  Shield,
  Zap,
  Star,
  ChevronRight,
  Map,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles,
  Lock,
  Clock,
  Compass,
  Heart,
  Activity,
} from 'lucide-react';

// ============================================================================
// 1. TYPES & DATA STRUCTURES
// ============================================================================

export type ThreatProtocol = 'ORTHOGONAL_NULL' | 'RESONANCE_ABSORB' | 'PROJECTION_LOCK';

export interface Vec2 {
  x: number;
  y: number;
}

export interface ThreatWave {
  id: string;
  protocol: ThreatProtocol;
  threatVec: Vec2; // Incoming vector a = (ax, ay)
  duration: number; // Generous tactical approach timer in seconds
  /** For RESONANCE_ABSORB: +1 (Parallel) or -1 (Counter-Pulse Anti-Parallel) */
  cosTarget?: 1 | -1;
  /** For PROJECTION_LOCK: match exact dot product (a·b) or scalar projection (comp_b a) */
  targetMode?: 'DOT' | 'COMP';
  /** Target numerical value for PROJECTION_LOCK */
  targetValue?: number;
  hint: string;
  initialDefense?: Vec2;
}

export interface ResonanceLevel {
  id: number;
  code: string;
  title: string;
  topic: string;
  primaryProtocol: string;
  waves: ThreatWave[];
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
    slow: number;
    ortho: number;
    heal: number;
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

interface FloatingCallout {
  text: string;
  subtext?: string;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

// ============================================================================
// 2. ESCALATING SECTOR CONFIGURATIONS (EXPANDABLE TO 12 LECTURES)
// ============================================================================

export const LEVELS: ResonanceLevel[] = [
  {
    id: 1,
    code: 'SEC-01',
    title: 'ORTHOGONAL BARRIER',
    topic: 'LEC 01 // Dot Product & Orthogonality (a · b = 0)',
    primaryProtocol: 'ORTHOGONAL NULL',
    waves: [
      {
        id: 's1-w1',
        protocol: 'ORTHOGONAL_NULL',
        threatVec: { x: 4, y: 0 },
        duration: 30,
        hint: 'a = (4, 0) lies along the X-axis. To make a · b = 4·bx + 0·by = 0, set bx = 0 and any non-zero by (e.g. b = (0, 4)).',
        initialDefense: { x: 2, y: 2 },
      },
      {
        id: 's1-w2',
        protocol: 'ORTHOGONAL_NULL',
        threatVec: { x: 3, y: 3 },
        duration: 28,
        hint: 'Swap components and flip one sign! For a = (3, 3), setting b = (-3, 3) or (3, -3) gives 3(-3) + 3(3) = 0.',
        initialDefense: { x: 1, y: 3 },
      },
      {
        id: 's1-w3',
        protocol: 'ORTHOGONAL_NULL',
        threatVec: { x: 4, y: -2 },
        duration: 28,
        hint: 'Solve 4·bx - 2·by = 0 → by = 2·bx. Clean integer locks: b = (2, 4), (1, 2), or (-2, -4).',
        initialDefense: { x: 3, y: 1 },
      },
    ],
  },
  {
    id: 2,
    code: 'SEC-02',
    title: 'HARMONIC SYNC',
    topic: 'LEC 02 // Collinearity & Cosine Similarity (cos θ = ±1)',
    primaryProtocol: 'RESONANCE ABSORB',
    waves: [
      {
        id: 's2-w1',
        protocol: 'RESONANCE_ABSORB',
        cosTarget: 1,
        threatVec: { x: 3, y: 4 },
        duration: 30,
        hint: 'Parallel Resonance (cos θ = +1) requires b to point in the exact same direction as a = (3, 4). Set b = (3, 4).',
        initialDefense: { x: 4, y: 1 },
      },
      {
        id: 's2-w2',
        protocol: 'RESONANCE_ABSORB',
        cosTarget: -1,
        threatVec: { x: -4, y: 2 },
        duration: 28,
        hint: 'Counter-Pulse (cos θ = -1) requires the exact opposite direction: b = -k·a. Set b = (4, -2) or (2, -1).',
        initialDefense: { x: 2, y: 2 },
      },
      {
        id: 's2-w3',
        protocol: 'RESONANCE_ABSORB',
        cosTarget: -1,
        threatVec: { x: 2, y: 5 },
        duration: 26,
        hint: 'Invert both coordinates of a = (2, 5) to achieve anti-parallel phase cancellation: b = (-2, -5).',
        initialDefense: { x: -3, y: 1 },
      },
    ],
  },
  {
    id: 3,
    code: 'SEC-03',
    title: 'SCALAR TARGETS',
    topic: 'LEC 03 // Exact Dot Product Synthesis (a · b = T)',
    primaryProtocol: 'PROJECTION LOCK',
    waves: [
      {
        id: 's3-w1',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'DOT',
        targetValue: 12,
        threatVec: { x: 4, y: 0 },
        duration: 30,
        hint: 'Since a = (4, 0), a · b = 4·bx. To hit 12, set bx = 3 (with any by, e.g. b = (3, 0)).',
        initialDefense: { x: 1, y: 2 },
      },
      {
        id: 's3-w2',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'DOT',
        targetValue: 10,
        threatVec: { x: 2, y: 4 },
        duration: 30,
        hint: 'Solve 2·bx + 4·by = 10. Valid integer solutions include b = (1, 2), (3, 1), or (5, 0).',
        initialDefense: { x: 2, y: 0 },
      },
      {
        id: 's3-w3',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'DOT',
        targetValue: -12,
        threatVec: { x: 3, y: -3 },
        duration: 28,
        hint: 'Solve 3·bx - 3·by = -12 → bx - by = -4. Try b = (-2, 2), (-4, 0), or (0, 4).',
        initialDefense: { x: 1, y: 1 },
      },
    ],
  },
  {
    id: 4,
    code: 'SEC-04',
    title: 'PROJECTION MATRIX',
    topic: 'LEC 04 // Scalar & Vector Projections (comp_b a)',
    primaryProtocol: 'SCALAR PROJECTION',
    waves: [
      {
        id: 's4-w1',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'COMP',
        targetValue: 3,
        threatVec: { x: 3, y: 4 },
        duration: 30,
        hint: 'comp_b(a) = (a · b) / |b| is the shadow length of a onto b. Point b along the +X axis (e.g. b = (4, 0)) so its unit vector is (1, 0) and shadow = ax = 3!',
        initialDefense: { x: 2, y: 3 },
      },
      {
        id: 's4-w2',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'COMP',
        targetValue: 4,
        threatVec: { x: -3, y: 4 },
        duration: 30,
        hint: 'Project a = (-3, 4) onto the +Y axis by setting b = (0, 4). Then b̂ = (0, 1) and comp_b(a) = ay = 4.',
        initialDefense: { x: 3, y: 2 },
      },
      {
        id: 's4-w3',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'COMP',
        targetValue: 5,
        threatVec: { x: 3, y: 4 },
        duration: 28,
        hint: 'The maximum possible scalar projection is |a| = √(3² + 4²) = 5, achieved when b points directly along a: set b = (3, 4).',
        initialDefense: { x: 4, y: -1 },
      },
    ],
  },
  {
    id: 5,
    code: 'SEC-05',
    title: 'QUANTUM OVERLOAD',
    topic: 'LEC 05 // Multi-Protocol Tactical Defense Synthesis',
    primaryProtocol: 'HYBRID PROTOCOL',
    waves: [
      {
        id: 's5-w1',
        protocol: 'ORTHOGONAL_NULL',
        threatVec: { x: -2, y: 5 },
        duration: 26,
        hint: 'For a = (-2, 5), nullify via -2·bx + 5·by = 0. Set b = (5, 2) or (-5, -2).',
        initialDefense: { x: 1, y: -2 },
      },
      {
        id: 's5-w2',
        protocol: 'RESONANCE_ABSORB',
        cosTarget: -1,
        threatVec: { x: 4, y: -3 },
        duration: 25,
        hint: 'Counter-Pulse requires opposite direction to a = (4, -3): set b = (-4, 3).',
        initialDefense: { x: 2, y: 2 },
      },
      {
        id: 's5-w3',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'DOT',
        targetValue: 15,
        threatVec: { x: 3, y: 3 },
        duration: 26,
        hint: 'Solve 3·bx + 3·by = 15 → bx + by = 5. Any integer pair summing to 5 locks: (3, 2), (4, 1), or (5, 0).',
        initialDefense: { x: 1, y: 1 },
      },
      {
        id: 's5-w4',
        protocol: 'PROJECTION_LOCK',
        targetMode: 'COMP',
        targetValue: -4,
        threatVec: { x: 4, y: 3 },
        duration: 26,
        hint: 'A negative scalar projection means b points opposite to the X-component of a = (4, 3). Aim along -X: b = (-4, 0) gives comp_b(a) = -4!',
        initialDefense: { x: 2, y: -2 },
      },
    ],
  },
];

// ============================================================================
// 3. CONSTANTS & VECTOR MATH UTILITIES
// ============================================================================

const WORLD_RADIUS = 6.5;
const MAX_CORE_HP = 3;
const STORAGE_KEY = 'resonance_dot_protocol_v1';

const DEFAULT_SAVED_STATE: SavedState = {
  levels: {},
  unlockedLevel: 1,
  powerUps: { slow: 2, ortho: 2, heal: 2 },
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function mag(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

interface VectorMetrics {
  dotVal: number;
  magA: number;
  magB: number;
  cosTheta: number;
  angleDeg: number;
  scalarProj: number; // comp_b(a) = (a·b) / |b|
  projVec: Vec2; // proj_b(a) = ((a·b) / |b|^2) * b
  validB: boolean;
}

function computeVectorMetrics(a: Vec2, b: Vec2): VectorMetrics {
  const magA = mag(a);
  const magB = mag(b);
  const dotVal = dot(a, b);
  const validB = magB >= 0.25;

  if (!validB || magA < 1e-6) {
    return {
      dotVal: 0,
      magA,
      magB,
      cosTheta: 0,
      angleDeg: 90,
      scalarProj: 0,
      projVec: { x: 0, y: 0 },
      validB: false,
    };
  }

  const cosTheta = clamp(dotVal / (magA * magB), -1, 1);
  const angleDeg = (Math.acos(cosTheta) * 180) / Math.PI;
  const scalarProj = dotVal / magB;
  const projScale = dotVal / (magB * magB);
  const projVec = { x: b.x * projScale, y: b.y * projScale };

  return { dotVal, magA, magB, cosTheta, angleDeg, scalarProj, projVec, validB };
}

interface LockEvaluation {
  matched: boolean;
  exact: boolean;
  closeness: number; // 0..1 visual resonance lock proximity
  statusText: string;
  mismatchReason: string;
}

function evaluateWaveLock(wave: ThreatWave, b: Vec2, m: VectorMetrics): LockEvaluation {
  if (!m.validB) {
    return {
      matched: false,
      exact: false,
      closeness: 0,
      statusText: 'ZERO VECTOR // INCREASE |b|',
      mismatchReason: 'Defense vector b cannot be (0, 0). Set non-zero coordinates.',
    };
  }

  const isInt = Number.isInteger(b.x) && Number.isInteger(b.y);

  if (wave.protocol === 'ORTHOGONAL_NULL') {
    const absCos = Math.abs(m.cosTheta);
    const absDot = Math.abs(m.dotVal);
    const matched = absCos <= 0.035 || absDot <= 0.12;
    const exact = absDot < 1e-5 && isInt;
    const closeness = clamp(1 - absCos / 0.5, 0, 1);
    return {
      matched,
      exact,
      closeness,
      statusText: matched ? 'ORTHOGONAL LOCK READY' : `TARGET: a·b = 0 (NOW ${m.dotVal.toFixed(1)})`,
      mismatchReason: `Dot product is ${m.dotVal.toFixed(2)} (θ = ${m.angleDeg.toFixed(1)}°). Need a·b = 0 (90°).`,
    };
  }

  if (wave.protocol === 'RESONANCE_ABSORB') {
    const targetCos = wave.cosTarget ?? 1;
    const diff = Math.abs(m.cosTheta - targetCos);
    const matched = diff <= 0.008;
    const exact = diff < 1e-4 && isInt;
    const closeness = clamp(1 - diff / 0.5, 0, 1);
    const label = targetCos === 1 ? 'PARALLEL (+1)' : 'COUNTER-PULSE (-1)';
    return {
      matched,
      exact,
      closeness,
      statusText: matched ? `${label} SYNC READY` : `TARGET: cos θ = ${targetCos > 0 ? '+1' : '-1'}`,
      mismatchReason: `Current cos θ = ${m.cosTheta.toFixed(2)} (${m.angleDeg.toFixed(1)}°). Need ${label}.`,
    };
  }

  // PROJECTION_LOCK
  const mode = wave.targetMode ?? 'DOT';
  const target = wave.targetValue ?? 0;
  if (mode === 'DOT') {
    const err = Math.abs(m.dotVal - target);
    const matched = err <= 0.2;
    const exact = err < 1e-5 && isInt;
    const closeness = clamp(1 - err / Math.max(4, Math.abs(target) + 2), 0, 1);
    return {
      matched,
      exact,
      closeness,
      statusText: matched ? `DOT TARGET ${target} LOCKED` : `TARGET: a·b = ${target}`,
      mismatchReason: `Current a·b = ${m.dotVal.toFixed(2)}. Adjust b so a·b = ${target}.`,
    };
  } else {
    const err = Math.abs(m.scalarProj - target);
    const matched = err <= 0.14;
    const exact = err < 0.01 && isInt;
    const closeness = clamp(1 - err / Math.max(3, Math.abs(target) + 1.5), 0, 1);
    return {
      matched,
      exact,
      closeness,
      statusText: matched ? `PROJECTION ${target} LOCKED` : `TARGET: comp_b(a) = ${target}`,
      mismatchReason: `Current comp_b(a) = ${m.scalarProj.toFixed(2)}. Need ${target}.`,
    };
  }
}

// ============================================================================
// 4. PROCEDURAL WEB AUDIO SYNTHESIZER (ZERO EXTERNAL AUDIO FILES)
// ============================================================================

class ResonanceSynth {
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

  /** Crisp radar lock-on ping when vectors enter tolerance */
  playRadarPing() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.07);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** Harmonic resonance chord on verified threat neutralization */
  playResonanceMatch(combo: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const shift = Math.pow(1.06, Math.min(combo, 6));
    const freqs = [329.63 * shift, 493.88 * shift, 659.25 * shift, 987.77 * shift];

    // Sub-bass anchor pulse
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(150, now);
    bass.frequency.exponentialRampToValueAtTime(48, now + 0.22);
    bassGain.gain.setValueAtTime(0.28, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.start(now);
    bass.stop(now + 0.26);

    // Harmonic shimmer chord
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      const t = now + idx * 0.035;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.11, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  /** Short warning buzz on misaligned lock attempt */
  playMismatch() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.16);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Heavy distorted bass thud on Quantum Core impact */
  playCoreHit() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const shaper = ctx.createWaveShaper();
    const gain = ctx.createGain();

    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1;
      curve[i] = ((3 + 22) * x * 20 * (Math.PI / 180)) / (Math.PI + 22 * Math.abs(x));
    }
    shaper.curve = curve;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.34);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(shaper);
    shaper.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  /** Victory sci-fi fanfare */
  playVictory() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [293.66, 440.0, 554.37, 659.25, 880.0];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'triangle' : 'sine';
      const t = now + i * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.95);
    });
  }

  /** Tactical power-up activation sound */
  playPowerUp() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(1240, now + 0.18);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  /** Subtle UI click */
  playClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.03);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  }
}

const synth = new ResonanceSynth();

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
        slow: parsed.powerUps?.slow ?? 2,
        ortho: parsed.powerUps?.ortho ?? 2,
        heal: parsed.powerUps?.heal ?? 2,
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
    // Ignore storage quota errors
  }
}

// ============================================================================
// 6. REUSABLE TACTICAL HUD SUB-COMPONENTS
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

interface AxisControlProps {
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (val: number) => void;
}

const AxisControl: React.FC<AxisControlProps> = ({
  label,
  symbol,
  value,
  min,
  max,
  step,
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
          <span className="inline-flex h-5 min-w-[26px] items-center justify-center rounded bg-[#ff1e42]/20 px-1.5 font-mono text-xs font-bold text-[#ff4d6d]">
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
        className="rdp-slider w-full cursor-pointer disabled:opacity-40"
      />
    </div>
  );
};

// ============================================================================
// 7. MAIN COMPONENT: RESONANCE // DOT PROTOCOL
// ============================================================================

export default function ResonanceGame() {
  const [saved, setSaved] = useState<SavedState>(() => loadSavedState());
  const [muted, setMuted] = useState(false);

  // --- Screens & Level Progression ---
  const [screen, setScreen] = useState<'START' | 'MAP' | 'PLAY'>('START');
  const [levelIdx, setLevelIdx] = useState(0);
  const [waveIdx, setWaveIdx] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // --- Combat / Telemetry UI State ---
  const [phase, setPhase] = useState<'ACTIVE' | 'TRANSITION' | 'FAILED' | 'VICTORY'>('ACTIVE');
  const [coreHp, setCoreHp] = useState(MAX_CORE_HP);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [overdrive, setOverdrive] = useState(0); // 0..100
  const [timeLeft, setTimeLeft] = useState(LEVELS[0].waves[0].duration);
  const [defense, setDefense] = useState<Vec2>(LEVELS[0].waves[0].initialDefense ?? { x: 2, y: 2 });
  const [hoverCoord, setHoverCoord] = useState<Vec2 | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    kind: 'error' | 'info' | 'success';
    text: string;
  } | null>(null);

  // --- Power-Up Active Timers ---
  const [slowRemaining, setSlowRemaining] = useState(0);
  const [orthoRemaining, setOrthoRemaining] = useState(0);

  // --- Victory Modal State ---
  const [victoryStats, setVictoryStats] = useState<{
    totalScore: number;
    stars: number;
    noDamage: boolean;
    highAccuracy: boolean;
    replenished: boolean;
  } | null>(null);
  const [displayScore, setDisplayScore] = useState(0);

  const level = LEVELS[levelIdx];
  const wave = level.waves[Math.min(waveIdx, level.waves.length - 1)];
  const metrics = computeVectorMetrics(wave.threatVec, defense);
  const lockEval = evaluateWaveLock(wave, defense, metrics);
  const multiplier = combo >= 4 ? 3 : combo >= 2 ? 2 : 1;

  // --- Mutable 60fps Engine State Ref ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const wasLockedRef = useRef(false);

  const simRef = useRef<{
    phase: 'ACTIVE' | 'TRANSITION' | 'FAILED' | 'VICTORY';
    levelIdx: number;
    waveIdx: number;
    coreHp: number;
    damageTaken: number;
    misfires: number;
    exactLocks: number;
    attempts: number;
    score: number;
    combo: number;
    overdrive: number;
    timeLeft: number;
    waveDuration: number;
    defense: Vec2;
    slowTimer: number;
    orthoTimer: number;
    hitStopTimer: number;
    transitionTimer: number;
    shakeTimer: number;
    shakeIntensity: number;
    glitchTimer: number;
    pulseWaveTimer: number;
    radarAngle: number;
    time: number;
    particles: Particle[];
    shockwaves: Shockwave[];
    callouts: FloatingCallout[];
    scale: number;
    offsetX: number;
    offsetY: number;
  }>({
    phase: 'ACTIVE',
    levelIdx: 0,
    waveIdx: 0,
    coreHp: MAX_CORE_HP,
    damageTaken: 0,
    misfires: 0,
    exactLocks: 0,
    attempts: 1,
    score: 0,
    combo: 0,
    overdrive: 0,
    timeLeft: LEVELS[0].waves[0].duration,
    waveDuration: LEVELS[0].waves[0].duration,
    defense: LEVELS[0].waves[0].initialDefense ?? { x: 2, y: 2 },
    slowTimer: 0,
    orthoTimer: 0,
    hitStopTimer: 0,
    transitionTimer: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    glitchTimer: 0,
    pulseWaveTimer: 0,
    radarAngle: 0,
    time: 0,
    particles: [],
    shockwaves: [],
    callouts: [],
    scale: 38,
    offsetX: 300,
    offsetY: 260,
  });

  // Sync mute state
  useEffect(() => {
    synth.muted = muted;
  }, [muted]);

  // Sync defense vector to simRef & trigger subtle radar lock ping when entering lock
  useEffect(() => {
    simRef.current.defense = defense;
    if (screen === 'PLAY' && phase === 'ACTIVE') {
      if (lockEval.matched && !wasLockedRef.current) {
        synth.playRadarPing();
      }
      wasLockedRef.current = lockEval.matched;
    } else {
      wasLockedRef.current = false;
    }
  }, [defense, lockEval.matched, screen, phase]);

  // Victory animated score tally
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

  // --- VFX Helpers ---
  const spawnSparks = useCallback((x: number, y: number, color: string, count = 24, speed = 5.5) => {
    const s = simRef.current;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.9) * speed;
      s.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        size: 1.5 + Math.random() * 2.5,
        color,
      });
    }
  }, []);

  const spawnShockwave = useCallback((x: number, y: number, color: string, maxRadius = 4.2) => {
    simRef.current.shockwaves.push({
      x,
      y,
      radius: 0.2,
      maxRadius,
      life: 0.5,
      maxLife: 0.5,
      color,
    });
  }, []);

  const spawnCallout = useCallback((text: string, color: string, subtext?: string, y = 2.2) => {
    simRef.current.callouts.push({
      text,
      subtext,
      x: 0,
      y,
      life: 1.35,
      maxLife: 1.35,
      color,
    });
  }, []);

  // --- Initialize / Reset Sector ---
  const initSector = useCallback((idx: number, keepAttempts = false) => {
    const lvl = LEVELS[idx];
    const firstWave = lvl.waves[0];
    const initDef = firstWave.initialDefense ?? { x: 2, y: 2 };
    const nextAttempts = keepAttempts ? simRef.current.attempts + 1 : 1;

    setLevelIdx(idx);
    setWaveIdx(0);
    setPhase('ACTIVE');
    setCoreHp(MAX_CORE_HP);
    setScore(0);
    setCombo(0);
    setOverdrive(0);
    setTimeLeft(firstWave.duration);
    setDefense(initDef);
    setShowHint(false);
    setFeedbackBanner(null);
    setSlowRemaining(0);
    setOrthoRemaining(0);
    setVictoryStats(null);
    setDisplayScore(0);

    const s = simRef.current;
    s.phase = 'ACTIVE';
    s.levelIdx = idx;
    s.waveIdx = 0;
    s.coreHp = MAX_CORE_HP;
    s.damageTaken = 0;
    s.misfires = 0;
    s.exactLocks = 0;
    s.attempts = nextAttempts;
    s.score = 0;
    s.combo = 0;
    s.overdrive = 0;
    s.timeLeft = firstWave.duration;
    s.waveDuration = firstWave.duration;
    s.defense = initDef;
    s.slowTimer = 0;
    s.orthoTimer = 0;
    s.hitStopTimer = 0;
    s.transitionTimer = 0;
    s.shakeTimer = 0;
    s.glitchTimer = 0;
    s.pulseWaveTimer = 0;
    s.particles = [];
    s.shockwaves = [];
    s.callouts = [];
    wasLockedRef.current = false;
  }, []);

  // --- Trigger Victory ---
  const triggerVictory = useCallback(() => {
    const s = simRef.current;
    const lvl = LEVELS[s.levelIdx];
    s.phase = 'VICTORY';
    setPhase('VICTORY');
    synth.playVictory();
    spawnShockwave(0, 0, '#34d399', 6.0);
    spawnShockwave(0, 0, '#fbbf24', 4.5);
    spawnSparks(0, 0, '#34d399', 36, 7);
    spawnSparks(0, 0, '#ffffff', 22, 6);

    const noDamage = s.damageTaken === 0;
    const highAccuracy = s.misfires === 0 && s.exactLocks >= Math.ceil(lvl.waves.length * 0.6);
    let stars = 1;
    if (noDamage && highAccuracy) stars = 3;
    else if (noDamage || highAccuracy) stars = 2;

    const clearBonus = 800 + (noDamage ? 500 : 0) + (highAccuracy ? 400 : 0);
    const totalScore = s.score + clearBonus;
    s.score = totalScore;
    setScore(totalScore);

    const replenished = noDamage && s.attempts === 1;
    setSaved((prev) => {
      const existing = prev.levels[lvl.id];
      const bestStars = Math.max(existing?.stars ?? 0, stars);
      const bestScore = Math.max(existing?.bestScore ?? 0, totalScore);
      const nextUnlocked = Math.min(LEVELS.length, Math.max(prev.unlockedLevel, lvl.id + 1));
      const nextPowerUps = replenished
        ? {
            slow: Math.min(3, prev.powerUps.slow + 1),
            ortho: Math.min(3, prev.powerUps.ortho + 1),
            heal: Math.min(3, prev.powerUps.heal + 1),
          }
        : prev.powerUps;

      const updated: SavedState = {
        levels: {
          ...prev.levels,
          [lvl.id]: { stars: bestStars, bestScore, cleared: true },
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
      noDamage,
      highAccuracy,
      replenished,
    });
  }, [spawnShockwave, spawnSparks]);

  // --- Engage / Fire Shield Lock ---
  const handleEngageLock = useCallback(() => {
    const s = simRef.current;
    if (s.phase !== 'ACTIVE') return;

    const lvl = LEVELS[s.levelIdx];
    const activeWave = lvl.waves[s.waveIdx];
    const m = computeVectorMetrics(activeWave.threatVec, s.defense);
    const ev = evaluateWaveLock(activeWave, s.defense, m);

    if (ev.matched) {
      // SUCCESSFUL NEUTRALIZATION!
      s.combo += 1;
      const mult = s.combo >= 4 ? 3 : s.combo >= 2 ? 2 : 1;
      const speedRatio = clamp(s.timeLeft / s.waveDuration, 0, 1);
      const fastLock = speedRatio >= 0.45;
      if (ev.exact || fastLock) {
        s.exactLocks += 1;
      }

      const basePts = 400;
      const speedPts = Math.round(speedRatio * 300);
      const precisionPts = ev.exact ? 250 : 0;
      let earned = (basePts + speedPts + precisionPts) * mult;

      // Build Overdrive bar
      const odGain = ev.exact ? 40 : 28;
      s.overdrive += odGain;
      let overdriveTriggered = false;
      if (s.overdrive >= 100) {
        s.overdrive = 0;
        earned += 500;
        overdriveTriggered = true;
      }

      s.score += earned;
      s.hitStopTimer = 0.045;
      s.shakeTimer = 0.2;
      s.shakeIntensity = overdriveTriggered ? 9 : 6;
      s.pulseWaveTimer = 0.45;

      synth.playResonanceMatch(s.combo);
      spawnShockwave(0, 0, '#34d399', 5.2);
      spawnShockwave(activeWave.threatVec.x, activeWave.threatVec.y, '#fbbf24', 2.4);
      spawnSparks(activeWave.threatVec.x, activeWave.threatVec.y, '#34d399', 26, 6.2);
      spawnSparks(0, 0, '#ffffff', 16, 5.0);

      if (overdriveTriggered) {
        spawnShockwave(0, 0, '#fbbf24', 6.2);
        spawnCallout('OVERDRIVE SURGE!', '#fbbf24', `+${earned} PTS // ${mult}X COMBO`, 2.6);
      } else {
        const headline =
          activeWave.protocol === 'ORTHOGONAL_NULL'
            ? 'PHASE NULLIFIED'
            : activeWave.protocol === 'RESONANCE_ABSORB'
              ? 'RESONANCE SYNC'
              : 'PROJECTION LOCKED';
        spawnCallout(
          headline,
          '#34d399',
          `+${earned} PTS${ev.exact ? ' // EXACT INTEGER' : ''}`,
          2.4
        );
      }

      setScore(s.score);
      setCombo(s.combo);
      setOverdrive(s.overdrive);
      setFeedbackBanner({
        kind: 'success',
        text: `${overdriveTriggered ? 'OVERDRIVE +500! ' : ''}WAVE ${s.waveIdx + 1}/${lvl.waves.length} NEUTRALIZED (+${earned} PTS)`,
      });

      // Advance to next wave or victory
      if (s.waveIdx >= lvl.waves.length - 1) {
        triggerVictory();
      } else {
        s.phase = 'TRANSITION';
        s.transitionTimer = 0.85;
        setPhase('TRANSITION');
      }
    } else {
      // MISALIGNED SHIELD LOCK -> Recoil penalty (-2.5s), combo break, crimson glitch
      s.misfires += 1;
      s.combo = 0;
      s.timeLeft = Math.max(0.2, s.timeLeft - 2.5);
      s.glitchTimer = 0.25;
      s.shakeTimer = 0.18;
      s.shakeIntensity = 6;
      synth.playMismatch();
      spawnSparks(s.defense.x, s.defense.y, '#ff1e42', 14, 4.5);
      spawnCallout('LOCK REJECTED', '#ff4d6d', '-2.5s TIMER // RECALCULATE', 2.2);

      setCombo(0);
      setTimeLeft(Number(s.timeLeft.toFixed(1)));
      setFeedbackBanner({ kind: 'error', text: ev.mismatchReason });
    }
  }, [spawnCallout, spawnShockwave, spawnSparks, triggerVictory]);

  // --- Activate Power-Up ---
  const activatePowerUp = useCallback(
    (type: 'slow' | 'ortho' | 'heal') => {
      const s = simRef.current;
      if (s.phase !== 'ACTIVE') return;
      if (saved.powerUps[type] <= 0) return;

      if (type === 'slow' && s.slowTimer > 0) return;
      if (type === 'ortho' && s.orthoTimer > 0) return;
      if (type === 'heal' && s.coreHp >= MAX_CORE_HP) return;

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

      if (type === 'slow') {
        s.slowTimer = 5.0;
        setSlowRemaining(5.0);
        spawnCallout('TIME DILATE', '#fbbf24', '60% THREAT SLOWDOWN (5s)', 2.5);
        setFeedbackBanner({ kind: 'info', text: 'TIME DILATE ACTIVE // Threat approach slowed by 60%' });
      } else if (type === 'ortho') {
        s.orthoTimer = 2.5;
        setOrthoRemaining(2.5);
        spawnCallout('ORTHO-SNAP ASSIST', '#34d399', 'REFERENCE AXIS PROJECTED (2.5s)', 2.5);
        setFeedbackBanner({ kind: 'info', text: 'ORTHO-SNAP ACTIVE // Reference axis highlighted on radar' });
      } else if (type === 'heal') {
        s.coreHp = Math.min(MAX_CORE_HP, s.coreHp + 1);
        setCoreHp(s.coreHp);
        spawnShockwave(0, 0, '#34d399', 2.6);
        spawnSparks(0, 0, '#34d399', 20, 5);
        spawnCallout('CORE REPAIRED', '#34d399', '+1 QUANTUM INTEGRITY', 2.5);
        setFeedbackBanner({ kind: 'success', text: 'CORE INTEGRITY RESTORED (+1 HP)' });
      }
    },
    [saved, spawnCallout, spawnShockwave, spawnSparks]
  );

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
          handleEngageLock();
        }
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        if (phase === 'ACTIVE') {
          e.preventDefault();
          handleEngageLock();
        } else if (phase === 'FAILED') {
          e.preventDefault();
          initSector(levelIdx, true);
        }
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        initSector(levelIdx, phase === 'FAILED');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screen, phase, levelIdx, handleEngageLock, initSector]);

  // ==========================================================================
  // 8. MAIN 60FPS SIMULATION & TACTICAL RADAR CANVAS RENDERING LOOP
  // ==========================================================================

  useEffect(() => {
    if (screen !== 'PLAY') return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(300, Math.floor(rect.width * dpr));
      canvas.height = Math.max(260, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId = 0;
    let lastTime = performance.now();
    let uiTimerSync = 0;

    const loop = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const s = simRef.current;
      s.time += rawDt;

      // Hit-stop micro-freeze for tactile lock punch
      const simDt = s.hitStopTimer > 0 ? 0 : rawDt;
      if (s.hitStopTimer > 0) s.hitStopTimer = Math.max(0, s.hitStopTimer - rawDt);

      // Rotate radar sweep smoothly
      s.radarAngle = (s.radarAngle + rawDt * (s.slowTimer > 0 ? 0.35 : 0.9)) % (Math.PI * 2);

      // Update VFX timers
      if (s.shakeTimer > 0) s.shakeTimer = Math.max(0, s.shakeTimer - rawDt);
      if (s.glitchTimer > 0) s.glitchTimer = Math.max(0, s.glitchTimer - rawDt);
      if (s.pulseWaveTimer > 0) s.pulseWaveTimer = Math.max(0, s.pulseWaveTimer - rawDt);

      // Power-up timers
      if (s.slowTimer > 0) {
        s.slowTimer = Math.max(0, s.slowTimer - rawDt);
        setSlowRemaining(Number(s.slowTimer.toFixed(1)));
      }
      if (s.orthoTimer > 0) {
        s.orthoTimer = Math.max(0, s.orthoTimer - rawDt);
        setOrthoRemaining(Number(s.orthoTimer.toFixed(1)));
      }

      // Particles, shockwaves & floating callouts
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i];
        p.x += p.vx * rawDt;
        p.y += p.vy * rawDt;
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.life -= rawDt;
        if (p.life <= 0) s.particles.splice(i, 1);
      }

      for (let i = s.shockwaves.length - 1; i >= 0; i--) {
        const sw = s.shockwaves[i];
        sw.life -= rawDt;
        const t = 1 - Math.max(0, sw.life / sw.maxLife);
        sw.radius = 0.2 + (sw.maxRadius - 0.2) * (1 - Math.pow(1 - t, 2.2));
        if (sw.life <= 0) s.shockwaves.splice(i, 1);
      }

      for (let i = s.callouts.length - 1; i >= 0; i--) {
        const c = s.callouts[i];
        c.life -= rawDt;
        c.y += 0.45 * rawDt;
        if (c.life <= 0) s.callouts.splice(i, 1);
      }

      // Wave transition countdown
      if (s.phase === 'TRANSITION') {
        s.transitionTimer -= rawDt;
        if (s.transitionTimer <= 0) {
          const nextIdx = s.waveIdx + 1;
          const nextWave = LEVELS[s.levelIdx].waves[nextIdx];
          s.waveIdx = nextIdx;
          s.timeLeft = nextWave.duration;
          s.waveDuration = nextWave.duration;
          s.phase = 'ACTIVE';
          const initDef = nextWave.initialDefense ?? { x: 2, y: 2 };
          s.defense = initDef;
          setWaveIdx(nextIdx);
          setTimeLeft(nextWave.duration);
          setDefense(initDef);
          setShowHint(false);
          setPhase('ACTIVE');
        }
      }

      // Active threat countdown
      if (s.phase === 'ACTIVE' && simDt > 0) {
        const rate = s.slowTimer > 0 ? 0.4 : 1.0;
        s.timeLeft = Math.max(0, s.timeLeft - simDt * rate);
        uiTimerSync += rawDt;
        if (uiTimerSync >= 0.08) {
          uiTimerSync = 0;
          setTimeLeft(Number(s.timeLeft.toFixed(1)));
        }

        if (s.timeLeft <= 0) {
          // Threat strikes Quantum Core!
          s.coreHp = Math.max(0, s.coreHp - 1);
          s.damageTaken += 1;
          s.combo = 0;
          s.glitchTimer = 0.42;
          s.shakeTimer = 0.3;
          s.shakeIntensity = 11;
          synth.playCoreHit();
          spawnShockwave(0, 0, '#ff1e42', 4.6);
          spawnSparks(0, 0, '#ff1e42', 32, 7.2);
          setCoreHp(s.coreHp);
          setCombo(0);

          if (s.coreHp <= 0) {
            s.phase = 'FAILED';
            setPhase('FAILED');
            setFeedbackBanner({
              kind: 'error',
              text: 'QUANTUM CORE BREACHED // SIGNAL TERMINATED',
            });
          } else {
            // Re-engage current wave with fresh timer after impact
            const curWave = LEVELS[s.levelIdx].waves[s.waveIdx];
            s.timeLeft = curWave.duration;
            setTimeLeft(curWave.duration);
            spawnCallout('CORE IMPACT! -1 HP', '#ff1e42', 'SHIELD REBOOTING WAVE', 2.4);
            setFeedbackBanner({
              kind: 'error',
              text: `CORE HIT! ${s.coreHp}/${MAX_CORE_HP} HP REMAINING — RE-LOCK VECTOR`,
            });
          }
        }
      }

      // ======================================================================
      // RENDER TACTICAL RADAR & VECTOR PROJECTION CANVAS
      // ======================================================================
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const pad = 30;
      const scale = Math.min((cw - pad * 2) / (WORLD_RADIUS * 2), (ch - pad * 2) / (WORLD_RADIUS * 2));
      const offsetX = cw / 2;
      const offsetY = ch / 2;
      s.scale = scale;
      s.offsetX = offsetX;
      s.offsetY = offsetY;

      const toScreenX = (wx: number) => offsetX + wx * scale;
      const toScreenY = (wy: number) => offsetY - wy * scale;

      const activeLvl = LEVELS[s.levelIdx];
      const activeWave = activeLvl.waves[Math.min(s.waveIdx, activeLvl.waves.length - 1)];
      const m = computeVectorMetrics(activeWave.threatVec, s.defense);
      const ev = evaluateWaveLock(activeWave, s.defense, m);

      ctx.save();

      // Screen Shake
      if (s.shakeTimer > 0) {
        const intensity = (s.shakeTimer / 0.25) * s.shakeIntensity;
        ctx.translate((Math.random() - 0.5) * intensity, (Math.random() - 0.5) * intensity);
      }

      // 1. Deep Obsidian Base + Subtle Crimson Radial Core Glow
      ctx.fillStyle = '#070305';
      ctx.fillRect(-20, -20, cw + 40, ch + 40);

      const bgGlow = ctx.createRadialGradient(offsetX, offsetY, scale * 0.4, offsetX, offsetY, scale * 6.8);
      bgGlow.addColorStop(0, s.slowTimer > 0 ? 'rgba(251, 191, 36, 0.16)' : 'rgba(59, 7, 18, 0.42)');
      bgGlow.addColorStop(0.55, 'rgba(20, 4, 9, 0.18)');
      bgGlow.addColorStop(1, 'rgba(7, 3, 5, 0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, cw, ch);

      // 2. Cartesian Grid (subtle behind radar)
      ctx.save();
      ctx.lineWidth = 1;
      for (let g = -6; g <= 6; g++) {
        const gx = toScreenX(g);
        const gy = toScreenY(g);
        ctx.strokeStyle = g === 0 ? 'rgba(255, 77, 109, 0.38)' : 'rgba(255, 30, 66, 0.08)';
        ctx.beginPath();
        ctx.moveTo(gx, toScreenY(6.2));
        ctx.lineTo(gx, toScreenY(-6.2));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toScreenX(-6.2), gy);
        ctx.lineTo(toScreenX(6.2), gy);
        ctx.stroke();
      }

      // 3. Circular Tactical Radar Rings + Degree Ticks + Rotating Sweep
      const radarMaxR = 6 * scale;
      for (let r = 1; r <= 6; r++) {
        ctx.strokeStyle = r === 6 ? 'rgba(255, 30, 66, 0.36)' : 'rgba(255, 30, 66, 0.13)';
        ctx.lineWidth = r === 6 ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, r * scale, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Degree spokes every 45 deg
      ctx.strokeStyle = 'rgba(255, 77, 109, 0.12)';
      ctx.setLineDash([4, 6]);
      for (let deg = 0; deg < 360; deg += 45) {
        if (deg % 90 === 0) continue;
        const rad = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        ctx.lineTo(offsetX + Math.cos(rad) * radarMaxR, offsetY - Math.sin(rad) * radarMaxR);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Rotating radar sweep sector
      ctx.save();
      ctx.translate(offsetX, offsetY);
      const sweepSpan = 0.52;
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const a0 = -s.radarAngle + (i / steps) * sweepSpan;
        const a1 = -s.radarAngle + ((i + 1) / steps) * sweepSpan;
        const alpha = (1 - i / steps) * 0.11;
        ctx.fillStyle = s.slowTimer > 0 ? `rgba(251, 191, 36, ${alpha})` : `rgba(255, 30, 66, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radarMaxR, a0, a1);
        ctx.closePath();
        ctx.fill();
      }
      // Crisp leading radar beam
      ctx.strokeStyle = s.slowTimer > 0 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(255, 77, 109, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(-s.radarAngle) * radarMaxR, Math.sin(-s.radarAngle) * radarMaxR);
      ctx.stroke();
      ctx.restore();

      // Axis ticks & degree labels
      ctx.font = '10px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace';
      ctx.fillStyle = 'rgba(255, 160, 178, 0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let x = -6; x <= 6; x += 2) {
        if (x === 0) continue;
        ctx.fillText(String(x), toScreenX(x), toScreenY(0) + 5);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = -6; y <= 6; y += 2) {
        if (y === 0) continue;
        ctx.fillText(String(y), toScreenX(0) - 6, toScreenY(y));
      }
      ctx.fillStyle = 'rgba(255, 77, 109, 0.8)';
      ctx.textAlign = 'left';
      ctx.fillText('+X (0°)', toScreenX(6) + 5, toScreenY(0) - 10);
      ctx.textAlign = 'center';
      ctx.fillText('+Y (90°)', toScreenX(0), toScreenY(6) - 14);
      ctx.restore();

      // 4. ORTHO-SNAP POWER-UP ASSIST GUIDE (2.5s)
      if (s.orthoTimer > 0 && s.phase === 'ACTIVE') {
        const a = activeWave.threatVec;
        const aLen = Math.max(1e-4, mag(a));
        // Perpendicular unit vector (-ay, ax) / |a|
        const perp = { x: -a.y / aLen, y: a.x / aLen };
        const dir =
          activeWave.protocol === 'RESONANCE_ABSORB'
            ? { x: (a.x / aLen) * (activeWave.cosTarget ?? 1), y: (a.y / aLen) * (activeWave.cosTarget ?? 1) }
            : perp;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(toScreenX(-dir.x * 6), toScreenY(-dir.y * 6));
        ctx.lineTo(toScreenX(dir.x * 6), toScreenY(dir.y * 6));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#34d399';
        ctx.fillText(
          activeWave.protocol === 'RESONANCE_ABSORB' ? 'SYNC AXIS' : 'ORTHOGONAL AXIS (90°)',
          toScreenX(dir.x * 4.2) + 8,
          toScreenY(dir.y * 4.2) - 8
        );
        ctx.restore();
      }

      // Helper to draw glowing tactical vector arrow from origin
      const drawVectorArrow = (
        vec: Vec2,
        color: string,
        glow: string,
        width: number,
        label: string
      ) => {
        const sx = toScreenX(vec.x);
        const sy = toScreenY(vec.y);
        if (Math.hypot(sx - offsetX, sy - offsetY) < 4) return;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = color;
        ctx.shadowColor = glow;
        ctx.shadowBlur = 18;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Crisp inner filament
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.lineWidth = Math.max(1, width * 0.35);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        // Arrowhead
        const ang = Math.atan2(sy - offsetY, sx - offsetX);
        const headLen = 11;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - headLen * Math.cos(ang - 0.42), sy - headLen * Math.sin(ang - 0.42));
        ctx.lineTo(sx - headLen * Math.cos(ang + 0.42), sy - headLen * Math.sin(ang + 0.42));
        ctx.closePath();
        ctx.fill();

        // Label badge near tip
        ctx.shadowBlur = 6;
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ffffff';
        const lx = sx + (vec.x >= 0 ? 10 : -86);
        const ly = sy + (vec.y >= 0 ? -12 : 16);
        ctx.fillText(label, lx, ly);
        ctx.restore();
      };

      // 5. LIVE VECTOR PROJECTION VISUALIZATION (proj_b(a) + perpendicular drop line)
      if (m.validB && s.phase !== 'VICTORY') {
        const a = activeWave.threatVec;
        const b = s.defense;
        const bUnit = { x: b.x / m.magB, y: b.y / m.magB };

        // Infinite faint reference line along b so projection onto -b or beyond |b| is crystal clear
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.16)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(toScreenX(-bUnit.x * 6), toScreenY(-bUnit.y * 6));
        ctx.lineTo(toScreenX(bUnit.x * 6), toScreenY(bUnit.y * 6));
        ctx.stroke();

        // Dashed perpendicular drop line from tip of a to proj_b(a)
        const ax = toScreenX(a.x);
        const ay = toScreenY(a.y);
        const px = toScreenX(m.projVec.x);
        const py = toScreenY(m.projVec.y);

        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing golden amber shadow vector proj_b(a)
        const projMag = mag(m.projVec);
        if (projMag > 0.12) {
          ctx.strokeStyle = '#fbbf24';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 16;
          ctx.lineWidth = 4.2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(offsetX, offsetY);
          ctx.lineTo(px, py);
          ctx.stroke();

          // Projection foot marker dot
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();

          // Projection label
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(
            `proj = ${m.scalarProj.toFixed(2)}`,
            (offsetX + px) / 2 + 6,
            (offsetY + py) / 2 + 14
          );
        }

        // Right-angle square marker at foot of perpendicular (when not degenerate)
        const dropDx = a.x - m.projVec.x;
        const dropDy = a.y - m.projVec.y;
        const dropLen = Math.hypot(dropDx, dropDy);
        if (dropLen > 0.35 && projMag > 0.25) {
          const dUnit = { x: dropDx / dropLen, y: dropDy / dropLen };
          const pUnit = { x: -m.projVec.x / projMag, y: -m.projVec.y / projMag };
          const sq = 0.28;
          const c1 = { x: m.projVec.x + pUnit.x * sq, y: m.projVec.y + pUnit.y * sq };
          const c2 = { x: c1.x + dUnit.x * sq, y: c1.y + dUnit.y * sq };
          const c3 = { x: m.projVec.x + dUnit.x * sq, y: m.projVec.y + dUnit.y * sq };
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.65)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(toScreenX(c1.x), toScreenY(c1.y));
          ctx.lineTo(toScreenX(c2.x), toScreenY(c2.y));
          ctx.lineTo(toScreenX(c3.x), toScreenY(c3.y));
          ctx.stroke();
        }

        // Angle arc θ between a and b at origin
        const angA = Math.atan2(-a.y, a.x);
        const angB = Math.atan2(-b.y, b.x);
        let diff = angB - angA;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        const arcR = Math.min(1.15, Math.min(m.magA, m.magB) * 0.45) * scale;
        if (arcR > 12) {
          ctx.strokeStyle = ev.matched ? '#34d399' : 'rgba(255, 255, 255, 0.55)';
          ctx.lineWidth = ev.matched ? 2.2 : 1.4;
          ctx.beginPath();
          ctx.arc(offsetX, offsetY, arcR, angA, angA + diff, diff < 0);
          ctx.stroke();

          const midAng = angA + diff / 2;
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = ev.matched ? '#34d399' : '#e4e4e7';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            `${m.angleDeg.toFixed(0)}°`,
            offsetX + Math.cos(midAng) * (arcR + 15),
            offsetY + Math.sin(midAng) * (arcR + 15)
          );
        }
        ctx.restore();
      }

      // 6. INCOMING THREAT VECTOR a + CLOSING PULSE MARKER
      if (s.phase !== 'VICTORY') {
        const a = activeWave.threatVec;
        const threatColor =
          activeWave.protocol === 'ORTHOGONAL_NULL'
            ? '#ff1e42'
            : activeWave.protocol === 'RESONANCE_ABSORB'
              ? '#ff4d6d'
              : '#fb7185';

        drawVectorArrow(a, threatColor, '#ff1e42', 3.4, `a=(${a.x}, ${a.y})`);

        // Closing threat pulse traveling inward along a -> (0,0) as timer counts down
        const progress = clamp(1 - s.timeLeft / Math.max(1, s.waveDuration), 0, 1);
        const pulsePos = {
          x: a.x * (1 - progress * 0.88),
          y: a.y * (1 - progress * 0.88),
        };
        const psx = toScreenX(pulsePos.x);
        const psy = toScreenY(pulsePos.y);
        const urgent = s.timeLeft < 6;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = urgent ? '#ff1e42' : '#ff4d6d';
        ctx.shadowColor = '#ff1e42';
        ctx.shadowBlur = urgent ? 24 : 16;
        ctx.lineWidth = 2;
        const pr = (0.28 + Math.sin(s.time * (urgent ? 14 : 6)) * 0.06) * scale;
        ctx.beginPath();
        ctx.arc(psx, psy, pr, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(psx, psy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 7. PLAYER DEFENSE SHIELD VECTOR b
      if (m.validB) {
        const bColor = ev.matched ? '#34d399' : '#ffffff';
        const bGlow = ev.matched ? '#34d399' : '#ff4d6d';
        drawVectorArrow(
          s.defense,
          bColor,
          bGlow,
          ev.matched ? 3.8 : 3.0,
          `b=(${s.defense.x}, ${s.defense.y})`
        );

        // Draggable tip reticle on b
        const bsx = toScreenX(s.defense.x);
        const bsy = toScreenY(s.defense.y);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = ev.matched ? '#34d399' : 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bsx, bsy, 8 + Math.sin(s.time * 5) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 8. QUANTUM CORE AT ORIGIN (0, 0) WITH 3 HP ARMOR SEGMENTS
      {
        const coreR = 0.44 * scale;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 3 HP segmented shield ring
        for (let seg = 0; seg < MAX_CORE_HP; seg++) {
          const alive = seg < s.coreHp;
          const startA = -Math.PI / 2 + seg * ((Math.PI * 2) / 3) + 0.16;
          const endA = startA + (Math.PI * 2) / 3 - 0.32;
          ctx.strokeStyle = alive ? (ev.matched ? '#34d399' : '#ff4d6d') : 'rgba(255, 255, 255, 0.12)';
          ctx.shadowColor = alive ? (ev.matched ? '#34d399' : '#ff1e42') : 'transparent';
          ctx.shadowBlur = alive ? 14 : 0;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(offsetX, offsetY, coreR * 1.32, startA, endA);
          ctx.stroke();
        }

        // Crisp white Quantum Core orb
        const grad = ctx.createRadialGradient(offsetX, offsetY, 2, offsetX, offsetY, coreR);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, ev.matched ? 'rgba(52, 211, 153, 0.85)' : 'rgba(255, 77, 109, 0.85)');
        grad.addColorStop(1, 'rgba(255, 30, 66, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, coreR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, coreR * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 9. SHOCKWAVES, PARTICLES & FLOATING CALLOUTS
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const sw of s.shockwaves) {
        const alpha = Math.max(0, sw.life / sw.maxLife);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2.6 * alpha + 0.6;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 16;
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

      for (const c of s.callouts) {
        const alpha = Math.min(1, (c.life / c.maxLife) * 1.6);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 14px "JetBrains Mono", monospace';
        ctx.shadowColor = c.color;
        ctx.shadowBlur = 14;
        ctx.fillStyle = c.color;
        ctx.fillText(c.text, toScreenX(c.x), toScreenY(c.y));
        if (c.subtext) {
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(c.subtext, toScreenX(c.x), toScreenY(c.y) + 17);
        }
        ctx.restore();
      }

      // 10. CRIMSON GLITCH FLASH ON DAMAGE / MISMATCH
      if (s.glitchTimer > 0) {
        const intensity = s.glitchTimer / 0.42;
        ctx.save();
        ctx.fillStyle = `rgba(255, 30, 66, ${intensity * 0.25})`;
        ctx.fillRect(0, 0, cw, ch);
        for (let i = 0; i < 6; i++) {
          const gy = Math.random() * ch;
          const gh = 4 + Math.random() * 14;
          ctx.fillStyle =
            i % 2 === 0
              ? `rgba(255, 30, 66, ${intensity * 0.48})`
              : `rgba(52, 211, 153, ${intensity * 0.22})`;
          ctx.fillRect((Math.random() - 0.5) * 28, gy, cw, gh);
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
  }, [screen, spawnCallout, spawnShockwave, spawnSparks]);

  // --- Interactive Canvas Aiming (Optional Direct Click/Drag on Radar + Hover Readout) ---
  const screenToWorld = (clientX: number, clientY: number): Vec2 | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = simRef.current;
    const wx = (clientX - rect.left - offsetX) / scale;
    const wy = (offsetY - (clientY - rect.top)) / scale;
    return { x: wx, y: wy };
  };

  const applyCanvasVector = (clientX: number, clientY: number) => {
    if (phase !== 'ACTIVE') return;
    const w = screenToWorld(clientX, clientY);
    if (!w) return;
    const snappedX = clamp(Math.round(w.x * 2) / 2, -6, 6);
    const snappedY = clamp(Math.round(w.y * 2) / 2, -6, 6);
    setDefense({ x: snappedX, y: snappedY });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'ACTIVE') return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    applyCanvasVector(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const w = screenToWorld(e.clientX, e.clientY);
    if (w && Math.abs(w.x) <= 6.5 && Math.abs(w.y) <= 6.5) {
      setHoverCoord({ x: Math.round(w.x * 10) / 10, y: Math.round(w.y * 10) / 10 });
    } else {
      setHoverCoord(null);
    }
    if (draggingRef.current) {
      applyCanvasVector(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draggingRef.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // Totals & labels
  const totalStars = Object.values(saved.levels).reduce((acc, l) => acc + (l.stars || 0), 0);
  const maxTotalStars = LEVELS.length * 3;
  const timeRatio = clamp(timeLeft / Math.max(1, wave.duration), 0, 1);

  const protocolBadge =
    wave.protocol === 'ORTHOGONAL_NULL'
      ? { label: 'ORTHOGONAL NULL // a·b = 0', color: 'border-[#ff1e42] bg-[#3b0712]/80 text-[#ff4d6d]' }
      : wave.protocol === 'RESONANCE_ABSORB'
        ? {
            label:
              (wave.cosTarget ?? 1) === 1
                ? 'RESONANCE ABSORB // cos θ = +1'
                : 'COUNTER-PULSE // cos θ = -1',
            color: 'border-[#fbbf24]/70 bg-[#231405]/85 text-[#fbbf24]',
          }
        : {
            label:
              wave.targetMode === 'COMP'
                ? `SCALAR PROJECTION // comp_b(a) = ${wave.targetValue}`
                : `DOT TARGET // a·b = ${wave.targetValue}`,
            color: 'border-emerald-400/70 bg-emerald-950/75 text-emerald-300',
          };

  return (
    <section className="rdp-root relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[#ff1e42]/35 bg-[#070305] font-sans text-zinc-100 shadow-[var(--panel-shadow)] select-none">
      {/* Scoped self-contained CSS */}
      <style>{`
        .rdp-root {
          --rdp-bg: #070305;
          --rdp-crimson: #ff1e42;
          --rdp-glow: #ff4d6d;
          --rdp-amber: #fbbf24;
          --rdp-emerald: #34d399;
        }
        .rdp-scanlines {
          background: repeating-linear-gradient(
            0deg,
            rgba(255, 30, 66, 0.03) 0px,
            rgba(255, 30, 66, 0.03) 1px,
            transparent 1px,
            transparent 3px
          );
        }
        .rdp-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          background: rgba(255, 30, 66, 0.25);
          border-radius: 2px;
          outline: none;
        }
        .rdp-slider::-webkit-slider-thumb {
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
        .rdp-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          background: #ff1e42;
          border: 1.5px solid #ffffff;
          box-shadow: 0 0 10px rgba(255, 30, 66, 0.9);
          cursor: pointer;
        }
      `}</style>

      {/* Scoped CRT Scanlines */}
      <div className="rdp-scanlines pointer-events-none absolute inset-0 z-30 opacity-70" />

      {/* ==================================================================== */}
      {/* HEADER HUD BAR                                                       */}
      {/* ==================================================================== */}
      <header className="relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#ff1e42]/30 bg-[#0d0407]/85 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-[#ff1e42]/60 bg-[#3b0712]/80 shadow-[0_0_15px_rgba(255,30,66,0.35)]">
            <Radio className="h-5 w-5 text-[#ff1e42]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-[0.18em] text-white sm:text-base">
                RESONANCE <span className="text-[#ff1e42]">{'//'}</span> DOT PROTOCOL
              </h1>
              <span className="hidden rounded border border-[#ff1e42]/40 bg-[#ff1e42]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#ff4d6d] sm:inline-block">
                v1.0
              </span>
            </div>
            <p className="font-mono text-[10px] tracking-wider text-zinc-400">
              {screen === 'PLAY' ? level.topic : 'TACTICAL DOT-PRODUCT & VECTOR PROJECTION RADAR'}
            </p>
          </div>
        </div>

        {/* Center Status Telemetry (Play Screen) */}
        {screen === 'PLAY' && (
          <div className="hidden items-center gap-3 font-mono text-xs lg:flex">
            <div className="flex items-center gap-1.5 rounded border border-[#ff1e42]/25 bg-[#16060b]/80 px-2.5 py-1">
              <span className="text-zinc-400">CORE</span>
              <span className="flex items-center gap-0.5">
                {[0, 1, 2].map((i) => (
                  <Heart
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < coreHp ? 'fill-[#ff1e42] text-[#ff1e42]' : 'text-zinc-700'
                    }`}
                  />
                ))}
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded border border-[#ff1e42]/25 bg-[#16060b]/80 px-2.5 py-1">
              <span className="text-zinc-400">SCORE</span>
              <span className="font-bold text-white">{score.toLocaleString()}</span>
              {multiplier > 1 && (
                <span className="rounded bg-[#fbbf24]/20 px-1 text-[10px] font-bold text-[#fbbf24]">
                  {multiplier}X
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 rounded border border-[#ff1e42]/25 bg-[#16060b]/80 px-2.5 py-1">
              <span className="text-zinc-400">OVERDRIVE</span>
              <div className="h-2 w-16 overflow-hidden rounded-full bg-zinc-900">
                <div
                  className="h-full bg-gradient-to-r from-[#ff1e42] to-[#fbbf24] transition-all duration-300"
                  style={{ width: `${Math.min(100, overdrive)}%` }}
                />
              </div>
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
            onClick={() => setMuted((mVal) => !mVal)}
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
              <Activity className="h-3.5 w-3.5" />
              QUANTUM CORE VECTOR DEFENSE MODULE
            </div>

            <h2 className="font-mono text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              RESONANCE
              <span className="block text-xl font-bold tracking-[0.26em] text-[#ff1e42] sm:text-2xl">
                {'// DOT PROTOCOL'}
              </span>
            </h2>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
              Defend the central <span className="font-mono text-white">QUANTUM CORE</span> from
              incoming threat vectors <span className="font-mono text-[#ff4d6d]">a = (ax, ay)</span>.
              Tune your defense shield vector <span className="font-mono text-emerald-300">b</span>{' '}
              using dot products, cosine similarity, and live geometric projections before impact.
            </p>

            {/* 3 Protocol Cards */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded border border-[#ff1e42]/30 bg-[#17060b]/80 p-3">
                <div className="font-mono text-xs font-bold text-[#ff4d6d]">a · b = 0</div>
                <div className="mt-1 text-[11px] text-zinc-400">
                  Orthogonal Null: rotate b to 90° to phase-cancel crimson spikes.
                </div>
              </div>
              <div className="rounded border border-[#fbbf24]/30 bg-[#170f06]/70 p-3">
                <div className="font-mono text-xs font-bold text-[#fbbf24]">cos θ = ±1</div>
                <div className="mt-1 text-[11px] text-zinc-400">
                  Resonance Absorb & Counter-Pulse: match exact parallel or anti-parallel phase.
                </div>
              </div>
              <div className="rounded border border-emerald-400/30 bg-[#071611]/80 p-3">
                <div className="font-mono text-xs font-bold text-emerald-300">proj_b(a)</div>
                <div className="mt-1 text-[11px] text-zinc-400">
                  Projection Lock: calibrate exact dot products and golden shadow lengths.
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  synth.playClick();
                  initSector(0);
                  setScreen('PLAY');
                }}
                className="group relative flex items-center gap-2 rounded border border-[#ff4d6d] bg-[#ff1e42] px-6 py-3 font-mono text-sm font-bold tracking-wider text-white shadow-[0_0_25px_rgba(255,30,66,0.55)] transition hover:bg-[#ff3355] active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-white" />
                ACTIVATE RADAR
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
      {/* SCREEN 2: SECTOR SELECT TACTICAL MAP                                 */}
      {/* ==================================================================== */}
      {screen === 'MAP' && (
        <main className="scroll-thin relative z-10 flex min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="m-auto w-full max-w-5xl">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-xs tracking-widest text-[#ff4d6d]">
                  RADAR DEFENSE SECTORS
                </div>
                <h2 className="font-mono text-2xl font-bold text-white sm:text-3xl">
                  SELECT DOT PROTOCOL
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
                      initSector(idx);
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
                          {lvl.primaryProtocol}
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
                            {[1, 2, 3].map((st) => (
                              <Star
                                key={st}
                                className={`h-4 w-4 ${
                                  st <= stars
                                    ? 'fill-[#fbbf24] text-[#fbbf24] drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                                    : 'text-zinc-700'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-xs text-zinc-400">
                            {prog?.bestScore
                              ? `${prog.bestScore.toLocaleString()} PTS`
                              : `${lvl.waves.length} WAVES`}
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
      {/* SCREEN 3: ACTIVE TACTICAL RADAR WORKSPACE                            */}
      {/* ==================================================================== */}
      {screen === 'PLAY' && (
        <main className="scroll-thin relative z-10 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:overflow-hidden lg:p-4">
          {/* LEFT / CENTER: TACTICAL RADAR CANVAS */}
          <div className="relative flex min-h-[340px] shrink-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#ff1e42]/40 bg-[#070305] shadow-[0_0_30px_rgba(255,30,66,0.12)] lg:min-h-0 lg:shrink">
            <HudBrackets color={lockEval.matched ? '#34d399' : '#ff1e42'} />

            {/* Top Radar Overlay Bar */}
            <div className="pointer-events-none absolute top-2.5 right-3 left-3 z-10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider backdrop-blur-md ${protocolBadge.color}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      lockEval.matched ? 'animate-ping bg-emerald-400' : 'animate-pulse bg-[#ff1e42]'
                    }`}
                  />
                  {protocolBadge.label}
                </span>

                <span className="rounded border border-[#ff1e42]/30 bg-[#0d0407]/85 px-2 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur-md">
                  WAVE <strong className="text-white">{waveIdx + 1}/{level.waves.length}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] font-bold backdrop-blur-md ${
                    timeLeft < 6
                      ? 'border-red-500 bg-red-950/85 text-red-300'
                      : slowRemaining > 0
                        ? 'border-[#fbbf24] bg-[#211505]/85 text-[#fbbf24]'
                        : 'border-white/20 bg-[#0d0407]/85 text-zinc-200'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {timeLeft.toFixed(1)}s
                </div>

                <div className="hidden items-center gap-1 rounded border border-white/15 bg-[#0d0407]/85 px-2.5 py-1 font-mono text-[11px] text-zinc-300 backdrop-blur-md sm:flex">
                  <Crosshair className="h-3 w-3 text-[#ff4d6d]" />
                  {hoverCoord
                    ? `(${hoverCoord.x.toFixed(1)}, ${hoverCoord.y.toFixed(1)})`
                    : 'DRAG TO AIM'}
                </div>
              </div>
            </div>

            {/* Thin Threat Approach Progress Bar under Top Overlay */}
            <div className="pointer-events-none absolute top-0 right-0 left-0 z-10 h-1 bg-zinc-900/90">
              <div
                className={`h-full transition-all duration-100 ${
                  timeLeft < 6
                    ? 'bg-red-500 shadow-[0_0_12px_#ff1e42]'
                    : slowRemaining > 0
                      ? 'bg-[#fbbf24]'
                      : 'bg-[#ff1e42]'
                }`}
                style={{ width: `${timeRatio * 100}%` }}
              />
            </div>

            {/* Interactive HTML5 Radar Canvas */}
            <div ref={containerRef} className="relative h-full min-h-[340px] w-full flex-1 lg:min-h-0">
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={() => {
                  draggingRef.current = false;
                  setHoverCoord(null);
                }}
                className="block h-full w-full cursor-crosshair touch-none"
              />
            </div>

            {/* Bottom Live Feedback / Core Breached Banner */}
            {phase === 'FAILED' ? (
              <div className="absolute inset-x-4 bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#ff1e42] bg-[#1a0409]/95 px-4 py-3 shadow-[0_0_30px_rgba(255,30,66,0.45)] backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-[#ff1e42]" />
                  <div>
                    <div className="font-mono text-xs font-bold tracking-wider text-[#ff4d6d]">
                      QUANTUM CORE BREACHED // PROTOCOL FAILED
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Use Time Dilate or Ortho-Snap if needed and lock the defense vector before impact.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    synth.playClick();
                    initSector(levelIdx, true);
                  }}
                  className="flex items-center gap-1.5 rounded border border-[#ff4d6d] bg-[#ff1e42] px-4 py-2 font-mono text-xs font-bold text-white transition hover:bg-[#ff3355]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  RETRY SECTOR (R)
                </button>
              </div>
            ) : feedbackBanner ? (
              <div
                className={`pointer-events-none absolute inset-x-4 bottom-3 z-10 rounded border px-3 py-1.5 font-mono text-[11px] backdrop-blur-md ${
                  feedbackBanner.kind === 'success'
                    ? 'border-emerald-400/50 bg-emerald-950/80 text-emerald-300'
                    : feedbackBanner.kind === 'info'
                      ? 'border-[#fbbf24]/50 bg-[#201406]/85 text-[#fbbf24]'
                      : 'border-[#ff1e42]/70 bg-[#24060c]/90 text-[#ff4d6d]'
                }`}
              >
                {feedbackBanner.text}
              </div>
            ) : null}
          </div>

          {/* RIGHT PANEL: VECTOR RESONANCE CONTROL TERMINAL */}
          <aside className="scroll-thin relative flex w-full shrink-0 flex-col gap-2.5 rounded-lg border border-[#ff1e42]/35 bg-[#0e0408]/90 p-3.5 backdrop-blur-xl lg:min-h-0 lg:w-[350px] lg:overflow-y-auto xl:w-[380px]">
            <HudBrackets />

            {/* Sector Header & Hint Toggle */}
            <div className="border-b border-[#ff1e42]/25 pb-2">
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
              <div className="mt-1 font-mono text-[11px] text-zinc-400">{lockEval.statusText}</div>

              {showHint && (
                <div className="mt-2 rounded border border-[#fbbf24]/35 bg-[#1b1205]/90 p-2.5 text-[11px] leading-relaxed text-amber-200/95">
                  {wave.hint}
                </div>
              )}
            </div>

            {/* Live Vector & Dot-Product Telemetry Grid */}
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="rounded border border-[#ff1e42]/25 bg-[#070305] px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-500">THREAT VECTOR a</div>
                <div className="font-bold text-[#ff4d6d]">
                  ({wave.threatVec.x}, {wave.threatVec.y})
                </div>
              </div>
              <div className="rounded border border-white/15 bg-[#070305] px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-500">SHIELD VECTOR b</div>
                <div className={`font-bold ${lockEval.matched ? 'text-emerald-300' : 'text-white'}`}>
                  ({defense.x}, {defense.y})
                </div>
              </div>
              <div className="rounded border border-white/10 bg-[#070305] px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-500">DOT PRODUCT a · b</div>
                <div className="font-bold text-white">{metrics.dotVal.toFixed(2)}</div>
              </div>
              <div className="rounded border border-[#fbbf24]/25 bg-[#070305] px-2.5 py-1.5">
                <div className="text-[9px] text-zinc-500">PROJ comp_b(a)</div>
                <div className="font-bold text-[#fbbf24]">
                  {metrics.validB ? metrics.scalarProj.toFixed(2) : '—'}
                </div>
              </div>
            </div>

            {/* Real-Time Resonance Meter (cos θ ∈ [-1, 1]) */}
            <div className="rounded border border-[#ff1e42]/30 bg-[#14050a] p-2.5 font-mono">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-zinc-400">RESONANCE METER (cos θ)</span>
                <span className={lockEval.matched ? 'font-bold text-emerald-300' : 'font-bold text-white'}>
                  {metrics.validB
                    ? `${metrics.cosTheta >= 0 ? '+' : ''}${metrics.cosTheta.toFixed(3)} · ${metrics.angleDeg.toFixed(1)}°`
                    : 'NO SIGNAL'}
                </span>
              </div>
              {/* Bipolar meter from -1 to +1 */}
              <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full border border-white/10 bg-[#070305]">
                {/* Center 0-tick (orthogonal) */}
                <span className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-white/40" />
                {metrics.validB && (
                  <div
                    className={`absolute top-0 bottom-0 transition-all duration-75 ${
                      lockEval.matched
                        ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
                        : 'bg-[#ff1e42] shadow-[0_0_10px_#ff1e42]'
                    }`}
                    style={{
                      left:
                        metrics.cosTheta >= 0
                          ? '50%'
                          : `${50 + metrics.cosTheta * 50}%`,
                      width: `${Math.max(2, Math.abs(metrics.cosTheta) * 50)}%`,
                    }}
                  />
                )}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-zinc-500">
                <span>-1 (180°)</span>
                <span>0 (90° ⊥)</span>
                <span>+1 (0°)</span>
              </div>
            </div>

            {/* Defense Vector Coordinate Sliders & Inputs */}
            <div className="space-y-2">
              <AxisControl
                label="Defense X"
                symbol="bx"
                value={defense.x}
                min={-6}
                max={6}
                step={0.5}
                disabled={phase !== 'ACTIVE'}
                onChange={(x) => setDefense((d) => ({ ...d, x }))}
              />
              <AxisControl
                label="Defense Y"
                symbol="by"
                value={defense.y}
                min={-6}
                max={6}
                step={0.5}
                disabled={phase !== 'ACTIVE'}
                onChange={(y) => setDefense((d) => ({ ...d, y }))}
              />
            </div>

            {/* Tactical Power-Ups Row */}
            <div className="space-y-1.5 border-t border-[#ff1e42]/20 pt-2">
              <div className="flex items-center justify-between font-mono text-[10px] tracking-wider text-zinc-400">
                <span>TACTICAL POWER-UPS</span>
                <span className="text-[#fbbf24]">+1 ON NO-DMG CLEAR</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={saved.powerUps.slow <= 0 || phase !== 'ACTIVE' || slowRemaining > 0}
                  onClick={() => activatePowerUp('slow')}
                  className={`flex flex-col items-center rounded border p-2 font-mono text-[10px] transition ${
                    slowRemaining > 0
                      ? 'border-[#fbbf24] bg-[#fbbf24]/20 text-[#fbbf24]'
                      : 'border-[#ff1e42]/30 bg-[#18070d] text-zinc-200 hover:border-[#fbbf24] hover:text-[#fbbf24] disabled:opacity-40'
                  }`}
                >
                  <Clock className="mb-1 h-4 w-4" />
                  <span className="font-bold">DILATE</span>
                  <span className="text-[9px] text-zinc-400">
                    {slowRemaining > 0 ? `${slowRemaining}s` : `x${saved.powerUps.slow}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saved.powerUps.ortho <= 0 || phase !== 'ACTIVE' || orthoRemaining > 0}
                  onClick={() => activatePowerUp('ortho')}
                  className={`flex flex-col items-center rounded border p-2 font-mono text-[10px] transition ${
                    orthoRemaining > 0
                      ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                      : 'border-[#ff1e42]/30 bg-[#18070d] text-zinc-200 hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-40'
                  }`}
                >
                  <Compass className="mb-1 h-4 w-4" />
                  <span className="font-bold">SNAP</span>
                  <span className="text-[9px] text-zinc-400">
                    {orthoRemaining > 0 ? `${orthoRemaining}s` : `x${saved.powerUps.ortho}`}
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saved.powerUps.heal <= 0 || phase !== 'ACTIVE' || coreHp >= MAX_CORE_HP}
                  onClick={() => activatePowerUp('heal')}
                  className="flex flex-col items-center rounded border border-[#ff1e42]/30 bg-[#18070d] p-2 font-mono text-[10px] text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-40"
                >
                  <Shield className="mb-1 h-4 w-4" />
                  <span className="font-bold">REPAIR</span>
                  <span className="text-[9px] text-zinc-400">x{saved.powerUps.heal}</span>
                </button>
              </div>
            </div>

            {/* Primary Tactical Action Buttons */}
            <div className="mt-auto space-y-2 pt-1.5">
              <button
                type="button"
                disabled={phase !== 'ACTIVE'}
                onClick={handleEngageLock}
                className={`flex w-full items-center justify-center gap-2 rounded border py-2.5 font-mono text-xs font-bold tracking-widest text-white transition active:scale-[0.99] disabled:opacity-40 ${
                  lockEval.matched
                    ? 'border-emerald-300 bg-emerald-600 shadow-[0_0_22px_rgba(52,211,153,0.5)] hover:bg-emerald-500'
                    : 'border-[#ff4d6d] bg-[#ff1e42] shadow-[0_0_20px_rgba(255,30,66,0.45)] hover:bg-[#ff3355]'
                }`}
              >
                <Zap className="h-4 w-4 fill-white" />
                {lockEval.matched ? 'ENGAGE // VERIFIED LOCK' : 'ENGAGE // LOCK PULSE'}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-center rounded border border-white/10 bg-[#0c0407] px-2 py-2 font-mono text-[10px] text-zinc-500">
                  SPACE: FIRE LOCK
                </div>

                <button
                  type="button"
                  onClick={() => {
                    synth.playClick();
                    initSector(levelIdx, phase === 'FAILED');
                  }}
                  className="flex items-center justify-center gap-1.5 rounded border border-[#ff1e42]/35 bg-[#3b0712]/50 py-2 font-mono text-[11px] font-semibold text-zinc-200 transition hover:border-[#ff1e42] hover:bg-[#ff1e42]/20"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-[#ff4d6d]" />
                  RESET (R)
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
          <div className="relative my-auto w-full max-w-md rounded-lg border border-emerald-400/70 bg-[#110408]/95 p-6 shadow-[0_0_55px_rgba(52,211,153,0.3)]">
            <HudBrackets color="#fbbf24" />
            <div className="text-center">
              <div className="inline-flex items-center gap-1.5 rounded border border-emerald-400/40 bg-emerald-950/60 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {`CORE SECURED // ${level.code}`}
              </div>

              <h3 className="mt-3 font-mono text-2xl font-extrabold tracking-wider text-white">
                RESONANCE COMPLETE
              </h3>

              {/* 3-Star Rating */}
              <div className="my-5 flex items-center justify-center gap-3">
                {[1, 2, 3].map((st) => (
                  <Star
                    key={st}
                    className={`h-10 w-10 transition-transform duration-500 ${
                      st <= victoryStats.stars
                        ? 'scale-110 fill-[#fbbf24] text-[#fbbf24] drop-shadow-[0_0_14px_rgba(251,191,36,0.85)]'
                        : 'text-zinc-800'
                    }`}
                  />
                ))}
              </div>

              {/* Animated Score Tally */}
              <div className="rounded border border-[#ff1e42]/35 bg-[#070305] py-3">
                <div className="font-mono text-[10px] tracking-widest text-zinc-400">
                  FINAL RESONANCE SCORE
                </div>
                <div className="mt-0.5 font-mono text-3xl font-extrabold text-white">
                  {displayScore.toLocaleString()}
                </div>
              </div>

              {/* Star Criteria */}
              <div className="mt-4 space-y-1.5 text-left font-mono text-xs">
                <div className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5">
                  <span className="text-zinc-300">1★ All Threat Waves Neutralized</span>
                  <span className="text-emerald-400">COMPLETE</span>
                </div>
                <div className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5">
                  <span className="text-zinc-300">2★ Zero Core Damage Taken</span>
                  <span className={victoryStats.noDamage ? 'text-emerald-400' : 'text-zinc-500'}>
                    {victoryStats.noDamage
                      ? victoryStats.replenished
                        ? 'VERIFIED (+1 POWER-UPS)'
                        : 'VERIFIED'
                      : `${coreHp}/${MAX_CORE_HP} HP`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded bg-white/5 px-3 py-1.5">
                  <span className="text-zinc-300">3★ High Accuracy & Precision</span>
                  <span className={victoryStats.highAccuracy ? 'text-[#fbbf24]' : 'text-zinc-500'}>
                    {victoryStats.highAccuracy ? 'MASTERED' : 'STANDARD'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                {levelIdx < LEVELS.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      synth.playClick();
                      initSector(levelIdx + 1);
                    }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded border border-[#ff4d6d] bg-[#ff1e42] py-2.5 font-mono text-xs font-bold tracking-wider text-white shadow-[0_0_20px_rgba(255,30,66,0.45)] transition hover:bg-[#ff3355]"
                  >
                    NEXT SECTOR
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
                    <Sparkles className="h-4 w-4" />
                    ALL SECTORS CLEARED
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    synth.playClick();
                    initSector(levelIdx, false);
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
