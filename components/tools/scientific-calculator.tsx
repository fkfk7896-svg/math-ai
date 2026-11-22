"use client";

import { useState } from "react";
import { create, all } from "mathjs";
import { Delete, History, RotateCcw } from "lucide-react";

const math = create(all);

type CalcTab = "scientific" | "derivative" | "matrix";
type AngleMode = "DEG" | "RAD";
type HistoryItem = { expr: string; result: string };

const DEG_SCOPE = {
  sin: (x: number) => Math.sin((x * Math.PI) / 180),
  cos: (x: number) => Math.cos((x * Math.PI) / 180),
  tan: (x: number) => Math.tan((x * Math.PI) / 180),
  asin: (x: number) => (Math.asin(x) * 180) / Math.PI,
  acos: (x: number) => (Math.acos(x) * 180) / Math.PI,
  atan: (x: number) => (Math.atan(x) * 180) / Math.PI,
};

const KEYPAD = [
  ["sin(", "cos(", "tan(", "sqrt(", "log10("],
  ["asin(", "acos(", "atan(", "log(", "^"],
  ["(", ")", "pi", "e", "!"],
  ["7", "8", "9", "/", "C"],
  ["4", "5", "6", "*", "DEL"],
  ["1", "2", "3", "-", "ANS"],
  ["0", ".", "%", "+", "="],
];

export function ScientificCalculator() {
  const [tab, setTab] = useState<CalcTab>("scientific");
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [angleMode, setAngleMode] = useState<AngleMode>("DEG");
  const [lastAns, setLastAns] = useState("0");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [derivExpr, setDerivExpr] = useState("x^3 + 2*x^2 - 5*x + 1");
  const [derivVar, setDerivVar] = useState("x");
  const [derivPoint, setDerivPoint] = useState("");
  const [derivResult, setDerivResult] = useState<string | null>(null);
  const [derivAtPoint, setDerivAtPoint] = useState<string | null>(null);
  const [derivError, setDerivError] = useState<string | null>(null);

  const [matrixSize, setMatrixSize] = useState<2 | 3>(2);
  const [matrix, setMatrix] = useState<string[][]>([
    ["2", "1", "0"],
    ["5", "3", "0"],
    ["0", "0", "1"],
  ]);
  const [matrixOutput, setMatrixOutput] = useState<string | null>(null);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  const evaluate = (input = expr) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    try {
      const normalized = trimmed.replaceAll("ANS", `(${lastAns})`);
      const evaluated =
        angleMode === "DEG"
          ? math.evaluate(normalized, DEG_SCOPE)
          : math.evaluate(normalized);
      const formatted = math.format(evaluated, { precision: 10 });
      setResult(formatted);
      setLastAns(formatted);
      setError(null);
      setHistory((prev) => [{ expr: trimmed, result: formatted }, ...prev].slice(0, 12));
    } catch {
      setError("Проверьте синтаксис выражения");
    }
  };

  const handleKey = (key: string) => {
    setError(null);
    if (key === "C") {
      setExpr("");
      setResult("0");
    } else if (key === "DEL") {
      setExpr((prev) => prev.slice(0, -1));
    } else if (key === "=") {
      evaluate();
    } else {
      setExpr((prev) => prev + key);
    }
  };

  const calculateDerivative = () => {
    try {
      const variable = derivVar.trim() || "x";
      const node = math.derivative(derivExpr.trim(), variable);
      setDerivResult(node.toString());
      setDerivError(null);
      if (derivPoint.trim() !== "" && Number.isFinite(Number(derivPoint))) {
        const atVal = node.evaluate({ [variable]: Number(derivPoint) });
        setDerivAtPoint(math.format(atVal, { precision: 10 }));
      } else {
        setDerivAtPoint(null);
      }
    } catch {
      setDerivError("Не удалось найти производную. Пример: sin(x) * x^2");
      setDerivResult(null);
      setDerivAtPoint(null);
    }
  };

  const formatMatrix = (m: number[][]) =>
    m.map((row) => `[ ${row.map((n) => math.format(n, { precision: 5 })).join("   ")} ]`).join("\n");

  const runMatrixOp = (op: "det" | "inv" | "transpose" | "trace") => {
    try {
      const m = Array.from({ length: matrixSize }, (_, r) =>
        Array.from({ length: matrixSize }, (__, c) => {
          const num = Number(matrix[r][c]);
          if (!Number.isFinite(num)) throw new Error();
          return num;
        }),
      );
      setMatrixError(null);
      if (op === "det") setMatrixOutput(`det(A) = ${math.format(math.det(m), { precision: 8 })}`);
      if (op === "trace") setMatrixOutput(`tr(A) = ${math.format(math.trace(m), { precision: 8 })}`);
      if (op === "transpose") setMatrixOutput(`Aᵀ:\n${formatMatrix(math.transpose(m) as number[][])}`);
      if (op === "inv") setMatrixOutput(`A⁻¹:\n${formatMatrix(math.inv(m) as number[][])}`);
    } catch {
      setMatrixError(op === "inv" ? "Обратной матрицы не существует (det = 0)" : "Проверьте числа в матрице");
      setMatrixOutput(null);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5 rounded-2xl border border-line bg-surface p-1">
          {(
            [
              ["scientific", "Инженерный"],
              ["derivative", "Производные"],
              ["matrix", "Матрицы"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "rounded-xl px-3 py-1.5 text-xs font-medium transition sm:text-sm",
                tab === id
                  ? "bg-accent text-on-accent shadow-[0_0_14px_var(--glow-soft)]"
                  : "text-muted hover:text-ink",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "scientific" && (
          <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs">
            {(["DEG", "RAD"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setAngleMode(mode)}
                className={[
                  "rounded-lg px-2.5 py-1 font-medium transition",
                  angleMode === mode ? "bg-accent text-on-accent" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "scientific" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_13rem]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-line bg-canvas/70 p-3.5">
              <input
                type="text"
                value={expr}
                onChange={(e) => {
                  setExpr(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && evaluate()}
                placeholder="sin(30) + sqrt(16) * 2^3"
                className="w-full bg-transparent text-right font-mono text-sm text-muted outline-none sm:text-base"
              />
              <div className="mt-2 truncate text-right font-mono text-2xl font-semibold text-ink sm:text-3xl">
                {error ? <span className="text-sm text-accent">{error}</span> : result}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {KEYPAD.flat().map((key) => {
                const isEqual = key === "=";
                const isAction = key === "C" || key === "DEL" || key === "ANS";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleKey(key)}
                    className={[
                      "flex h-11 items-center justify-center rounded-xl border text-xs font-medium transition sm:text-sm",
                      isEqual
                        ? "border-accent bg-accent text-on-accent shadow-[0_0_16px_var(--glow-soft)] hover:brightness-110"
                        : isAction
                          ? "border-line bg-surface text-accent hover:border-accent"
                          : "border-line bg-surface/60 text-ink hover:border-accent/60 hover:bg-surface",
                    ].join(" ")}
                  >
                    {key === "DEL" ? <Delete className="size-4" /> : key}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-line bg-surface/50 p-3">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                <History className="size-3.5 text-accent" />
                История
              </span>
              {history.length > 0 && (
                <button type="button" onClick={() => setHistory([])} className="text-xs text-muted hover:text-ink">
                  <RotateCcw className="size-3.5" />
                </button>
              )}
            </div>
            <div className="scroll-thin mt-2 max-h-64 space-y-2 overflow-y-auto">
              {history.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">Пока пусто</p>
              ) : (
                history.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setExpr(item.expr)}
                    className="w-full rounded-xl border border-line/60 bg-canvas/50 p-2 text-right transition hover:border-accent/60"
                  >
                    <div className="truncate font-mono text-xs text-muted">{item.expr}</div>
                    <div className="truncate font-mono text-sm font-semibold text-ink">= {item.result}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "derivative" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_5rem_7rem]">
            <label className="block">
              <span className="text-xs text-muted">Функция f(x)</span>
              <input
                type="text"
                value={derivExpr}
                onChange={(e) => setDerivExpr(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-canvas/70 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">Перем.</span>
              <input
                type="text"
                value={derivVar}
                onChange={(e) => setDerivVar(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-canvas/70 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-xs text-muted">В точке</span>
              <input
                type="text"
                value={derivPoint}
                onChange={(e) => setDerivPoint(e.target.value)}
                placeholder="напр. 2"
                className="mt-1 w-full rounded-xl border border-line bg-canvas/70 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={calculateDerivative}
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-on-accent shadow-[0_0_16px_var(--glow-soft)] hover:brightness-110"
          >
            Найти производную
          </button>
          {derivError && <p className="text-sm text-accent">{derivError}</p>}
          {derivResult && (
            <div className="space-y-2 rounded-2xl border border-line bg-surface p-4 font-mono">
              <div className="text-xs text-muted">f&apos;({derivVar || "x"}):</div>
              <div className="text-lg font-semibold text-ink">{derivResult}</div>
              {derivAtPoint !== null && (
                <div className="border-t border-line pt-2 text-sm text-accent">
                  f&apos;({derivPoint}) = {derivAtPoint}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "matrix" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Размерность:</span>
            {([2, 3] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setMatrixSize(size);
                  setMatrixOutput(null);
                  setMatrixError(null);
                }}
                className={[
                  "rounded-xl border px-3 py-1 text-xs font-medium",
                  matrixSize === size
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line bg-surface text-muted hover:text-ink",
                ].join(" ")}
              >
                {size} × {size}
              </button>
            ))}
          </div>

          <div
            className="grid max-w-xs gap-2"
            style={{ gridTemplateColumns: `repeat(${matrixSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: matrixSize }).map((_, r) =>
              Array.from({ length: matrixSize }).map((__, c) => (
                <input
                  key={`${r}-${c}`}
                  type="text"
                  value={matrix[r][c]}
                  onChange={(e) => {
                    const next = matrix.map((row) => [...row]);
                    next[r][c] = e.target.value;
                    setMatrix(next);
                  }}
                  className="rounded-xl border border-line bg-canvas/70 py-2 text-center font-mono text-sm text-ink outline-none focus:border-accent"
                />
              )),
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["det", "Определитель det(A)"],
                ["inv", "Обратная A⁻¹"],
                ["transpose", "Транспонировать Aᵀ"],
                ["trace", "След tr(A)"],
              ] as const
            ).map(([op, label]) => (
              <button
                key={op}
                type="button"
                onClick={() => runMatrixOp(op)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs font-medium text-ink transition hover:border-accent"
              >
                {label}
              </button>
            ))}
          </div>

          {matrixError && <p className="text-sm text-accent">{matrixError}</p>}
          {matrixOutput && (
            <pre className="overflow-x-auto rounded-2xl border border-line bg-surface p-4 font-mono text-sm text-ink">
              {matrixOutput}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}