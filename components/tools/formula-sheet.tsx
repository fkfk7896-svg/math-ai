"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Search } from "lucide-react";

type Category =
  | "all"
  | "algebra"
  | "geometry"
  | "trigonometry"
  | "calculus"
  | "linalg"
  | "probability";

type FormulaItem = {
  id: string;
  title: string;
  formula: string;
  note: string;
  category: Exclude<Category, "all">;
  level: "Школа" | "ВУЗ";
};

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "all", label: "Все разделы" },
  { id: "algebra", label: "Алгебра" },
  { id: "geometry", label: "Геометрия" },
  { id: "trigonometry", label: "Тригонометрия" },
  { id: "calculus", label: "Матанализ" },
  { id: "linalg", label: "Линейная алгебра" },
  { id: "probability", label: "Теория вероятностей" },
];

const FORMULAS: FormulaItem[] = [
  // Алгебра
  {
    id: "alg-1",
    title: "Квадратное уравнение и дискриминант",
    formula: "D = b² − 4ac;   x₁,₂ = (−b ± √D) / (2a)",
    note: "Для ax² + bx + c = 0 при a ≠ 0",
    category: "algebra",
    level: "Школа",
  },
  {
    id: "alg-2",
    title: "Формулы сокращённого умножения",
    formula: "(a ± b)² = a² ± 2ab + b²;   a² − b² = (a − b)(a + b)",
    note: "Также: a³ ± b³ = (a ± b)(a² ∓ ab + b²)",
    category: "algebra",
    level: "Школа",
  },
  {
    id: "alg-3",
    title: "Свойства логарифмов",
    formula: "logₐ(xy) = logₐx + logₐy;   logₐ(x/y) = logₐx − logₐy;   logₐ(xᵖ) = p·logₐx",
    note: "Переход к новому основанию: logₐb = ln(b) / ln(a)",
    category: "algebra",
    level: "Школа",
  },
  {
    id: "alg-4",
    title: "Арифметическая и геометрическая прогрессии",
    formula: "Sₙ = (a₁ + aₙ)·n / 2;   Sₙ = b₁·(qⁿ − 1) / (q − 1)",
    note: "При |q| < 1 сумма бесконечной геом. прогрессии: S = b₁ / (1 − q)",
    category: "algebra",
    level: "Школа",
  },

  // Геометрия
  {
    id: "geo-1",
    title: "Теорема косинусов и синусов",
    formula: "c² = a² + b² − 2ab·cos(γ);   a / sin(α) = b / sin(β) = c / sin(γ) = 2R",
    note: "R — радиус описанной окружности",
    category: "geometry",
    level: "Школа",
  },
  {
    id: "geo-2",
    title: "Площадь треугольника (Герон и общая)",
    formula: "S = ½·a·h = ½·a·b·sin(γ) = √(p(p − a)(p − b)(p − c))",
    note: "p = (a + b + c) / 2 — полупериметр",
    category: "geometry",
    level: "Школа",
  },
  {
    id: "geo-3",
    title: "Окружность, круг и шар",
    formula: "L = 2πR;   Sкр = πR²;   Vшара = (4/3)πR³;   Sшара = 4πR²",
    note: "Для цилиндра: V = πR²h; для конуса: V = (1/3)πR²h",
    category: "geometry",
    level: "Школа",
  },

  // Тригонометрия
  {
    id: "trig-1",
    title: "Основное тригонометрическое тождество",
    formula: "sin²α + cos²α = 1;   1 + tg²α = 1 / cos²α",
    note: "Также: 1 + ctg²α = 1 / sin²α",
    category: "trigonometry",
    level: "Школа",
  },
  {
    id: "trig-2",
    title: "Двойной угол",
    formula: "sin(2α) = 2·sinα·cosα;   cos(2α) = cos²α − sin²α = 1 − 2sin²α",
    note: "Понижение степени: sin²α = (1 − cos2α)/2, cos²α = (1 + cos2α)/2",
    category: "trigonometry",
    level: "Школа",
  },
  {
    id: "trig-3",
    title: "Формула Эйлера",
    formula: "e^(iφ) = cos(φ) + i·sin(φ)",
    note: "Связь показательной функции с тригонометрией в комплексной плоскости",
    category: "trigonometry",
    level: "ВУЗ",
  },

  // Матанализ
  {
    id: "calc-1",
    title: "Замечательные пределы",
    formula: "lim(x→0) sin(x)/x = 1;   lim(x→∞) (1 + 1/x)ˣ = e",
    note: "Следствия: lim(x→0) (eˣ − 1)/x = 1; lim(x→0) ln(1 + x)/x = 1",
    category: "calculus",
    level: "ВУЗ",
  },
  {
    id: "calc-2",
    title: "Правила дифференцирования",
    formula: "(u·v)' = u'v + uv';   (u/v)' = (u'v − uv') / v²;   (f(g(x)))' = f'(g(x))·g'(x)",
    note: "(xⁿ)' = n·xⁿ⁻¹;  (eˣ)' = eˣ;  (ln x)' = 1/x;  (sin x)' = cos x",
    category: "calculus",
    level: "ВУЗ",
  },
  {
    id: "calc-3",
    title: "Таблица основных интегралов",
    formula: "∫ xⁿ dx = xⁿ⁺¹/(n+1) + C;   ∫ (1/x) dx = ln|x| + C;   ∫ eˣ dx = eˣ + C",
    note: "∫ dx/(a²+x²) = (1/a)·arctg(x/a) + C;  ∫ dx/√(a²−x²) = arcsin(x/a) + C",
    category: "calculus",
    level: "ВУЗ",
  },
  {
    id: "calc-4",
    title: "Интегрирование по частям и Ньютон—Лейбниц",
    formula: "∫ u dv = u·v − ∫ v du;   ∫[a..b] f(x) dx = F(b) − F(a)",
    note: "Основная формула определённого интеграла",
    category: "calculus",
    level: "ВУЗ",
  },
  {
    id: "calc-5",
    title: "Ряд Тейлора (Маклорена)",
    formula: "f(x) = ∑(n=0..∞) [ f⁽ⁿ⁾(x₀) / n! ] · (x − x₀)ⁿ",
    note: "eˣ = 1 + x + x²/2! + x³/3! + ... (при x₀ = 0)",
    category: "calculus",
    level: "ВУЗ",
  },

  // Линейная алгебра
  {
    id: "lin-1",
    title: "Скалярное и векторное произведение",
    formula: "a·b = |a||b|cosφ = x₁x₂ + y₁y₂ + z₁z₂;   |a × b| = |a||b|sinφ",
    note: "Векторы ортогональны, если a·b = 0",
    category: "linalg",
    level: "ВУЗ",
  },
  {
    id: "lin-2",
    title: "Обратная матрица и правило Крамера",
    formula: "A⁻¹ = (1 / det(A)) · A*;   xᵢ = Δᵢ / Δ",
    note: "A* — присоединённая матрица; существует при det(A) ≠ 0",
    category: "linalg",
    level: "ВУЗ",
  },
  {
    id: "lin-3",
    title: "Собственные значения и векторы",
    formula: "A·v = λ·v;   det(A − λE) = 0",
    note: "Характеристическое уравнение матрицы A",
    category: "linalg",
    level: "ВУЗ",
  },

  // Теория вероятностей
  {
    id: "prob-1",
    title: "Формула Байеса",
    formula: "P(Hᵢ | A) = [ P(Hᵢ) · P(A | Hᵢ) ] / P(A)",
    note: "Где P(A) = ∑ P(Hₖ)·P(A | Hₖ) — формула полной вероятности",
    category: "probability",
    level: "ВУЗ",
  },
  {
    id: "prob-2",
    title: "Формула Бернулли и сочетания",
    formula: "Pₙ(k) = Cₙᵏ · pᵏ · qⁿ⁻ᵏ;   Cₙᵏ = n! / (k!(n − k)!)",
    note: "Вероятность ровно k успехов в n независимых испытаниях (q = 1 − p)",
    category: "probability",
    level: "ВУЗ",
  },
  {
    id: "prob-3",
    title: "Матожидание и дисперсия",
    formula: "M(X) = ∑ xᵢ·pᵢ;   D(X) = M(X²) − [M(X)]²;   σ(X) = √D(X)",
    note: "Для непрерывной СВ: M(X) = ∫ x·f(x) dx",
    category: "probability",
    level: "ВУЗ",
  },
];

export function FormulaSheet() {
  const [category, setCategory] = useState<Category>("all");
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FORMULAS.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.formula.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q)
      );
    });
  }, [category, query]);

  const handleCopy = async (item: FormulaItem) => {
    try {
      await navigator.clipboard.writeText(item.formula);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId((prev) => (prev === item.id ? null : prev)), 1500);
    } catch {
      // Игнорируем, если буфер обмена недоступен
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Поиск */}
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск формулы (например: интеграл, Байес, дискриминант, матрица)..."
          className="w-full rounded-2xl border border-line bg-canvas/70 py-2.5 pr-4 pl-10 text-sm text-ink outline-none focus:border-accent"
        />
      </div>

      {/* Фильтры по разделам */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setCategory(cat.id)}
            className={[
              "rounded-xl border px-3 py-1.5 text-xs font-medium transition",
              category === cat.id
                ? "border-accent bg-accent text-on-accent shadow-[0_0_12px_var(--glow-soft)]"
                : "border-line bg-surface text-muted hover:text-ink",
            ].join(" ")}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Сетка карточек */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface py-10 text-center text-sm text-muted">
          По запросу ничего не найдено.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-line bg-surface/70 p-4 transition hover:border-accent/60"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                  <span
                    className={[
                      "shrink-0 rounded-lg border px-2 py-0.5 text-[11px] font-medium",
                      item.level === "ВУЗ"
                        ? "border-accent/50 bg-accent/15 text-accent"
                        : "border-line bg-canvas/60 text-muted",
                    ].join(" ")}
                  >
                    {item.level}
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-line/70 bg-canvas/70 px-3 py-2.5 font-mono text-sm font-medium text-ink">
                  {item.formula}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs leading-5 text-muted">{item.note}</p>
                <button
                  type="button"
                  onClick={() => handleCopy(item)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-canvas/60 text-muted transition hover:border-accent hover:text-ink"
                  title="Скопировать формулу"
                >
                  {copiedId === item.id ? (
                    <Check className="size-3.5 text-accent" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}