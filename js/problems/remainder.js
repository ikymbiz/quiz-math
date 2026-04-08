// js/problems/remainder.js
// あまりあり除算。a ÷ b = q あまり r を逆算方式で構築し、必ず 0 < r < b を保証する。

import { num, op, evalNode } from "../core/Evaluator.js";

export const RemainderDivisionProblem = {
  id: "remainder_division",

  /**
   * config:
   *   divisorMax:     除数の最大値 (default 9, min 2)
   *   quotientMax:    商の最大値   (default 9)
   *   notation:       "amari" | "dots"   → "あまり" か "⋯" か (default "amari")
   *   remainderClass: "any" | "large" | "max"  L-046
   *                    large: r ≥ ceil(b/2) (Ⅲ-3 あまり大)
   *                    max:   r = b-1       (Ⅲ-4 あまり限界)
   *   factor10:       boolean  L-046
   *                    true → 除数も被除数も 10 の倍数 (Ⅲ-11 末尾ゼロ同士)
   *                    内部で b/q/r を生成後、それぞれ ×10 する
   */
  generate(config, rng) {
    const divisorMax  = Math.max(2, config.divisorMax  ?? 9);
    const quotientMax = Math.max(1, config.quotientMax ?? 9);
    const notation    = config.notation ?? "amari";
    const remainderClass = config.remainderClass ?? "any";
    const factor10    = !!config.factor10;

    const REM_CLASSES = ["any", "large", "max"];
    if (REM_CLASSES.indexOf(remainderClass) < 0) {
      const e = new Error(`RemainderDivisionProblem: remainderClass は ${JSON.stringify(REM_CLASSES)} のいずれか`);
      e.fatal = true; throw e;
    }
    if (remainderClass !== "any" && divisorMax < 3) {
      const e = new Error("RemainderDivisionProblem: remainderClass フィルタは divisorMax>=3 が必要");
      e.fatal = true; throw e;
    }

    const b = rng.int(2, divisorMax);           // 除数 ≥ 2 (÷1禁止)
    const q = rng.int(1, quotientMax);          // 商 ≥ 1
    let r;
    if (remainderClass === "max") {
      r = b - 1;
      if (r < 1) return null;
    } else if (remainderClass === "large") {
      // r ≥ ceil(b/2), かつ r ≤ b-1
      const rMin = Math.ceil(b / 2);
      if (rMin > b - 1) return null;
      r = rng.int(rMin, b - 1);
    } else {
      r = rng.int(1, b - 1);                     // 通常: 0 < r < b
    }
    const a = b * q + r;                         // 被除数

    // L-046: factor10 — 末尾ゼロ同士のあまり (Ⅲ-11)
    //   b/a/r をすべて ×10 して表示。商 q は不変 (a/b = (10a)/(10b) なので)。
    const bDisp = factor10 ? b * 10 : b;
    const aDisp = factor10 ? a * 10 : a;
    const rDisp = factor10 ? r * 10 : r;

    // expr は通常の割り算ASTとして持つが、evalNode(expr) と answer は一致しない。
    // （answer は商とあまりの構造化値）
    const expr = op("/", num(aDisp), num(bDisp));

    const sep = notation === "dots" ? "⋯" : "あまり";
    const display = `${q} ${sep} ${rDisp}`;

    return {
      type: "remainder_division",
      expr,
      question: `${aDisp} ÷ ${bDisp} =`,
      answer: {
        type: "remainder",
        quotient:  q,
        remainder: rDisp,
        display,
      },
      meta: { dividend: aDisp, divisor: bDisp },
    };
  },
};
