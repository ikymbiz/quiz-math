import { generateSheet } from "../js/generator.js";
import { evalNode } from "../js/core/Evaluator.js";

// ══ 疑問1: 2桁四則で÷が出ていない。÷のみ強制して動くか確認 ══
console.log("\n[1] 2桁÷のみ (÷が実際に動くか)");
try {
  const r = generateSheet({
    count: 6, types: ["arithmetic"], terms: 2, digits: 2,
    ops: ["/"], numberTypes: ["integer"], seed: 1, allowDuplicates: true,
  });
  r.problems.forEach(p => {
    const a = p.expr.left.value.n, b = p.expr.right.value.n;
    const ok = (a % b === 0) ? "✓" : "✗";
    console.log(`  ${p.question} → ${p.answer.display}  [${a}÷${b}, a%b=${a%b}] ${ok}`);
  });
} catch (e) { console.log("  ERROR:", e.message); }

// ══ 疑問2: 3項で÷が位置0以外に要求されたとき、ちゃんと null-retry するか ══
console.log("\n[2] 3項で÷だけ (位置0のみに制限されるため2項の÷になるかretry多発のはず)");
try {
  const r = generateSheet({
    count: 5, types: ["arithmetic"], terms: 3, digits: 1,
    ops: ["/"], numberTypes: ["integer"], seed: 1, allowDuplicates: true,
  });
  r.problems.forEach(p => console.log(`  ${p.question} → ${p.answer.display}`));
  console.log(`  retries=${r.meta.totalRetries}`);
} catch (e) { console.log("  ERROR (期待される):", e.message.slice(0,80)); }

// ══ 疑問3: 減算の途中負が本当に弾かれるか (3-3 + something構造を探す) ══
console.log("\n[3] 3項 +−のみ 1桁 500問: 途中・最終とも非負か？");
{
  const r = generateSheet({
    count: 500, types: ["arithmetic"], terms: 3, digits: 1,
    ops: ["+","-"], numberTypes: ["integer"], seed: 2, allowDuplicates: true,
  });
  let violations = 0;
  for (const p of r.problems) {
    // ASTを再帰的に評価して全部分>=0か
    function check(node) {
      if (node.type === "num") return node.value.sign() >= 0;
      if (!check(node.left) || !check(node.right)) return false;
      return evalNode(node).sign() >= 0;
    }
    if (!check(p.expr)) { violations++; console.log("  VIOL:", p.question); }
  }
  console.log(`  violations: ${violations}/500`);
}

// ══ 疑問4: 自明計算が本当に出ないか (×1, ×0, ÷1) ══
console.log("\n[4] 3項 ×÷のみ 1桁 500問: 自明計算ゼロか？");
{
  const r = generateSheet({
    count: 500, types: ["arithmetic"], terms: 3, digits: 1,
    ops: ["*","/"], numberTypes: ["integer"], seed: 3, allowDuplicates: true,
  });
  let trivial = 0;
  for (const p of r.problems) {
    if (/× 1\b|× 0\b|\b0 ×|\b1 ×|÷ 1\b/.test(p.question)) {
      trivial++;
      console.log("  TRIV:", p.question);
    }
  }
  console.log(`  trivial: ${trivial}/500`);
}

// ══ 疑問5: 分数で答えが整数になるケースを拾って表示確認 ══
console.log("\n[5] 分数で答えが整数になる場合の表示");
{
  const r = generateSheet({
    count: 200, types: ["arithmetic"], terms: 2,
    ops: ["+"], numberTypes: ["proper_fraction"], seed: 4, allowDuplicates: true,
  });
  const intAnswers = r.problems.filter(p => p.answer.type === "int");
  console.log(`  整数答え: ${intAnswers.length}/200 問`);
  intAnswers.slice(0,5).forEach(p => console.log(`  ${p.question} → ${p.answer.display} (type=${p.answer.type})`));
}

// ══ 疑問6: 小数で絶対にfloat誤差が出ないか ══
console.log("\n[6] 小数1000問: display が 1e-Nや e+ を含まない");
{
  const r = generateSheet({
    count: 1000, types: ["arithmetic"], terms: 2,
    ops: ["+","-"], numberTypes: ["decimal1"], seed: 5, allowDuplicates: true,
  });
  let bad = 0;
  for (const p of r.problems) {
    if (/e[+-]/i.test(p.answer.display) || p.answer.display.length > 10) {
      bad++; console.log("  BAD:", p.question, "→", p.answer.display);
    }
  }
  console.log(`  bad: ${bad}/1000`);
}

// ══ 疑問7: あまりあり 2000問 a = b*q+r 全例チェック ══
console.log("\n[7] あまりあり 2000問: 関係式成立");
{
  const r = generateSheet({
    count: 2000, types: ["remainder_division"], seed: 6, allowDuplicates: true,
  });
  let bad = 0;
  for (const p of r.problems) {
    const {dividend: a, divisor: b} = p.meta;
    const {quotient: q, remainder: rem} = p.answer;
    if (a !== b*q + rem || rem <= 0 || rem >= b) { bad++; console.log("  BAD:", p); }
  }
  console.log(`  bad: ${bad}/2000`);
}

// ══ 疑問8: 不可能構成でちゃんと例外が出るか ══
console.log("\n[8] 不可能dedup: 1桁加算を300問ユニーク (81通り上限)");
try {
  generateSheet({
    count: 300, types: ["arithmetic"], terms: 2,
    ops: ["+"], digits: 1, seed: 1, allowDuplicates: false,
  });
  console.log("  ✗ 例外が出なかった (期待: 例外)");
} catch (e) {
  console.log("  ✓ 例外OK:", e.message.split("(")[0].trim());
}

