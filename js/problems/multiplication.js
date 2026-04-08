// js/problems/multiplication.js
import { num, op, hasTrivial } from "../core/Evaluator.js";
import { rangeForDigits, buildProblem } from "./_helpers.js";

export const MultiplicationProblem = {
  id: "multiplication",
  generate(config, rng) {
    const [min, max] = rangeForDigits(config.digits ?? 1);
    // L-045: 九九段別 — multiplicandSet が指定されたら片方を set から選ぶ
    const set = config.multiplicandSet ?? null;
    if (set !== null) {
      if (!Array.isArray(set) || set.length === 0
          || !set.every(x => Number.isInteger(x) && x >= 1 && x <= 9)) {
        const e = new Error("MultiplicationProblem: multiplicandSet は 1〜9 の整数の非空配列");
        e.fatal = true; throw e;
      }
      if ((config.digits ?? 1) !== 1) {
        const e = new Error("MultiplicationProblem: multiplicandSet は digits=1 のみ対応");
        e.fatal = true; throw e;
      }
    }
    let a, b;
    if (set !== null) {
      // 片方は set、もう片方は [1..9] 全域。位置はランダム。
      const fromSet = set[rng.int(0, set.length - 1)];
      const free = rng.int(1, 9);
      if (rng.int(0, 1) === 0) { a = fromSet; b = free; }
      else                     { a = free;    b = fromSet; }
    } else {
      a = rng.int(min, max);
      b = rng.int(min, max);
    }
    const expr = op("*", num(a), num(b));
    if (hasTrivial(expr)) return null;
    return buildProblem("multiplication", expr);
  },
};
