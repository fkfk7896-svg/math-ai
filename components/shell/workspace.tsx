"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Dices,
  Flame,
  ImagePlus,
  Loader2,
  SendHorizontal,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { findGroupTitle, type LessonSection } from "@/lib/curriculum";
import {
  getLevelInfo,
  recordActivity,
  touchDailyVisit,
  type ProgressData,
} from "@/lib/progress";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  image?: string;
};

type Difficulty = "База" | "Экзамен" | "Олимпиада";

const DIFFICULTIES: Difficulty[] = ["База", "Экзамен", "Олимпиада"];

type WorkspaceProps = {
  section: LessonSection;
};

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

export function Workspace({ section }: WorkspaceProps) {
  const storageKey = `mathai-chat-${section.id}`;
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("База");
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [justSolved, setJustSolved] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const hydrated = useRef(false);
  const groupTitle = findGroupTitle(section.id);

  useEffect(() => {
    setProgress(touchDailyVisit());
  }, [section.id]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          const maxId = parsed.reduce((max, m) => Math.max(max, m.id), 0);
          nextId.current = maxId + 1;
        }
      }
    } catch {
      // Начинаем с пустого чата при повреждении данных
    } finally {
      hydrated.current = true;
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      if (messages.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch {
      // Если фото переполнили localStorage — сохраняем хотя бы текстовую историю
      try {
        const textOnly = messages.map(({ id, role, text }) => ({ id, role, text }));
        localStorage.setItem(storageKey, JSON.stringify(textOnly));
      } catch {
        // Игнорируем
      }
    }
  }, [messages, storageKey]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleImageFile(file: File | null | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImage(file);
      setPendingImage(compressed);
    } catch {
      // Игнорируем некорректный файл
    }
  }

  async function sendMessage(
    rawText: string,
    kind: "message" | "task" = "message",
    image?: string | null,
  ) {
    const text = rawText.trim();
    if ((!text && !image) || loading) return;

    const userMsg: ChatMessage = {
      id: nextId.current++,
      role: "user",
      text: text || "Разбери задачу на этом изображении пошагово.",
      ...(image ? { image } : {}),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setLoading(true);
    setProgress(recordActivity(section.id, kind));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionTitle: section.title,
          messages: nextHistory.map(({ role, text: content, image: img }) => ({
            role,
            text: content,
            ...(img ? { image: img } : {}),
          })),
        }),
      });
      const data = await res.json();
      const replyText = res.ok ? data.reply : `Ошибка: ${data.error || "не удалось получить ответ"}`;

      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", text: replyText },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          role: "assistant",
          text: "Ошибка сети: не удалось связаться с сервером.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    if ((!draft.trim() && !pendingImage) || loading) return;
    const text = draft;
    const img = pendingImage;
    setDraft("");
    setPendingImage(null);
    void sendMessage(text, "message", img);
  }

  function requestTask() {
    const prompt = `Дай мне одну практическую задачу по теме «${section.title}» (уровень: ${difficulty}). Напиши только условие задачи и попроси меня прислать ход решения или ответ. Готовое решение сразу НЕ пиши — проверь меня только после моего ответа.`;
    void sendMessage(prompt, "task");
  }

  function markTaskSolved() {
    setProgress(recordActivity(section.id, "solved"));
    setJustSolved(true);
    setTimeout(() => setJustSolved(false), 1800);
  }

  function clearChat() {
    setMessages([]);
    setPendingImage(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Игнорируем
    }
  }

  const levelInfo = getLevelInfo(progress?.xp ?? 0);
  const sectionMastery = progress?.sectionPoints[section.id] ?? 0;

  return (
    <section className="glass flex min-h-0 min-w-0 flex-1 flex-col rounded-3xl">
      <header className="border-b border-line px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-accent uppercase">{groupTitle}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{section.title}</h1>
              <span className="rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[0.7rem] font-medium text-accent">
                ИИ-репетитор · онлайн
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line bg-surface p-0.5 text-xs">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  disabled={loading}
                  onClick={() => setDifficulty(level)}
                  className={[
                    "rounded-lg px-2.5 py-1 font-medium transition disabled:opacity-50",
                    difficulty === level
                      ? "bg-accent text-on-accent shadow-[0_0_12px_var(--glow-soft)]"
                      : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  {level}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={requestTask}
              className="flex items-center gap-1.5 rounded-xl border border-accent/60 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent hover:text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Dices className="size-3.5" />
              Дай задачу
            </button>
          </div>
        </div>

        {progress && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line bg-surface/70 px-3.5 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <Flame className="size-3.5 text-accent" />
              Стрик: {progress.streak} дн.
            </span>
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <Trophy className="size-3.5 text-accent" />
              Ур. {levelInfo.level} · {progress.xp} XP
            </span>
            <span className="text-muted">Решено задач: {progress.solvedTasks}</span>

            <div className="ml-auto flex min-w-[10rem] items-center gap-2">
              <span className="text-muted">Тема: {sectionMastery}%</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-canvas/80">
                <div
                  className="h-full rounded-full bg-accent shadow-[0_0_10px_var(--glow)] transition-all duration-300"
                  style={{ width: `${sectionMastery}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <p className="mt-2.5 max-w-3xl text-sm leading-6 text-muted">{section.summary}</p>
      </header>

      <div ref={scrollerRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {messages.length === 0 ? (
          <div>
            <div className="mb-4 flex items-center gap-2 text-sm text-muted">
              <Sparkles className="size-4 text-accent" aria-hidden="true" />
              <p>Выберите пример ниже, нажмите «Дай задачу» сверху или прикрепите фото задачи.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {section.examples.map((example) => (
                <button
                  key={example.title}
                  type="button"
                  onClick={() => setDraft(example.prompt)}
                  className="rounded-2xl border border-line bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_0_22px_var(--glow-soft)]"
                >
                  <p className="text-xs text-accent">Пример темы</p>
                  <p className="mt-2 font-medium text-ink">{example.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{example.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3" aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={[
                  "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6",
                  message.role === "user"
                    ? "ml-auto bg-accent text-on-accent"
                    : "border border-line bg-surface text-ink",
                ].join(" ")}
              >
                <p className="mb-1 text-[0.68rem] font-semibold tracking-wide uppercase opacity-70">
                  {message.role === "user" ? "Вы" : "Репетитор"}
                </p>
                {message.image && (
                  <img
                    src={message.image}
                    alt="Прикреплённая задача"
                    className="mb-2 max-h-64 rounded-xl border border-black/15 object-contain"
                  />
                )}
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                ) : (
                  <div className="space-y-2 overflow-x-auto [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:leading-6 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {message.text}
                    </ReactMarkdown>
                  </div>
                )}
              </article>
            ))}

            {loading && (
              <div className="flex items-center gap-2 self-start rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted">
                <Loader2 className="size-4 animate-spin text-accent" />
                <span>Репетитор анализирует задачу…</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={markTaskSolved}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-xl border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent hover:text-on-accent disabled:opacity-40"
              >
                <CheckCircle2 className="size-3.5" />
                {justSolved ? "+25 XP засчитано!" : "Засчитать решённую задачу (+25 XP)"}
              </button>

              <button
                type="button"
                onClick={clearChat}
                disabled={loading}
                className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline disabled:opacity-40"
              >
                Очистить чат и вернуться к примерам
              </button>
            </div>
          </div>
        )}
      </div>

      <form
        className="border-t border-line p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {pendingImage && (
          <div className="mb-2 flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2">
            <img
              src={pendingImage}
              alt="Предпросмотр фото"
              className="h-14 w-14 rounded-xl border border-line object-cover"
            />
            <span className="flex-1 text-xs text-muted">
              Фото прикреплено. Можно отправить сразу или дописать вопрос.
            </span>
            <button
              type="button"
              onClick={() => setPendingImage(null)}
              className="grid size-8 place-items-center rounded-xl text-muted hover:bg-canvas/60 hover:text-ink"
              aria-label="Удалить фото"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2">
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
          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-canvas/50 text-muted transition hover:border-accent hover:text-ink disabled:opacity-40"
            title="Прикрепить фото или скриншот задачи"
            aria-label="Прикрепить фото"
          >
            <ImagePlus className="size-4" />
          </button>

          <label className="sr-only" htmlFor="tutor-draft">
            Сообщение репетитору
          </label>
          <textarea
            id="tutor-draft"
            value={draft}
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            onPaste={(event) => {
              const items = event.clipboardData?.items;
              if (!items) return;
              for (const item of items) {
                if (item.type.startsWith("image/")) {
                  event.preventDefault();
                  void handleImageFile(item.getAsFile());
                  break;
                }
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={`Спросите по теме «${section.title}» или вставьте скриншот (Ctrl+V)…`}
            className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-ink outline-none"
          />
          <button
            type="submit"
            disabled={(!draft.trim() && !pendingImage) || loading}
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-on-accent disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Отправить сообщение"
          >
            <SendHorizontal className="size-4" />
          </button>
        </div>
        <p className="px-2 pt-2 text-xs text-muted">
          Можно прикрепить фото кнопкой слева или вставить скриншот через Ctrl+V.
        </p>
      </form>
    </section>
  );
}