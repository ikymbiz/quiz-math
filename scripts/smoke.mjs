import { generateSheet } from "../js/generator.js";
import { evalNode } from "../js/core/Evaluator.js";
import { Frac } from "../js/core/Frac.js";

function dump(label, cfg) {
  console.log(`\n━━━ ${label} ━━━`);
  console.log(`config:`, JSON.stringify(cfg));
  try {
    const { problems, meta } = generateSheet(cfg);
    problems.forEach((p, i) => {
      // 人の目で見て変じゃないか確認しやすい形式
      console.log(`  ${String(i+1).padStart(2)}. ${p.question.padEnd(28)} → ${p.answer.display}`);
    });
    console.log(`  [meta] retries=${meta.totalRetries}`);
    return problems;
  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
    return null;
  }
}

// ══════════ 1. 基本: Phase 1 旧プラグイン ══════════
dump("Phase1 加算 1桁 seed=1", {
  count: 6, types: ["addition"], digits: 1, seed: 1, allowDuplicates: true
});

dump("Phase1 減算 2桁 seed=7", {
  count: 6, types: ["subtraction"], digits: 2, seed: 7, allowDuplicates: true
});

dump("Phase1 乗算 1桁 seed=3", {
  count: 6, types: ["multiplication"], digits: 1, seed: 3, allowDuplicates: true
});

dump("Phase1 除算 九九範囲 seed=5", {
  count: 6, types: ["division"], seed: 5, allowDuplicates: true
});

// ══════════ 2. Phase 2 arithmetic: 2項 ══════════
dump("2項 整数 四則混合 2桁", {
  count: 8, types: ["arithmetic"], terms: 2, digits: 2,
  ops: ["+","-","*","/"], numberTypes: ["integer"], seed: 42, allowDuplicates: true
});

dump("2項 小数 +−のみ", {
  count: 8, types: ["arithmetic"], terms: 2,
  ops: ["+","-"], numberTypes: ["decimal1"], seed: 100, allowDuplicates: true
});

dump("2項 真分数 +−", {
  count: 8, types: ["arithmetic"], terms: 2,
  ops: ["+","-"], numberTypes: ["proper_fraction"], seed: 200, allowDuplicates: true
});

// ══════════ 3. Phase 2 arithmetic: 3項 ══════════
dump("3項 整数 四則混合 1桁", {
  count: 10, types: ["arithmetic"], terms: 3, digits: 1,
  ops: ["+","-","*","/"], numberTypes: ["integer"], seed: 7, allowDuplicates: true
});

dump("3項 整数 +−×のみ 2桁", {
  count: 10, types: ["arithmetic"], terms: 3, digits: 2,
  ops: ["+","-","*"], numberTypes: ["integer"], seed: 8, allowDuplicates: true
});

// ══════════ 4. あまりあり除算 ══════════
dump("あまりあり (amari表記)", {
  count: 8, types: ["remainder_division"], seed: 11, allowDuplicates: true
});

dump("あまりあり (⋯表記, 除数2..5)", {
  count: 8, types: ["remainder_division"], notation: "dots",
  divisorMax: 5, seed: 12, allowDuplicates: true
});

// ══════════ 5. 混合 ══════════
dump("arithmetic + remainder 混合", {
  count: 10, types: ["arithmetic", "remainder_division"],
  terms: 2, digits: 1, seed: 99, allowDuplicates: true
});

// ══════════ 6. 決定性 ══════════
console.log("\n━━━ 決定性チェック ━━━");
const a = generateSheet({count:5, types:["arithmetic"], terms:3, seed:555, allowDuplicates:true});
const b = generateSheet({count:5, types:["arithmetic"], terms:3, seed:555, allowDuplicates:true});
const same = a.problems.every((p,i) => p.question === b.problems[i].question);
console.log(`  同seed→同列: ${same ? "OK" : "NG"}`);

