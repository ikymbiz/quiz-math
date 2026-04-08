// js/problems/_helpers.js
import { evalNode, render } from "../core/Evaluator.js";
import { Frac } from "../core/Frac.js";

/** 桁数 → [min, max] の整数範囲 */
export function rangeForDigits(digits) {
  const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return [min, max];
}

/**
 * Frac を小数文字列に変換できるならする (最大 maxPlaces 桁)。
 * 変換できない場合は null を返す。
 */
export function fracToDecimalString(frac, maxPlaces = 2) {
  if (frac.isInt()) return String(frac.n);
  for (let p = 1; p <= maxPlaces; p++) {
    const scale = Math.pow(10, p);
    if (scale % frac.d === 0) {
      const mul   = scale / frac.d;
      const whole = frac.n * mul;
      const sign  = whole < 0 ? "-" : "";
      const abs   = Math.abs(whole);
      const intPart  = Math.floor(abs / scale);
      let fracPart   = String(abs % scale).padStart(p, "0");
      // 末尾の0は削る ("0.30" -> "0.3") が、全て0ならintとして返す
      fracPart = fracPart.replace(/0+$/, "");
      if (fracPart === "") return `${sign}${intPart}`;
      return `${sign}${intPart}.${fracPart}`;
    }
  }
  return null;
}

/**
 * Frac を構造化 answer に変換する。
 * mode:
 *   "int"      → 整数必須。非整数なら null を返す（呼び出し側でrejectして再生成）
 *   "decimal"  → 小数で表せるなら decimal、ダメなら null
 *   "fraction" → 常に分数表記 (改良前と同じ。仮分数のまま)
 *   "mixed"    → 帯分数表記 (整数→int / 真分数→frac / 仮分数→mixed)
 *   "auto"     → 整数→int、小数化できる→decimal、さもなくば fraction
 */
export function formatAnswer(frac, mode = "auto") {
  if (mode === "int") {
    if (!frac.isInt()) return null;
    return { type: "int", value: frac.n, display: String(frac.n) };
  }
  if (mode === "decimal") {
    const s = fracToDecimalString(frac, 2);
    if (s === null) return null;
    if (frac.isInt()) return { type: "int", value: frac.n, display: s };
    return { type: "decimal", num: frac.n, den: frac.d, display: s };
  }
  if (mode === "fraction") {
    if (frac.isInt()) return { type: "int", value: frac.n, display: String(frac.n) };
    return { type: "frac", num: frac.n, den: frac.d, display: frac.toString() };
  }
  if (mode === "mixed") {
    // L-035: 帯分数表記
    //   整数 → int
    //   真分数 (|n|<d)            → frac (整数部 0 なので帯分数にしない)
    //   仮分数 (|n|>=d, 非整数)  → mixed: "intPart n/d"
    if (frac.isInt()) {
      return { type: "int", value: frac.n, display: String(frac.n) };
    }
    if (Math.abs(frac.n) < frac.d) {
      return { type: "frac", num: frac.n, den: frac.d, display: frac.toString() };
    }
    const sign = frac.n < 0 ? -1 : 1;
    const absN = Math.abs(frac.n);
    const intPart = Math.floor(absN / frac.d);
    const remN = absN - intPart * frac.d;
    const signedInt = intPart * sign;
    return {
      type: "mixed",
      intPart: signedInt,
      num: remN,
      den: frac.d,
      display: `${signedInt} ${remN}/${frac.d}`,
    };
  }
  // auto
  if (frac.isInt()) return { type: "int", value: frac.n, display: String(frac.n) };
  const dec = fracToDecimalString(frac, 2);
  if (dec !== null) return { type: "decimal", num: frac.n, den: frac.d, display: dec };
  return { type: "frac", num: frac.n, den: frac.d, display: frac.toString() };
}

/**
 * AST から Problem を構築する。
 * 答えは evalNode(expr) を formatAnswer(mode) で整形。
 * answerMode が "int" で整数にならない等、整形できない場合は null を返す。
 */
export function buildProblem(type, expr, answerMode = "auto") {
  const answerFrac = evalNode(expr);
  const answer     = formatAnswer(answerFrac, answerMode);
  if (answer === null) return null;
  return {
    type,
    expr,
    question: `${render(expr)} =`,
    answer,
  };
}
