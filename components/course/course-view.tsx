"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ImagePlus,
  ListChecks,
  Loader2,
  RefreshCw,
  SendHorizontal,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { COURSE_TOPICS, type CourseTopic } from "@/lib/course-data";

const COURSE_STORAGE_KEY = "mathai-course-ai-progress-v2";
const LECTURE_CACHE_PREFIX = "mathai-course-lecture-";
const TASKS_REQUIRED = 5;
const EXAM_REQUIRED = 3;

type TopicProgress = {
  lectureDone: boolean;
  tasksSolved: number;
  examSolved: number;
};

type CourseProgressMap = Record<string, TopicProgress>;
type Stage = "lecture" | "practice" | "exam";

const EMPTY_PROGRESS: TopicProgress = {
  lectureDone: false,
  tasksSolved: 0,
  examSolved: 0,
};

function MarkdownMath({ children }: { children: string }) {
  return (
    <div className="space-y-3 overflow-x-auto text-sm leading-6 text-ink [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:leading-6 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

function getTopicStatus(p?: TopicProgress): "done" | "progress" | "new" {
  if (!p) return "new";
  if (p.lectureDone && p.tasksSolved >= TASKS_REQUIRED && p.examSolved >= EXAM_REQUIRED) {
    return "done";
  }
  if (p.lectureDone || p.tasksSolved > 0 || p.examSolved > 0) {
    return "progress";
  }
  return "new";
}

export function CourseView() {
  const [progress, setProgress] = useState<CourseProgressMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("lecture");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COURSE_STORAGE_KEY);
      if (raw) setProgress(JSON.parse(raw) as CourseProgressMap);
    } catch {
      // Игнорируем повреждённые данные
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(COURSE_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Игнорируем переполнение
    }
  }, [progress, hydrated]);

  const activeTopic = useMemo(
    () => COURSE_TOPICS.find((t) => t.id === activeTopicId) ?? null,
    [activeTopicId],
  );

  const completedCount = COURSE_TOPICS.filter(
    (t) => getTopicStatus(progress[t.id]) === "done",
  ).length;

  function updateTopicProgress(
    topicId: string,
    updater: (prev: TopicProgress) => TopicProgress,
  ) {
    setProgress((prev) => ({
      ...prev,
      [topicId]: updater(prev[topicId] ?? EMPTY_PROGRESS),
    }));
  }

  function openTopic(topic: CourseTopic) {
    setActiveTopicId(topic.id);
    const p = progress[topic.id] ?? EMPTY_PROGRESS;
    if (!p.lectureDone) setStage("lecture");
    else if (p.tasksSolved < TASKS_REQUIRED) setStage("practice");
    else setStage("exam");
  }

  if (activeTopic) {
    const tp = progress[activeTopic.id] ?? EMPTY_PROGRESS;
    const isCompleted = getTopicStatus(tp) === "done";

    return (
      <section className="glass flex min-h-0 min-w-0 flex-1 flex-col rounded-3xl">
        <header className="border-b border-line px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveTopicId(null)}
              className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent hover:text-ink"
            >
              <ArrowLeft className="size-3.5" />
              Все 12 тем
            </button>

            {isCompleted && (
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                Тема завершена
              </span>
            )}
          </div>

          <p className="mt-3 text-xs font-medium tracking-[0.16em] text-accent uppercase">
            Тема {activeTopic.number} из {COURSE_TOPICS.length}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
            {activeTopic.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{activeTopic.subtitle}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["lecture", "1. ИИ-Лекция", BookOpen, tp.lectureDone],
                [
                  "practice",
                  `2. Практика (${Math.min(tp.tasksSolved, TASKS_REQUIRED)}/${TASKS_REQUIRED})`,
                  ListChecks,
                  tp.tasksSolved >= TASKS_REQUIRED,
                ],
                [
                  "exam",
                  `3. Найди ошибку (${Math.min(tp.examSolved, EXAM_REQUIRED)}/${EXAM_REQUIRED})`,
                  ShieldAlert,
                  tp.examSolved >= EXAM_REQUIRED,
                ],
              ] as const
            ).map(([id, label, Icon, done]) => (
              <button
                key={id}
                type="button"
                onClick={() => setStage(id)}
                className={[
                  "flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-medium transition",
                  stage === id
                    ? "border-accent bg-accent text-on-accent shadow-[0_0_14px_var(--glow-soft)]"
                    : done
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                      : "border-line bg-surface text-muted hover:text-ink",
                ].join(" ")}
              >
                <Icon className="size-3.5" />
                {label}
                {done && <CheckCircle2 className="size-3.5" />}
              </button>
            ))}
          </div>
        </header>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mx-auto max-w-3xl">
            {stage === "lecture" && (
              <LectureStage
                key={activeTopic.id}
                topic={activeTopic}
                alreadyDone={tp.lectureDone}
                onComplete={() => {
                  updateTopicProgress(activeTopic.id, (p) => ({ ...p, lectureDone: true }));
                  setStage("practice");
                }}
              />
            )}

            {stage === "practice" && (
              <PracticeStage
                key={activeTopic.id}
                topic={activeTopic}
                solvedCount={tp.tasksSolved}
                onSolved={() =>
                  updateTopicProgress(activeTopic.id, (p) => ({
                    ...p,
                    tasksSolved: p.tasksSolved + 1,
                  }))
                }
                onGoToExam={() => setStage("exam")}
              />
            )}

            {stage === "exam" && (
              <ExamBugStage
                key={activeTopic.id}
                topic={activeTopic}
                solvedCount={tp.examSolved}
                onSolved={() =>
                  updateTopicProgress(activeTopic.id, (p) => ({
                    ...p,
                    examSolved: p.examSolved + 1,
                  }))
                }
                onBackToMap={() => setActiveTopicId(null)}
              />
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="glass flex min-h-0 min-w-0 flex-1 flex-col rounded-3xl">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">
              Полный ИИ-курс · 12 модулей
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Линейная алгебра и комплексные числа
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs">
            <Sparkles className="size-4 text-accent" />
            <span className="font-medium text-ink">
              Завершено: {completedCount} / {COURSE_TOPICS.length}
            </span>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-canvas/80">
          <div
            className="h-full rounded-full bg-accent shadow-[0_0_12px_var(--glow)] transition-all duration-300"
            style={{ width: `${(completedCount / COURSE_TOPICS.length) * 100}%` }}
          />
        </div>
      </header>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COURSE_TOPICS.map((topic) => {
            const p = progress[topic.id] ?? EMPTY_PROGRESS;
            const status = getTopicStatus(p);

            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => openTopic(topic)}
                className={[
                  "flex flex-col justify-between rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_0_22px_var(--glow-soft)]",
                  status === "done"
                    ? "border-emerald-400/45 bg-emerald-500/10"
                    : "border-line bg-surface/80 hover:border-accent/60",
                ].join(" ")}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg border border-line bg-canvas/70 px-2 py-0.5 font-mono text-xs text-accent">
                      #{topic.number}
                    </span>
                    <span
                      className={[
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        status === "done"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : status === "progress"
                            ? "bg-accent/20 text-accent"
                            : "bg-canvas/70 text-muted",
                      ].join(" ")}
                    >
                      {status === "done"
                        ? "Завершено ✓"
                        : status === "progress"
                          ? "В процессе"
                          : "Не начато"}
                    </span>
                  </div>

                  <h2 className="mt-3 text-base font-semibold text-ink">{topic.title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-muted">{topic.subtitle}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                  <span className={p.lectureDone ? "text-emerald-300" : ""}>
                    Лекция {p.lectureDone ? "✓" : ""}
                  </span>
                  <span>·</span>
                  <span className={p.tasksSolved >= TASKS_REQUIRED ? "text-emerald-300" : ""}>
                    Задачи {Math.min(p.tasksSolved, TASKS_REQUIRED)}/{TASKS_REQUIRED}
                  </span>
                  <span>·</span>
                  <span className={p.examSolved >= EXAM_REQUIRED ? "text-emerald-300" : ""}>
                    Экзамен {Math.min(p.examSolved, EXAM_REQUIRED)}/{EXAM_REQUIRED}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LectureStage({
  topic,
  alreadyDone,
  onComplete,
}: {
  topic: CourseTopic;
  alreadyDone: boolean;
  onComplete: () => void;
}) {
  const cacheKey = `${LECTURE_CACHE_PREFIX}${topic.id}`;
  const [lecture, setLecture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadLecture(style: "standard" | "simpler" | "deeper" = "standard") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lecture",
          topicTitle: topic.title,
          topicSubtitle: topic.subtitle,
          style,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить лекцию");
      setLecture(data.lecture);
      try {
        localStorage.setItem(cacheKey, data.lecture);
      } catch {
        // Игнорируем переполнение
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки лекции");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setLecture(cached);
        return;
      }
    } catch {
      // Игнорируем
    }
    void loadLecture("standard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/70 px-4 py-3">
        <span className="text-xs text-muted">
          Персональная ИИ-лекция (сохраняется локально)
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadLecture("simpler")}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-xs text-ink transition hover:border-accent disabled:opacity-40"
          >
            Объяснить проще
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadLecture("deeper")}
            className="rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-xs text-ink transition hover:border-accent disabled:opacity-40"
          >
            Углубиться
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadLecture("standard")}
            className="flex items-center gap-1 rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-ink disabled:opacity-40"
          >
            <RefreshCw className="size-3" />
            Обновить
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
          <Loader2 className="size-5 animate-spin text-accent" />
          <span>Преподаватель готовит подробную лекцию с примерами…</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && lecture && (
        <>
          <article className="rounded-2xl border border-line bg-surface/80 p-5 sm:p-6">
            <MarkdownMath>{lecture}</MarkdownMath>
          </article>

          <button
            type="button"
            onClick={onComplete}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-on-accent shadow-[0_0_16px_var(--glow-soft)] hover:brightness-110"
          >
            {alreadyDone
              ? "Перейти к практике →"
              : "Лекция изучена → Перейти к практике"}
          </button>
        </>
      )}
    </div>
  );
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Ошибка чтения файла"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Некорректное изображение"));
      img.onload = () => {
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function PracticeStage({
  topic,
  solvedCount,
  onSolved,
  onGoToExam,
}: {
  topic: CourseTopic;
  solvedCount: number;
  onSolved: () => void;
  onGoToExam: () => void;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credited, setCredited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLevel = Math.min(5, solvedCount + 1);

  async function handleImageFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
    } catch {
      // Игнорируем некорректный файл
    }
  }

  async function fetchNewTask() {
    setLoadingTask(true);
    setError(null);
    setFeedback(null);
    setAnswer("");
    setPendingImage(null);
    setCredited(false);
    try {
      const res = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-task",
          topicTitle: topic.title,
          topicSubtitle: topic.subtitle,
          difficulty: currentLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось сгенерировать задачу");
      setProblem(data.problem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка генерации задачи");
    } finally {
      setLoadingTask(false);
    }
  }

  useEffect(() => {
    void fetchNewTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  async function checkSolution() {
    if (!problem || (!answer.trim() && !pendingImage) || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check-task",
          topicTitle: topic.title,
          problem,
          userAnswer: answer.trim(),
          ...(pendingImage ? { image: pendingImage } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось проверить решение");
      setFeedback({ correct: Boolean(data.correct), text: data.feedback });
      if (data.correct && !credited) {
        setCredited(true);
        onSolved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка проверки");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-xs">
        <span className="font-medium text-ink">
          Решено задач: {solvedCount} (для зачёта нужно {TASKS_REQUIRED}) · Сложность {currentLevel}/5
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loadingTask || checking}
            onClick={() => void fetchNewTask()}
            className="flex items-center gap-1 rounded-xl border border-line bg-canvas/60 px-3 py-1.5 text-muted hover:border-accent hover:text-ink disabled:opacity-40"
          >
            <RefreshCw className="size-3" />
            Другая задача
          </button>
          {solvedCount >= TASKS_REQUIRED && (
            <button
              type="button"
              onClick={onGoToExam}
              className="rounded-xl bg-accent px-3 py-1.5 font-medium text-on-accent"
            >
              К экзамену →
            </button>
          )}
        </div>
      </div>

      {loadingTask && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
          <Loader2 className="size-5 animate-spin text-accent" />
          <span>Генерирую новую задачу уровня {currentLevel}/5…</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loadingTask && problem && (
        <div className="space-y-4 rounded-2xl border border-line bg-surface/80 p-5">
          <p className="text-xs font-medium tracking-wide text-accent uppercase">Условие задачи</p>
          <MarkdownMath>{problem}</MarkdownMath>

          <div className="border-t border-line pt-4">
            <label className="text-xs text-muted" htmlFor="course-answer">
              Напишите решение текстом или прикрепите фото тетради (можно вставить через Ctrl+V):
            </label>

            {pendingImage && (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-canvas/70 p-2.5">
                <img
                  src={pendingImage}
                  alt="Фото решения"
                  className="h-16 w-16 rounded-lg border border-line object-cover"
                />
                <span className="flex-1 text-xs text-muted">
                  Фото решения прикреплено. Можно сразу нажать «Проверить решение».
                </span>
                <button
                  type="button"
                  onClick={() => setPendingImage(null)}
                  className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                  aria-label="Удалить фото"
                >
                  <X className="size-4" />
                </button>
              </div>
            )}

            <textarea
              id="course-answer"
              value={answer}
              rows={3}
              onChange={(e) => setAnswer(e.target.value)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    void handleImageFile(item.getAsFile());
                    break;
                  }
                }
              }}
              placeholder="Напишите ответ/ход решения или вставьте фото через Ctrl+V…"
              className="mt-2 w-full rounded-xl border border-line bg-canvas/70 p-3 text-sm text-ink outline-none focus:border-accent"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleImageFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={checking}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-line bg-canvas/60 px-3.5 py-2 text-xs font-medium text-ink transition hover:border-accent disabled:opacity-40"
              >
                <ImagePlus className="size-3.5 text-accent" />
                Фото решения
              </button>

              <button
                type="button"
                disabled={(!answer.trim() && !pendingImage) || checking}
                onClick={() => void checkSolution()}
                className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-medium text-on-accent shadow-[0_0_14px_var(--glow-soft)] disabled:opacity-40"
              >
                {checking ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <SendHorizontal className="size-3.5" />
                )}
                Проверить решение
              </button>

              {feedback?.correct && (
                <button
                  type="button"
                  onClick={() => void fetchNewTask()}
                  className="rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-500/25"
                >
                  Следующая задача →
                </button>
              )}
            </div>
          </div>

          {feedback && (
            <div
              className={[
                "rounded-2xl border p-4",
                feedback.correct
                  ? "border-emerald-400/50 bg-emerald-500/10"
                  : "border-amber-400/50 bg-amber-500/10",
              ].join(" ")}
            >
              <p
                className={[
                  "mb-2 text-xs font-semibold uppercase",
                  feedback.correct ? "text-emerald-300" : "text-amber-300",
                ].join(" ")}
              >
                {feedback.correct ? "Верно! Задача засчитана" : "Есть неточность — попробуйте исправить"}
              </p>
              <MarkdownMath>{feedback.text}</MarkdownMath>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type BugChallenge = {
  problem: string;
  solution: string;
  hasMistake: boolean;
  explanation: string;
};

function ExamBugStage({
  topic,
  solvedCount,
  onSolved,
  onBackToMap,
}: {
  topic: CourseTopic;
  solvedCount: number;
  onSolved: () => void;
  onBackToMap: () => void;
}) {
  const [challenge, setChallenge] = useState<BugChallenge | null>(null);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadChallenge() {
    setLoading(true);
    setError(null);
    setPicked(null);
    try {
      const res = await fetch("/api/course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-bug",
          topicTitle: topic.title,
          topicSubtitle: topic.subtitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось загрузить задание");
      setChallenge(data as BugChallenge);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки задания");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadChallenge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id]);

  function handleGuess(userSaysHasMistake: boolean) {
    if (!challenge || picked !== null) return;
    setPicked(userSaysHasMistake);
    if (userSaysHasMistake === challenge.hasMistake) {
      onSolved();
    }
  }

  const isRight = challenge !== null && picked === challenge.hasMistake;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/70 px-4 py-3 text-xs">
        <span className="font-medium text-ink">
          Экзамен «Найди ошибку»: пройдено {Math.min(solvedCount, EXAM_REQUIRED)} / {EXAM_REQUIRED}
        </span>
        {solvedCount >= EXAM_REQUIRED && (
          <button
            type="button"
            onClick={onBackToMap}
            className="rounded-xl bg-accent px-3 py-1.5 font-medium text-on-accent"
          >
            К карте 12 тем
          </button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
          <Loader2 className="size-5 animate-spin text-accent" />
          <span>Готовлю экзаменационное решение для проверки…</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && challenge && (
        <div className="space-y-4 rounded-2xl border border-line bg-surface/80 p-5">
          <div>
            <p className="text-xs font-medium text-accent uppercase">Задача</p>
            <div className="mt-1">
              <MarkdownMath>{challenge.problem}</MarkdownMath>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-canvas/70 p-4">
            <p className="mb-2 text-xs font-medium text-muted uppercase">
              Предложенное решение (проверь каждый шаг)
            </p>
            <MarkdownMath>{challenge.solution}</MarkdownMath>
          </div>

          {picked === null ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleGuess(true)}
                className="rounded-xl border border-rose-400/60 bg-rose-500/15 px-4 py-2.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/25"
              >
                Здесь есть ошибка
              </button>
              <button
                type="button"
                onClick={() => handleGuess(false)}
                className="rounded-xl border border-emerald-400/60 bg-emerald-500/15 px-4 py-2.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/25"
              >
                Решение полностью верное
              </button>
            </div>
          ) : (
            <div
              className={[
                "space-y-3 rounded-2xl border p-4",
                isRight
                  ? "border-emerald-400/50 bg-emerald-500/10"
                  : "border-rose-400/50 bg-rose-500/10",
              ].join(" ")}
            >
              <p
                className={[
                  "text-xs font-semibold uppercase",
                  isRight ? "text-emerald-300" : "text-rose-300",
                ].join(" ")}
              >
                {isRight ? "Точно в цель! Раунд засчитан" : "Не угадал — посмотри разбор"}
              </p>
              <MarkdownMath>{challenge.explanation}</MarkdownMath>
              <button
                type="button"
                onClick={() => void loadChallenge()}
                className="rounded-xl bg-accent px-4 py-2 text-xs font-medium text-on-accent"
              >
                Следующий раунд →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}