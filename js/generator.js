// js/generator.js
// プリント全体を生成する司令塔。retry / 重複排除 / バリデーション込み。

import "./bootstrap.js";
import { generate, has } from "./registry.js";
import { SeedRandom } from "./core/SeedRandom.js";

const MAX_RETRY = 200;

function isValid(problem) {
  if (!problem || !problem.answer) return false;
  const d = problem.answer.display;
  if (typeof d !== "string") return false;
  return d !== "NaN" && d !== "Infinity" && d !== "-Infinity" && !d.includes("NaN");
}

function keyOf(problem) {
  return `${problem.type}:${problem.question}`;
}

/**
 * @param {object} config
 *   必須：
 *     count: 生成問題数
 *   任意（共通）：
 *     types:           使う問題タイプid配列 (default: 四則演算4種)
 *     seed:            乱数シード (default: 1)
 *     allowDuplicates: 重複許可 (default: false)
 *   任意（プラグインに渡される設定）：
 *     digits, terms, ops, numberTypes, answerMode, allowParens,
 *     divisorMax, quotientMax, notation, decimalIntMax, fractionDenMax ...
 *     （どれを使うかはプラグイン依存）
 */
export function generateSheet(config) {
  const {
    count = 10,
    types = ["addition", "subtraction", "multiplication", "division"],
    seed = 1,
    allowDuplicates = false,
    ...pluginConfig
  } = config;

  if (!Array.isArray(types) || types.length === 0) {
    throw new Error("types must be a non-empty array");
  }
  for (const t of types) {
    if (!has(t)) throw new Error(`Unknown problem type: ${t}`);
  }

  const rng = new SeedRandom(seed);
  const problems = [];
  const seen = new Set();
  let totalRetries = 0;

  while (problems.length < count) {
    let p = null;
    let attempts = 0;
    while (attempts < MAX_RETRY) {
      const type = types[rng.int(0, types.length - 1)];
      let candidate;
      try {
        candidate = generate(type, pluginConfig, rng);
      } catch (e) {
        if (e && e.fatal) throw e;   // L-024: 設定エラーは握り潰さず即時失敗
        attempts++; continue;
      }
      if (!isValid(candidate)) { attempts++; continue; }
      if (!allowDuplicates && seen.has(keyOf(candidate))) { attempts++; continue; }
      p = candidate;
      break;
    }
    totalRetries += attempts;
    if (!p) {
      throw new Error(
        `生成失敗: ${MAX_RETRY}回試行しても条件を満たす問題を作れませんでした ` +
        `(count=${count}, types=${JSON.stringify(types)}, ` +
        `pluginConfig=${JSON.stringify(pluginConfig)})`
      );
    }
    seen.add(keyOf(p));
    problems.push(p);
  }

  return { problems, meta: { seed, totalRetries } };
}
