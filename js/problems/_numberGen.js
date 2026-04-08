// js/problems/_numberGen.js
// 数の種類ごとに乱数生成。全て Frac + 表示文字列 のペアで返す。
// 小学生向けの制約（正の数のみ・丁度な桁・既約分数）を満たす。

import { Frac } from "../core/Frac.js";

/**
 * 整数 (positive, given digits)
 * digits: 1 -> [1,9], 2 -> [10,99], 3 -> [100,999]
 */
export function genInteger(rng, digits = 1) {
  const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const n = rng.int(min, max);
  return { value: new Frac(n), display: String(n) };
}

/**
 * 小数第1位 (例: 0.3, 2.7, 5.0 は出さない)
 * 整数部: 0..intMax、小数部: 1..9
 * 表示は "X.Y"
 */
export function genDecimal1(rng, intMax = 9) {
  const iPart = rng.int(0, intMax);
  const fPart = rng.int(1, 9); // 0だと整数になってしまうので除外
  const raw   = iPart * 10 + fPart;        // 例: 2.7 -> 27
  return { value: new Frac(raw, 10), display: `${iPart}.${fPart}` };
}

/**
 * 小数第2位 (例: 1.25, 0.07, 3.14)
 * 整数部: 0..intMax、小数部: 第2位は必ず非ゼロ (1.20 を避けるため)
 * 内部値は分母 100 の Frac、表示は "X.YZ"
 */
export function genDecimal2(rng, intMax = 9) {
  const iPart    = rng.int(0, intMax);
  const tenths   = rng.int(0, 9);
  const hundreds = rng.int(1, 9);   // 末位を非ゼロにすることで decimal1 と被らない
  const fPart    = tenths * 10 + hundreds;
  const raw      = iPart * 100 + fPart;
  return { value: new Frac(raw, 100), display: `${iPart}.${tenths}${hundreds}` };
}

/**
 * 仮分数 (improper fraction): 分子 > 分母、既約。
 * options: { den, denMax }
 */
export function genImproperFraction(rng, options = {}) {
  if (typeof options === "number") options = { denMax: options };
  const fixedDen = options.den;
  const denMax   = options.denMax ?? 9;
  if (fixedDen != null && fixedDen < 2) {
    const e = new Error("genImproperFraction: den must be >= 2");
    e.fatal = true; throw e;
  }
  for (let i = 0; i < 50; i++) {
    const d = fixedDen != null ? fixedDen : rng.int(2, denMax);
    // 分子は d+1 〜 d*4 (整数部 1〜3 相当の仮分数) で既約
    const n = rng.int(d + 1, d * 4);
    const f = new Frac(n, d);
    if (f.n === n && f.d === d) {
      return { value: f, display: `${n}/${d}` };
    }
  }
  return { value: new Frac(3, 2), display: "3/2" };
}

/**
 * 帯分数 (mixed number): 整数 + 真分数。display は "N a/b"。
 * options: { den, denMax, intMax }
 */
export function genMixedNumber(rng, options = {}) {
  const fixedDen = options.den;
  const denMax   = options.denMax ?? 9;
  const intMax   = options.intMax  ?? 5;
  if (fixedDen != null && fixedDen < 2) {
    const e = new Error("genMixedNumber: den must be >= 2");
    e.fatal = true; throw e;
  }
  for (let i = 0; i < 50; i++) {
    const d = fixedDen != null ? fixedDen : rng.int(2, denMax);
    const n = rng.int(1, d - 1);
    // 真分数部分が既約か
    const fracPart = new Frac(n, d);
    if (fracPart.n !== n || fracPart.d !== d) continue;
    const intPart = rng.int(1, intMax);
    // 内部値は (intPart * d + n) / d  (帯分数 → 仮分数換算)
    const totalN = intPart * d + n;
    return {
      value:   new Frac(totalN, d),
      display: `${intPart} ${n}/${d}`,
    };
  }
  return { value: new Frac(3, 2), display: "1 1/2" };
}

/**
 * 真分数 (proper fraction): 分子 < 分母、かつ既約。
 * options:
 *   den    : 分母を固定する (省略時はランダム)
 *   denMax : 分母の最大値 (denMax が指定されていればその範囲、デフォルト 9)
 */
export function genProperFraction(rng, options = {}) {
  // 後方互換: 第2引数に number を渡された場合は denMax として扱う
  if (typeof options === "number") options = { denMax: options };
  const fixedDen = options.den;
  const denMax   = options.denMax ?? 9;

  if (fixedDen != null) {
    if (fixedDen < 2) {
      const e = new Error("genProperFraction: den must be >= 2");
      e.fatal = true; throw e;
    }
    // 固定分母: 分子は 1..den-1 から自由に取れば常に既約とは限らないが
    //   真分数の条件 (n<d) は満たす。既約でないものも許容する設計。
    //   (例: den=4 で n=2 → 1/2 に約分されてしまうのを避けたい場合は再試行)
    for (let i = 0; i < 50; i++) {
      const n = rng.int(1, fixedDen - 1);
      const f = new Frac(n, fixedDen);
      if (f.n === n && f.d === fixedDen) {
        return { value: f, display: `${n}/${fixedDen}` };
      }
    }
    // 既約でフィット不能 (例: den=2 → 1/2 のみ) は最後の値で返す
    return { value: new Frac(1, fixedDen), display: `1/${fixedDen}` };
  }

  // ランダム分母
  for (let i = 0; i < 50; i++) {
    const d = rng.int(2, denMax);
    const n = rng.int(1, d - 1);
    const f = new Frac(n, d);
    if (f.n === n && f.d === d) {
      return { value: f, display: `${n}/${d}` };
    }
  }
  return { value: new Frac(1, 2), display: "1/2" };
}

/**
 * 数の種類から1つ選んで生成する。
 * types: ["integer", "decimal1", "proper_fraction", "improper_fraction", "mixed_number"]
 * config: { digits, decimalIntMax, fractionDen, fractionDenMax, mixedIntMax }
 */
export function genNumber(rng, types, config = {}) {
  const type = types[rng.int(0, types.length - 1)];
  switch (type) {
    case "integer":
      return genInteger(rng, config.digits ?? 1);
    case "decimal1":
      return genDecimal1(rng, config.decimalIntMax ?? 9);
    case "decimal2":
      return genDecimal2(rng, config.decimalIntMax ?? 9);
    case "proper_fraction":
      return genProperFraction(rng, {
        den:    config.fractionDen,
        denMax: config.fractionDenMax ?? 9,
      });
    case "improper_fraction":
      return genImproperFraction(rng, {
        den:    config.fractionDen,
        denMax: config.fractionDenMax ?? 9,
      });
    case "mixed_number":
      return genMixedNumber(rng, {
        den:    config.fractionDen,
        denMax: config.fractionDenMax ?? 9,
        intMax: config.mixedIntMax ?? 5,
      });
    default:
      throw new Error("unknown number type: " + type);
  }
}
