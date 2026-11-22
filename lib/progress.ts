export const PROGRESS_STORAGE_KEY = "mathai-progress";

export type ProgressData = {
  streak: number;
  lastActiveDate: string | null;
  xp: number;
  solvedTasks: number;
  sectionPoints: Record<string, number>;
};

const DEFAULT_PROGRESS: ProgressData = {
  streak: 0,
  lastActiveDate: null,
  xp: 0,
  solvedTasks: 0,
  sectionPoints: {},
};

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayKey(): string {
  return formatDateKey(new Date());
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

export function readProgress(): ProgressData {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    return {
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      lastActiveDate: typeof parsed.lastActiveDate === "string" ? parsed.lastActiveDate : null,
      xp: typeof parsed.xp === "number" ? parsed.xp : 0,
      solvedTasks: typeof parsed.solvedTasks === "number" ? parsed.solvedTasks : 0,
      sectionPoints:
        parsed.sectionPoints && typeof parsed.sectionPoints === "object"
          ? parsed.sectionPoints
          : {},
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function writeProgress(data: ProgressData): ProgressData {
  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Игнорируем ошибки хранилища
  }
  return data;
}

export function touchDailyVisit(): ProgressData {
  const current = readProgress();
  const today = getTodayKey();
  if (current.lastActiveDate === today) {
    return current;
  }

  const yesterday = getYesterdayKey();
  const isConsecutive = current.lastActiveDate === yesterday;
  const next: ProgressData = {
    ...current,
    streak: isConsecutive ? current.streak + 1 : 1,
    lastActiveDate: today,
    xp: current.xp + (isConsecutive ? 20 : 0),
  };
  return writeProgress(next);
}

export function recordActivity(
  sectionId: string,
  kind: "message" | "task" | "solved",
): ProgressData {
  const base = touchDailyVisit();
  const gain = kind === "solved" ? 25 : kind === "task" ? 15 : 10;
  const prevSection = base.sectionPoints[sectionId] ?? 0;

  const next: ProgressData = {
    ...base,
    xp: base.xp + gain,
    solvedTasks: base.solvedTasks + (kind === "solved" ? 1 : 0),
    sectionPoints: {
      ...base.sectionPoints,
      [sectionId]: Math.min(100, prevSection + gain),
    },
  };
  return writeProgress(next);
}

export function getLevelInfo(xp: number) {
  const level = Math.floor(xp / 100) + 1;
  const currentXp = xp % 100;
  return { level, currentXp, nextLevelXp: 100 };
}