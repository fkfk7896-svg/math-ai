import { NextResponse } from "next/server";

type IncomingMessage = {
  role: "user" | "assistant";
  text: string;
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
    // Используем запасной список ниже
  }

  return ["gemini-3.8-flash", "gemma-3-27b-it", "gemma-3-12b-it"];
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Не найден GEMINI_API_KEY в файле .env.local. Проверь файл и перезапусти npm run dev." },
        { status: 500 },
      );
    }

    const body = (await req.json()) as {
      sectionTitle?: string;
      messages?: IncomingMessage[];
    };

    const sectionTitle = body.sectionTitle || "Математика";
    const messages = body.messages ?? [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "Пустой запрос." }, { status: 400 });
    }

    const systemPrompt = [
      `Ты — опытный и дружелюбный ИИ-репетитор по математике. Текущий раздел: «${sectionTitle}».`,
      "Объясняй пошагово, понятно и логично — от школьного до университетского уровня.",
      "Если студент прислал фото или скриншот задачи, сначала аккуратно перепиши условие в LaTeX, затем разбери решение по шагам.",
      "Не просто выдавай сухой ответ, а показывай ход решения, ключевые формулы и проверяй понимание.",
      "Все математические формулы обязательно пиши в формате LaTeX: одиночные знаки $...$ для формул внутри строки и двойные $$...$$ для крупных формул на отдельной строке.",
      "Отвечай на русском языке.",
    ].join(" ");

    const modelsToTry = await getCandidateModels(apiKey);
    const errors: string[] = [];

    for (const model of modelsToTry) {
      const isGemma = model.toLowerCase().startsWith("gemma");

      const contents = messages.map((m, idx) => {
        const parts: Array<Record<string, unknown>> = [];
        const baseText = m.text.trim() || (m.image ? "Разбери задачу на этом изображении пошагово." : "");
        const finalText =
          isGemma && idx === 0
            ? `${systemPrompt}\n\nВопрос студента:\n${baseText}`
            : baseText;

        if (finalText) {
          parts.push({ text: finalText });
        }

        if (m.image) {
          const parsed = parseDataUrl(m.image);
          if (parsed) {
            parts.push({
              inlineData: {
                mimeType: parsed.mimeType,
                data: parsed.data,
              },
            });
          }
        }

        return {
          role: m.role === "assistant" ? "model" : "user",
          parts,
        };
      });

      const payload: Record<string, unknown> = { contents };
      if (!isGemma) {
        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (response.ok) {
        const reply =
          data?.candidates?.[0]?.content?.parts
            ?.map((p: { text?: string }) => p.text ?? "")
            .join("")
            .trim() || "Не удалось получить ответ от модели.";

        return NextResponse.json({ reply, model });
      }

      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      errors.push(`${model}: ${response.status}`);

      if (errMsg.toLowerCase().includes("api key")) {
        return NextResponse.json({ error: errMsg }, { status: response.status });
      }
    }

    return NextResponse.json(
      { error: `Не удалось получить ответ ни от одной модели (${errors.join(", ")}). Попробуйте чуть позже.` },
      { status: 503 },
    );
  } catch {
    return NextResponse.json(
      { error: "Ошибка соединения с сервером ИИ. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}