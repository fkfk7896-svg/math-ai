import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MathAI — Линейная алгебра и ИИ-репетитор",
    short_name: "MathAI",
    description:
      "Интерактивный курс из 12 тем, ИИ-репетитор с формулами LaTeX, проверка решений по фото, калькулятор и доска.",
    start_url: "/",
    display: "standalone",
    background_color: "#070406",
    theme_color: "#ff2d55",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}