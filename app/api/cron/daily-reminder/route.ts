import { NextResponse } from "next/server";

const TOPICS = [
  "Матрицы и операции над ними",
  "Определители 2-го и 3-го порядка",
  "Обратная матрица и ранг матрицы",
  "Системы линейных уравнений (метод Гаусса и Крамера)",
  "Векторы, скалярное и векторное произведение",
  "Собственные значения и собственные векторы",
  "Комплексные числа и формула Муавра",
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://mathaicourseamirfdfdfivhudg-git-main-v-4aee.vercel.app";

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: "Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID" },
        { status: 500 },
      );
    }

    const randomTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

    const message = [
      "🔥 <b>MathAI: время поддержать стрик!</b>",
      "",
      `📘 Тема дня: <b>${randomTopic}</b>`,
      "Реши всего 1 задачу в тренажёре или пройди мини-экзамен «Найди ошибку», чтобы серия не сгорела.",
      "",
      `👉 <a href="${appUrl}">Открыть MathAI</a>`,
    ].join("\n");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );

    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      return NextResponse.json(
        { error: "Ошибка Telegram API", details: tgData },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, sentTo: chatId, topic: randomTopic });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка отправки" },
      { status: 500 },
    );
  }
}