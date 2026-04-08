// js/problems/division.js
// 逆算方式：商と除数を先に決めて、被除数 = 商 × 除数。必ず割り切れる。

import { num, op, hasTrivial } from "../core/Evaluator.js";
import { buildProblem } from "./_helpers.js";

export const DivisionProblem = {
  id: "division",
  generate(config, rng) {
    // L-025/L-027: digits の意味を curriculum に合わせて二段構えにする
    //   digits=1 → 九九ベース (除数と商がともに [2..9]、被除数は ≤81)
    //   digits≥2 → 被除数が digits 桁、除数は 1桁 [2..9]
    const digits = config.digits ?? 1;
    const divisor = rng.int(2, 9);
    let quotient;
    if (digits === 1) {
      quotient = rng.int(2, 9);
    } else {
      const min = Math.pow(10, digits - 1);
      const max = Math.pow(10, digits) - 1;
      const qMin = Math.max(2, Math.ceil(min / divisor)); // q≥2 で a÷a 自明を回避
      const qMax = Math.floor(max / divisor);
      if (qMax < qMin) return null;  // この divisor では桁範囲に収まる商なし → リトライ
      quotient = rng.int(qMin, qMax);
    }
    const dividend = divisor * quotient;
    const expr = op("/", num(dividend), num(divisor));
    if (hasTrivial(expr)) return null;
    return buildProblem("division", expr);
  },
};
