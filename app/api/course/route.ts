import { NextResponse } from "next/server";

type CourseAction = "lecture" | "generate-task" | "check-task" | "generate-bug";

type CourseRequest = {
  action: CourseAction;
  topicTitle: string;
  topicSubtitle?: string;
  style?: "standard" | "simpler" | "deeper";
  difficulty?: number; // 1..5
  problem?: string;
  userAnswer?: string;
  image?: string; // data:image/...;base64,...
};

type GoogleModel = {
  name?: string;
  supportedGenerationMethods?: string[];
};

let cachedModels: { list: string[]; expiresAt: number } | null = null;

function scoreModel(id: string): number {
  const lower = id.toLowerCase();
  if (
    /embed|imagen|veo|tts|audio|live|image|vision|robotics|computer-use|aqa|bisheng|learnlm/.test(
      lower,
    )
  ) {
    return 999;
  }
  if (lower.includes("flash-lite")) return 1;
  if (lower.includes("flash") && !lower.includes("exp")) return 2;
  if (lower.startsWith("gemma-3") && lower.includes("27b")) return 3;
  if (lower.startsWith("gemma-3") && lower.includes("12b")) return 4;
  if (lower.startsWith("gemma")) return 5;
  if (lower.includes("flash")) return 6;
  return 10;
}

async function getCandidateModels(apiKey: string): Promise<string[]> {
  if (cachedModels && Date.now() < cachedModels.expiresAt) {
    return cachedModels.list;
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const data = (await res.json()) as { models?: GoogleModel[] };
    const names = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => (m.name ?? "").replace(/^models\//, ""))
      .filter(Boolean)
      .filter((id) => scoreModel(id) < 999)
      .sort((a, b) => scoreModel(a) - scoreModel(b));

    if (names.length > 0) {
      const top = names.slice(0, 8);
      cachedModels = { list: top, expiresAt: Date.now() + 10 * 60 * 1000 };
      return top;
    }
  } catch {
    // Используем запасной список
  }
  return ["gemini-3.8-flash", "gemma-3-27b-it", "gemma-3-12b-it"];
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function generateText(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  image?: string,
) {
  const modelsToTry = await getCandidateModels(apiKey);
  const errors: string[] = [];
  const parsedImage = image ? parseDataUrl(image) : null;

  for (const model of modelsToTry) {
    const isGemma = model.toLowerCase().startsWith("gemma");
    const parts: Array<Record<string, unknown>> = [
      { text: isGemma ? `${systemPrompt}\n\n${userPrompt}` : userPrompt },
    ];

    if (parsedImage) {
      parts.push({
        inlineData: {
          mimeType: parsedImage.mimeType,
          data: parsedImage.data,
        },
      });
    }

    const payload: Record<string, unknown> = {
      contents: [{ role: "user", parts }],
    };
    if (!isGemma) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();

    if (res.ok) {
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim() || "";
      if (text) return { text, model };
    }

    errors.push(`${model}: ${res.status}`);
    if ((data?.error?.message || "").toLowerCase().includes("api key")) {
      throw new Error(data.error.message);
    }
  }

  throw new Error(`Модели сейчас заняты (${errors.join(", ")}). Попробуйте ещё раз.`);
}

function parseBugChallenge(raw: string) {
  const getSection = (tag: string) => {
    const regex = new RegExp(`---${tag}---([\\s\\S]*?)(?=---[A-Z_]+---|$)`, "i");
    return raw.match(regex)?.[1]?.trim() || "";
  };

  const problem = getSection("PROBLEM");
  const solution = getSection("SOLUTION");
  const flag = getSection("HAS_MISTAKE").toUpperCase();
  const explanation = getSection("EXPLANATION");

  if (!problem || !solution) {
    return {
      problem: "Проверьте приведённое ниже рассуждение:",
      solution: raw,
      hasMistake: flag.includes("YES") || flag.includes("ДА"),
      explanation: explanation || "Разберите шаги решения и проверьте формулы.",
    };
  }

  return {
    problem,
    solution,
    hasMistake: flag.includes("YES") || flag.includes("ДА"),
    explanation,
  };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Не найден GEMINI_API_KEY в файле .env.local." },
        { status: 500 },
      );
    }

    const body = (await req.json()) as CourseRequest;
    const { action, topicTitle, topicSubtitle = "" } = body;

    const baseSystem =
      "Ты — сильный университетский преподаватель линейной алгебры. Отвечай строго на русском языке. Все математические формулы пиши в LaTeX: $...$ для строчных и $$...$$ для блочных формул.";

    if (action === "lecture") {
      const styleNote =
        body.style === "simpler"
          ? "Объясни максимально простым языком, через наглядные аналогии и лёгкие числовые примеры."
          : body.style === "deeper"
            ? "Сделай углублённую лекцию: добавь строгие доказательства ключевых свойств и сложный экзаменационный пример."
            : "Сделай полноценную университетскую лекцию: баланс понятной интуиции и строгой математики.";

      const prompt = [
        `Напиши подробный конспект по теме: «${topicTitle}» (${topicSubtitle}).`,
        styleNote,
        "Обязательная структура (используй заголовки Markdown ###):",
        "1. Интуиция: зачем это нужно и как это представить.",
        "2. Строгие определения и ключевые формулы.",
        "3. Два полностью разобранных примера с пошаговым решением.",
        "4. Частые ошибки студентов на экзамене и как их избежать.",
      ].join("\n");

      const { text } = await generateText(apiKey, baseSystem, prompt);
      return NextResponse.json({ lecture: text });
    }

    if (action === "generate-task") {
      const level = Math.min(5, Math.max(1, body.difficulty ?? 1));
      const levelDesc =
        level <= 2
          ? "базовый уровень (отработка формулы с небольшими целыми числами)"
          : level <= 4
            ? "средний / экзаменационный уровень (в 2–3 шага)"
            : "продвинутый экзаменационный уровень (с параметром или тонким свойством)";

      const prompt = [
        `Придумай ОДНУ конкретную практическую задачу по теме «${topicTitle}» (${topicSubtitle}).`,
        `Сложность: ${level} из 5 — ${levelDesc}.`,
        "Требования:",
        "- Напиши ТОЛЬКО условие задачи (без решения и без ответа).",
        "- Числа должны быть аккуратными, чтобы задачу можно было решить вручную.",
        "- Задача должна иметь чёткий проверяемый ответ.",
      ].join("\n");

      const { text } = await generateText(apiKey, baseSystem, prompt);
      return NextResponse.json({ problem: text });
    }

    if (action === "check-task") {
      const prompt = [
        `Тема: «${topicTitle}».`,
        `Условие задачи:\n${body.problem ?? ""}`,
        body.userAnswer?.trim()
          ? `Ответ / комментарий студента:\n${body.userAnswer.trim()}`
          : "Студент прислал решение на фотографии.",
        body.image
          ? "Внимательно изучи прикреплённое фото решения (рукописное или печатное) шаг за шагом."
          : "",
        "",
        "Проверь решение студента. В САМОЙ ПЕРВОЙ СТРОКЕ напиши строго одно из двух:",
        "VERDICT: CORRECT",
        "или",
        "VERDICT: INCORRECT",
        "",
        "Со второй строки напиши разбор:",
        "- Если CORRECT: похвали, кратко подтверди правильность хода мыслей.",
        "- Если INCORRECT: НЕ выдавай сразу готовый финальный ответ! Укажи, на каком именно шаге ошибка, и дай наводящую подсказку, чтобы студент исправил сам.",
      ]
        .filter(Boolean)
        .join("\n");

      const { text } = await generateText(apiKey, baseSystem, prompt, body.image);
      const firstLine = text.split("\n")[0]?.toUpperCase() || "";
      const correct = firstLine.includes("CORRECT") && !firstLine.includes("INCORRECT");
      const feedback = text.replace(/^VERDICT:\s*(IN)?CORRECT\s*/i, "").trim();

      return NextResponse.json({ correct, feedback });
    }

    if (action === "generate-bug") {
      const wantMistake = Math.random() < 0.65;
      const prompt = [
        `Создай задание «Найди ошибку» для экзамена по теме «${topicTitle}» (${topicSubtitle}).`,
        wantMistake
          ? "В приведённом решении ОБЯЗАТЕЛЬНО спрячь одну тонкую, но реальную математическую ошибку (знак, порядок умножения матриц, забытый множитель, неверное условие и т.п.)."
          : "Сделай приведённое решение ПОЛНОСТЬЮ ПРАВИЛЬНЫМ, без единой ошибки.",
        "",
        "Ответ оформи СТРОГО по этим 4 маркерам:",
        "---PROBLEM---",
        "(короткое условие задачи)",
        "---SOLUTION---",
        "(пошаговое решение в 3–4 шага)",
        "---HAS_MISTAKE---",
        wantMistake ? "YES" : "NO",
        "---EXPLANATION---",
        "(чёткое объяснение, где именно ошибка или почему все шаги верны)",
      ].join("\n");

      const { text } = await generateText(apiKey, baseSystem, prompt);
      return NextResponse.json(parseBugChallenge(text));
    }

    return NextResponse.json({ error: "Неизвестное действие." }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка сервера курса.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}