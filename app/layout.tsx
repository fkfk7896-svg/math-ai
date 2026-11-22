import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { CircuitBackground } from "@/components/background/circuit-background";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/lib/settings";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MathAI — математика с ИИ-репетитором",
  description:
    "Учебная платформа по математике: от школьной программы до высшей математики, курс из 12 тем, проверка по фото и инструменты.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ff2d55",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      data-theme="red-neon"
      data-lines="on"
      data-text="md"
      suppressHydrationWarning
      className={`${manrope.variable} h-full antialiased`}
      style={{ "--bg-brightness": "0.72" } as CSSProperties}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="h-full overflow-hidden">
        <ThemeProvider>
          <CircuitBackground />
          <div className="relative z-10 h-full">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}