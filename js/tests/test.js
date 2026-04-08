// js/tests/test.js
// 一気通貫テスト。Node.jsで `npm test` で実行。

import assert from "node:assert/strict";
import { Frac } from "../core/Frac.js";
import { SeedRandom } from "../core/SeedRandom.js";
import { num, op, evalNode, render, allNonNegative, hasTrivial } from "../core/Evaluator.js";
import { fracToDecimalString, formatAnswer } from "../problems/_helpers.js";
import { generateSheet } from "../generator.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

function section(title, body) {
  console.log(`\n[${title}]`);
  body();
}

// ─────────────────────────────────────────────────────────────
section("Frac", () => {
  test("1/2 + 1/3 = 5/6", () => {
    const r = new Frac(1, 2).add(new Frac(1, 3));
    assert.equal(r.n, 5); assert.equal(r.d, 6);
  });
  test("6/8 は構築時に 3/4 に約分される", () => {
    const r = new Frac(6, 8);
    assert.equal(r.n, 3); assert.equal(r.d, 4);
  });
  test("負の分母は符号を分子へ移す", () => {
    const r = new Frac(1, -2);
    assert.equal(r.n, -1); assert.equal(r.d, 2);
  });
  test("ゼロ除算でエラー", () => {
    assert.throws(() => new Frac(1, 0));
    assert.throws(() => new Frac(1).div(new Frac(0)));
  });
  test("整数判定", () => {
    assert.equal(new Frac(4, 2).isInt(), true);
    assert.equal(new Frac(1, 2).isInt(), false);
  });
  test("toString", () => {
    assert.equal(new Frac(3, 1).toString(), "3");
    assert.equal(new Frac(1, 2).toString(), "1/2");
  });
});

// ─────────────────────────────────────────────────────────────
section("SeedRandom", () => {
  test("同じseedで同じ列を生成する", () => {
    const a = new SeedRandom(42);
    const b = new SeedRandom(42);
    for (let i = 0; i < 100; i++) {
      assert.equal(a.next(), b.next());
    }
  });
  test("異なるseedで異なる列を生成する", () => {
    const a = new SeedRandom(1);
    const b = new SeedRandom(2);
    let same = 0;
    for (let i = 0; i < 10; i++) if (a.next() === b.next()) same++;
    assert.ok(same < 10);
  });
  test("int(1,9) は範囲内の整数", () => {
    const r = new SeedRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(1, 9);
      assert.ok(Number.isInteger(v));
      assert.ok(v >= 1 && v <= 9);
    }
  });
});

// ─────────────────────────────────────────────────────────────
section("Evaluator (AST)", () => {
  test("2 + 3 × 4 = 14 （優先順位）", () => {
    const e = op("+", num(2), op("*", num(3), num(4)));
    assert.ok(evalNode(e).eq(new Frac(14)));
  });
  test("(2 + 3) × 4 = 20 （括弧）", () => {
    const e = op("*", op("+", num(2), num(3)), num(4));
    assert.ok(evalNode(e).eq(new Frac(20)));
    // 括弧が自動で描画される
    assert.ok(render(e).includes("("));
  });
  test("10 − 3 − 2 = 5 （左結合）", () => {
    const e = op("-", op("-", num(10), num(3)), num(2));
    assert.ok(evalNode(e).eq(new Frac(5)));
  });
  test("単純な式は括弧なし", () => {
    const e = op("+", num(3), num(5));
    assert.equal(render(e), "3 + 5");
  });
});

// ─────────────────────────────────────────────────────────────
section("Problem plugins (smoke)", () => {
  test("addition: 形と答えの整合", () => {
    const { problems } = generateSheet({ count: 50, types: ["addition"], seed: 1, digits: 1 });
    for (const p of problems) {
      assert.equal(p.type, "addition");
      assert.equal(p.expr.op, "+");
      const expected = evalNode(p.expr);
      assert.equal(p.answer.value, expected.n);
      assert.equal(expected.d, 1);
    }
  });

  test("subtraction: 答えが必ず非負", () => {
    const { problems } = generateSheet({ count: 200, types: ["subtraction"], seed: 3, digits: 2 });
    for (const p of problems) {
      assert.ok(p.answer.value >= 0, `negative: ${p.question} -> ${p.answer.display}`);
    }
  });

  test("multiplication: 答えが a × b と一致", () => {
    const { problems } = generateSheet({ count: 100, types: ["multiplication"], seed: 5, digits: 1, allowDuplicates: true });
    for (const p of problems) {
      const a = p.expr.left.value.n;
      const b = p.expr.right.value.n;
      assert.equal(p.answer.value, a * b);
    }
  });

  test("division: 常に割り切れる (整数の答え)", () => {
    const { problems } = generateSheet({ count: 200, types: ["division"], seed: 7, allowDuplicates: true });
    for (const p of problems) {
      assert.equal(p.answer.type, "int");
      const a = p.expr.left.value.n;
      const b = p.expr.right.value.n;
      assert.notEqual(b, 0);
      assert.equal(a % b, 0, `not exact: ${p.question}`);
      assert.equal(p.answer.value, a / b);
    }
  });
});

// ─────────────────────────────────────────────────────────────
section("Property: 1000問生成", () => {
  test("エラーなく1000問生成できる（2桁、重複許可）", () => {
    const { problems } = generateSheet({
      count: 1000, digits: 2, seed: 123, allowDuplicates: true,
    });
    assert.equal(problems.length, 1000);
  });

  test("全1000問: NaN/Infinityなし、かつ 再評価と答えが一致 (逆方向テスト)", () => {
    const { problems } = generateSheet({
      count: 1000, digits: 2, seed: 456, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(!Number.isNaN(Number(p.answer.value)));
      assert.notEqual(p.answer.display, "Infinity");
      const re = evalNode(p.expr);
      if (p.answer.type === "int") {
        assert.equal(re.n, p.answer.value);
        assert.equal(re.d, 1);
      } else {
        assert.equal(re.n, p.answer.num);
        assert.equal(re.d, p.answer.den);
      }
    }
  });

  test("重複排除: 300問で全問ユニーク", () => {
    const { problems } = generateSheet({
      count: 300, digits: 2, seed: 789, allowDuplicates: false,
    });
    const keys = new Set(problems.map(p => `${p.type}:${p.question}`));
    assert.equal(keys.size, 300);
  });
});

// ─────────────────────────────────────────────────────────────
section("Determinism", () => {
  test("同じseed → 同じ問題列", () => {
    const a = generateSheet({ count: 50, seed: 999, digits: 2, allowDuplicates: true });
    const b = generateSheet({ count: 50, seed: 999, digits: 2, allowDuplicates: true });
    for (let i = 0; i < 50; i++) {
      assert.equal(a.problems[i].question, b.problems[i].question);
      assert.equal(a.problems[i].answer.display, b.problems[i].answer.display);
    }
  });
  test("異なるseed → 異なる問題列", () => {
    const a = generateSheet({ count: 20, seed: 1, digits: 2, allowDuplicates: true });
    const b = generateSheet({ count: 20, seed: 2, digits: 2, allowDuplicates: true });
    const aq = a.problems.map(p => p.question).join("|");
    const bq = b.problems.map(p => p.question).join("|");
    assert.notEqual(aq, bq);
  });
});

// ─────────────────────────────────────────────────────────────
section("Failure / boundary", () => {
  test("未知の問題タイプでエラー", () => {
    assert.throws(() => generateSheet({ count: 1, types: ["unknown"] }));
  });

  test("不可能な重複排除要求は失敗する（無限ループしない）", () => {
    // 1桁加算は (1..9)^2 = 81通りが最大。1000問をユニーク要求 → 必ず失敗。
    assert.throws(() => generateSheet({
      count: 1000, types: ["addition"], digits: 1, seed: 1, allowDuplicates: false,
    }), /生成失敗/);
  });

  test("count=1 でも正常動作", () => {
    const { problems } = generateSheet({ count: 1, seed: 1, digits: 1 });
    assert.equal(problems.length, 1);
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 2: Frac↔Decimal", () => {
  test("fracToDecimalString: 基本変換", () => {
    assert.equal(fracToDecimalString(new Frac(1, 2)), "0.5");
    assert.equal(fracToDecimalString(new Frac(3, 10)), "0.3");
    assert.equal(fracToDecimalString(new Frac(21, 20)), "1.05");
    assert.equal(fracToDecimalString(new Frac(7)), "7");
  });
  test("fracToDecimalString: 2桁で表せない分数はnull", () => {
    assert.equal(fracToDecimalString(new Frac(1, 3)), null);
    assert.equal(fracToDecimalString(new Frac(1, 7)), null);
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 2: AST helpers", () => {
  test("allNonNegative: 全部正なら true", () => {
    const e = op("+", num(3), op("*", num(2), num(4)));
    assert.equal(allNonNegative(e), true);
  });
  test("allNonNegative: 途中で負になると false", () => {
    // (3 − 5) + 10 は途中で −2 になる
    const e = op("+", op("-", num(3), num(5)), num(10));
    assert.equal(allNonNegative(e), false);
  });
  test("hasTrivial: ×1 を検出", () => {
    assert.equal(hasTrivial(op("*", num(5), num(1))), true);
    assert.equal(hasTrivial(op("*", num(5), num(3))), false);
  });
  test("hasTrivial: ×0 を検出", () => {
    assert.equal(hasTrivial(op("*", num(0), num(7))), true);
  });
  test("hasTrivial: ÷1 を検出", () => {
    assert.equal(hasTrivial(op("/", num(12), num(1))), true);
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 2: Arithmetic plugin (3-term integer)", () => {
  test("3項整数: 500問エラーなし、answerは整数", () => {
    const { problems } = generateSheet({
      count: 500, types: ["arithmetic"], terms: 3, digits: 1, seed: 11,
      allowDuplicates: true,
    });
    for (const p of problems) {
      assert.equal(p.answer.type, "int");
      assert.ok(Number.isInteger(p.answer.value));
    }
  });
  test("3項整数: 非負保証（最終も途中も）", () => {
    const { problems } = generateSheet({
      count: 500, types: ["arithmetic"], terms: 3, digits: 2, seed: 12,
      allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(allNonNegative(p.expr), `non-neg violated: ${p.question}`);
      assert.ok(p.answer.value >= 0);
    }
  });
  test("3項整数: 自明計算なし (×0, ×1, ÷1 が含まれない)", () => {
    const { problems } = generateSheet({
      count: 500, types: ["arithmetic"], terms: 3, digits: 1, seed: 13,
      allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(!hasTrivial(p.expr), `trivial found: ${p.question}`);
    }
  });
  test("3項整数: 逆方向検証 (eval一致)", () => {
    const { problems } = generateSheet({
      count: 500, types: ["arithmetic"], terms: 3, digits: 1, seed: 14,
      allowDuplicates: true,
    });
    for (const p of problems) {
      const re = evalNode(p.expr);
      assert.equal(re.n, p.answer.value);
      assert.equal(re.d, 1);
    }
  });
  test("括弧は結果が変わるときしか生成されない (構造から逆算検証)", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 3, digits: 1, seed: 15,
      allowDuplicates: true, ops: ["+", "-", "*"],
    });
    let withParens = 0;
    for (const p of problems) {
      // 括弧付き = 右結合形 op(o0, n0, op(o1, n1, n2)) のはず
      const top = p.expr;
      if (top.type !== "op" || top.right.type !== "op") continue;
      withParens++;
      const o0 = top.op, o1 = top.right.op;
      const n0 = top.left, n1 = top.right.left, n2 = top.right.right;
      // 等価な左結合 op(o1, op(o0, n0, n1), n2) を組んで eval が異なることを確認
      const leftAssoc = op(o1, op(o0, n0, n1), n2);
      const rv = evalNode(top);
      const lv = evalNode(leftAssoc);
      assert.ok(!rv.eq(lv),
        `parens used but result unchanged: ${p.question} (L=${lv.toString()}, R=${rv.toString()})`);
    }
    assert.ok(withParens > 0, "no parenthesized problems generated");
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 2: Arithmetic plugin (decimal)", () => {
  test("小数加減算: answerは小数表記", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["decimal1"],
      seed: 21, allowDuplicates: true,
    });
    for (const p of problems) {
      // display に小数点 or 整数 (繰り上がり/下がりで整数化もあり得る)
      assert.ok(
        /^\d+(\.\d+)?$/.test(p.answer.display),
        `unexpected answer format: ${p.answer.display}`
      );
      // 分数として表れないこと
      assert.notEqual(p.answer.type, "frac");
    }
  });
  test("小数加減算: 逆方向検証", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["decimal1"],
      seed: 22, allowDuplicates: true,
    });
    for (const p of problems) {
      const re = evalNode(p.expr);
      // 答えFracと再evalが一致
      if (p.answer.type === "decimal") {
        assert.equal(re.n, p.answer.num);
        assert.equal(re.d, p.answer.den);
      } else if (p.answer.type === "int") {
        assert.equal(re.n, p.answer.value);
      }
    }
  });
  test("小数加減算: 答えが非負", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 2,
      ops: ["-"], numberTypes: ["decimal1"],
      seed: 23, allowDuplicates: true,
    });
    for (const p of problems) {
      const re = evalNode(p.expr);
      assert.ok(re.sign() >= 0, `negative: ${p.question}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 2: Arithmetic plugin (fraction)", () => {
  test("真分数加減算: answerは fraction か int", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["proper_fraction"],
      seed: 31, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(["frac", "int"].includes(p.answer.type),
        `unexpected type: ${p.answer.type} for ${p.question}`);
      // 「1.05」のような小数表記が混じらないこと
      assert.ok(!/\.\d/.test(p.answer.display),
        `decimal leaked into fraction answer: ${p.answer.display}`);
    }
  });
  test("真分数加減算: 既約かつ非負", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["proper_fraction"],
      seed: 32, allowDuplicates: true,
    });
    for (const p of problems) {
      const re = evalNode(p.expr);
      assert.ok(re.sign() >= 0, `negative: ${p.question}`);
      // 再構築で約分状態が維持されるか
      const reBuilt = new Frac(re.n, re.d);
      assert.equal(reBuilt.n, re.n);
      assert.equal(reBuilt.d, re.d);
    }
  });
  test("真分数の減算: 必ず大きい方 − 小さい方", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 2,
      ops: ["-"], numberTypes: ["proper_fraction"],
      seed: 33, allowDuplicates: true,
    });
    for (const p of problems) {
      const re = evalNode(p.expr);
      assert.ok(re.sign() >= 0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 2: Remainder division", () => {
  test("あまりあり: 500問エラーなし", () => {
    const { problems } = generateSheet({
      count: 500, types: ["remainder_division"],
      seed: 41, allowDuplicates: true,
    });
    assert.equal(problems.length, 500);
  });
  test("あまりあり: a = b × q + r が成立、かつ 0 < r < b", () => {
    const { problems } = generateSheet({
      count: 500, types: ["remainder_division"],
      seed: 42, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.meta.dividend;
      const b = p.meta.divisor;
      const q = p.answer.quotient;
      const r = p.answer.remainder;
      assert.equal(a, b * q + r, `mismatch: ${a} vs ${b}*${q}+${r}`);
      assert.ok(r > 0,  `r <= 0: ${p.question}`);
      assert.ok(r < b,  `r >= b: ${p.question}`);
      assert.ok(b >= 2, `divisor < 2: ${p.question}`);
    }
  });
  test("あまりあり: 表記切替 (dots) は答え側のみ", () => {
    const { problems } = generateSheet({
      count: 10, types: ["remainder_division"],
      notation: "dots", seed: 43, allowDuplicates: true,
    });
    for (const p of problems) {
      // 問題文には □ も "あまり" も "⋯" も入らない (手書き欄として空ける)
      assert.ok(!p.question.includes("□"),  `□ leaked: ${p.question}`);
      assert.ok(!p.question.includes("あまり"), `あまり leaked: ${p.question}`);
      assert.ok(!p.question.includes("⋯"), `⋯ leaked: ${p.question}`);
      assert.ok(p.question.endsWith("="), `should end with =: ${p.question}`);
      // 答え側にのみ表記が現れる
      assert.ok(p.answer.display.includes("⋯"));
    }
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 2: 統合（混合types）", () => {
  test("arithmetic + remainder 混合生成", () => {
    const { problems } = generateSheet({
      count: 200,
      types: ["arithmetic", "remainder_division"],
      terms: 2, digits: 1, seed: 51, allowDuplicates: true,
    });
    const typeCount = {};
    for (const p of problems) {
      typeCount[p.type] = (typeCount[p.type] || 0) + 1;
    }
    // 両タイプが最低1問は出ていること
    assert.ok(typeCount.arithmetic > 0);
    assert.ok(typeCount.remainder_division > 0);
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 3: 手書き紙テスト形式 (□禁止・解答非露出)", () => {
  test("arithmetic: 問題文に □ が含まれない", () => {
    const { problems } = generateSheet({
      count: 200, types: ["arithmetic"], terms: 3, digits: 2,
      ops: ["+","-","*"], seed: 1, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(!p.question.includes("□"), `□ leaked: ${p.question}`);
      assert.ok(p.question.endsWith("="), `should end with '=': ${p.question}`);
    }
  });

  test("remainder: 問題文に □ も 'あまり' も '⋯' も含まれない", () => {
    const { problems } = generateSheet({
      count: 200, types: ["remainder_division"], seed: 2, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(!p.question.includes("□"), `□ leaked: ${p.question}`);
      assert.ok(!p.question.includes("あまり"), `'あまり' leaked: ${p.question}`);
      assert.ok(!p.question.includes("⋯"), `⋯ leaked: ${p.question}`);
      assert.ok(p.question.endsWith("="), `should end with '=': ${p.question}`);
    }
  });

  test("Phase1 旧プラグインも □ なし", () => {
    const { problems } = generateSheet({
      count: 100, types: ["addition","subtraction","multiplication","division"],
      digits: 2, seed: 3, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(!p.question.includes("□"), `□ leaked: ${p.question}`);
      assert.ok(p.question.endsWith("="), `should end with '=': ${p.question}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 4: L-024〜L-026 を踏まえた追加テスト
// L1: 単体の抜け穴 / L3: 入出力整合 / 仕様契約
// ─────────────────────────────────────────────────────────────

section("Phase 4 / L1: hasTrivial 全分岐", () => {
  test("hasTrivial: 0+x / x+0", () => {
    assert.equal(hasTrivial(op("+", num(0), num(5))), true);
    assert.equal(hasTrivial(op("+", num(5), num(0))), true);
    assert.equal(hasTrivial(op("+", num(2), num(3))), false);
  });
  test("hasTrivial: x−0 / a−a", () => {
    assert.equal(hasTrivial(op("-", num(5), num(0))), true);
    assert.equal(hasTrivial(op("-", num(7), num(7))), true);
    assert.equal(hasTrivial(op("-", num(7), num(3))), false);
  });
  test("hasTrivial: a÷a / x÷0", () => {
    assert.equal(hasTrivial(op("/", num(6), num(6))), true);
    assert.equal(hasTrivial(op("/", num(6), num(0))), true);
  });
  test("hasTrivial: 入れ子の自明も検出", () => {
    // (5 × 1) + 3 → 内部に ×1 があるので true
    assert.equal(hasTrivial(op("+", op("*", num(5), num(1)), num(3))), true);
  });
});

section("Phase 4 / L1: fracToDecimalString 負数経路", () => {
  test("負の小数も正しく文字列化", () => {
    assert.equal(fracToDecimalString(new Frac(-1, 2)), "-0.5");
    assert.equal(fracToDecimalString(new Frac(-3, 10)), "-0.3");
    assert.equal(fracToDecimalString(new Frac(-21, 20)), "-1.05");
  });
  test("負の整数 Frac は素直に整数文字列", () => {
    assert.equal(fracToDecimalString(new Frac(-7)), "-7");
  });
});

section("Phase 4 / L3: arithmetic 仕様契約 (fatal config)", () => {
  test("L-024: 小数 + ×/÷ は即 throw（リトライで握り潰されない）", () => {
    assert.throws(
      () => generateSheet({
        count: 10, types: ["arithmetic"],
        numberTypes: ["decimal1"], ops: ["+", "*"],
        seed: 1, allowDuplicates: true,
      }),
      /未対応/
    );
  });
  test("L-024: 分数 + ×/÷ は即 throw", () => {
    assert.throws(
      () => generateSheet({
        count: 10, types: ["arithmetic"],
        numberTypes: ["proper_fraction"], ops: ["/"],
        seed: 1, allowDuplicates: true,
      }),
      /未対応/
    );
  });
  test("整数 + ×/÷ は今まで通り通る", () => {
    const { problems } = generateSheet({
      count: 20, types: ["arithmetic"],
      numberTypes: ["integer"], ops: ["+", "*"], terms: 2, digits: 1,
      seed: 1, allowDuplicates: true,
    });
    assert.equal(problems.length, 20);
  });
  test("小数 + (+,-) のみは通る", () => {
    const { problems } = generateSheet({
      count: 20, types: ["arithmetic"],
      numberTypes: ["decimal1"], ops: ["+", "-"], terms: 2,
      seed: 1, allowDuplicates: true,
    });
    assert.equal(problems.length, 20);
  });
  test("ops 空配列は即 throw", () => {
    assert.throws(
      () => generateSheet({
        count: 1, types: ["arithmetic"], ops: [], seed: 1,
      }),
      /ops is empty/
    );
  });
  test("terms 範囲外は即 throw", () => {
    assert.throws(
      () => generateSheet({
        count: 1, types: ["arithmetic"], terms: 4, seed: 1,
      }),
      /terms must be 2 or 3/
    );
  });
});

section("Phase 4 / L3: division は digits を尊重する (L-025)", () => {
  test("digits=2: 全問の被除数が [10..99]、除数が [2..9]", () => {
    const { problems } = generateSheet({
      count: 200, types: ["division"], digits: 2,
      seed: 101, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.expr.left.value.n;
      const b = p.expr.right.value.n;
      assert.ok(a >= 10 && a <= 99, `dividend out of 2-digit range: ${a}`);
      assert.ok(b >= 2 && b <= 9,   `divisor out of range: ${b}`);
      assert.equal(a % b, 0);
    }
  });
  test("digits=3: 全問の被除数が [100..999]", () => {
    const { problems } = generateSheet({
      count: 200, types: ["division"], digits: 3,
      seed: 102, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.expr.left.value.n;
      assert.ok(a >= 100 && a <= 999, `dividend out of 3-digit range: ${a}`);
    }
  });
  test("digits=1: 九九範囲 (除数 [2..9]・商 [2..9]・被除数 = b×q ≤ 81)", () => {
    const { problems } = generateSheet({
      count: 200, types: ["division"], digits: 1,
      seed: 103, allowDuplicates: true,
    });
    const dividends = new Set();
    for (const p of problems) {
      const a = p.expr.left.value.n;
      const b = p.expr.right.value.n;
      assert.ok(b >= 2 && b <= 9, `divisor out of [2..9]: ${b}`);
      const q = a / b;
      assert.ok(Number.isInteger(q), `not exact: ${a}/${b}`);
      assert.ok(q >= 2 && q <= 9, `quotient out of [2..9]: ${q}`);
      assert.ok(a <= 81, `dividend exceeds 81: ${a}`);
      dividends.add(a);
    }
    // 200問取れば九九空間を十分に踏むはず（最低でも10種類以上のdividend）
    assert.ok(dividends.size >= 10,
      `too few unique dividends in 200 problems: ${dividends.size}`);
  });
});

section("Phase 4 / L3: numberTypes が出力に反映される", () => {
  test("decimal1: 全オペランドが小数表記 (display に '.' を含む)", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["decimal1"],
      seed: 201, allowDuplicates: true,
    });
    for (const p of problems) {
      // expr の葉ノードを集めて全部 . を含むことを確認
      const leaves = [];
      const collect = (n) => {
        if (n.type === "num") leaves.push(n);
        else { collect(n.left); collect(n.right); }
      };
      collect(p.expr);
      for (const leaf of leaves) {
        assert.ok(leaf.display.includes("."),
          `non-decimal operand leaked: ${leaf.display} in ${p.question}`);
      }
    }
  });
  test("proper_fraction: 全オペランドが分数表記 (display に '/' を含む)", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["proper_fraction"],
      seed: 202, allowDuplicates: true,
    });
    for (const p of problems) {
      const leaves = [];
      const collect = (n) => {
        if (n.type === "num") leaves.push(n);
        else { collect(n.left); collect(n.right); }
      };
      collect(p.expr);
      for (const leaf of leaves) {
        assert.ok(leaf.display.includes("/"),
          `non-fraction operand leaked: ${leaf.display} in ${p.question}`);
      }
    }
  });
  test("integer + digits=2: 全オペランドが [10..99]", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["integer"], digits: 2,
      seed: 203, allowDuplicates: true,
    });
    for (const p of problems) {
      const leaves = [];
      const collect = (n) => {
        if (n.type === "num") leaves.push(n);
        else { collect(n.left); collect(n.right); }
      };
      collect(p.expr);
      for (const leaf of leaves) {
        const v = leaf.value.n;
        assert.ok(leaf.value.isInt(), `non-int operand: ${leaf.display}`);
        assert.ok(v >= 10 && v <= 99, `out of 2-digit range: ${v}`);
      }
    }
  });
});

section("Phase 4 / L3: ops 指定が反映される", () => {
  test("ops:['+'] 指定 → expr 内に + 以外の op が出ない", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 3,
      ops: ["+"], digits: 1,
      seed: 301, allowDuplicates: true,
    });
    for (const p of problems) {
      const walk = (n) => {
        if (n.type === "num") return;
        assert.equal(n.op, "+", `unexpected op ${n.op} in ${p.question}`);
        walk(n.left); walk(n.right);
      };
      walk(p.expr);
    }
  });
});

section("Phase 4 / L3: remainder デフォルト notation", () => {
  test("notation 未指定 → answer.display に 'あまり' を含む / question には漏れない", () => {
    const { problems } = generateSheet({
      count: 50, types: ["remainder_division"],
      seed: 401, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(p.answer.display.includes("あまり"),
        `default notation missing: ${p.answer.display}`);
      assert.ok(!p.question.includes("あまり"),
        `あまり leaked into question: ${p.question}`);
      assert.ok(!p.question.includes("⋯"),
        `⋯ leaked into question: ${p.question}`);
    }
  });
});

section("Phase 4 / L4: 混合 types の reverse-eval", () => {
  test("phase1 4種 + arithmetic (+,-) + remainder の混合 500問が整合", () => {
    const { problems } = generateSheet({
      count: 500,
      types: ["addition", "subtraction", "multiplication", "division",
              "arithmetic", "remainder_division"],
      terms: 2, digits: 1, ops: ["+", "-"],
      seed: 501, allowDuplicates: true,
    });
    assert.equal(problems.length, 500);
    let typeCounts = {};
    for (const p of problems) {
      typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
      // 共通契約: question は = で終わり、□/あまり/⋯ を含まない
      assert.ok(p.question.endsWith("="), `no =: ${p.question}`);
      assert.ok(!p.question.includes("□"));
      assert.ok(!p.question.includes("あまり"));
      assert.ok(!p.question.includes("⋯"));
      // reverse-eval: remainder 以外は expr の eval が answer に一致
      if (p.type === "remainder_division") {
        const a = p.meta.dividend, b = p.meta.divisor;
        assert.equal(a, b * p.answer.quotient + p.answer.remainder);
      } else {
        const re = evalNode(p.expr);
        if (p.answer.type === "int") {
          assert.equal(re.n, p.answer.value);
          assert.equal(re.d, 1);
        } else if (p.answer.type === "decimal" || p.answer.type === "frac") {
          assert.equal(re.n, p.answer.num);
          assert.equal(re.d, p.answer.den);
        }
      }
    }
    // 全タイプが少なくとも1問は出ていること
    for (const t of ["addition","subtraction","multiplication","division","arithmetic","remainder_division"]) {
      assert.ok((typeCounts[t] || 0) > 0, `type ${t} never generated`);
    }
  });
});

section("Phase 4 / L3: 真分数の分母指定が反映される (L-028)", () => {
  test("fractionDen=5: 全オペランドの分母が 5 に固定", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["proper_fraction"],
      fractionDen: 5,
      seed: 601, allowDuplicates: true,
    });
    for (const p of problems) {
      const leaves = [];
      const collect = (n) => {
        if (n.type === "num") leaves.push(n);
        else { collect(n.left); collect(n.right); }
      };
      collect(p.expr);
      for (const leaf of leaves) {
        assert.equal(leaf.value.d, 5,
          `denominator not 5: ${leaf.display} in ${p.question}`);
      }
    }
  });
  test("fractionDenMax=4: 全オペランドの分母が 2..4", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["proper_fraction"],
      fractionDenMax: 4,
      seed: 602, allowDuplicates: true,
    });
    for (const p of problems) {
      const leaves = [];
      const collect = (n) => {
        if (n.type === "num") leaves.push(n);
        else { collect(n.left); collect(n.right); }
      };
      collect(p.expr);
      for (const leaf of leaves) {
        assert.ok(leaf.value.d >= 2 && leaf.value.d <= 4,
          `denominator out of [2..4]: ${leaf.display}`);
      }
    }
  });
  test("fractionDen=3: 同分母なので答えも分母3 (または整数に約分)", () => {
    const { problems } = generateSheet({
      count: 50, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["proper_fraction"],
      fractionDen: 3,
      seed: 603, allowDuplicates: true,
    });
    for (const p of problems) {
      // 同分母 +/- なので、答えは d=3 か isInt
      if (p.answer.type === "frac") {
        assert.equal(p.answer.den, 3,
          `answer denominator not 3: ${p.answer.display}`);
      } else {
        assert.equal(p.answer.type, "int");
      }
    }
  });
  test("fractionDen < 2 は fatal throw", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2,
        ops: ["+"], numberTypes: ["proper_fraction"],
        fractionDen: 1, seed: 1, allowDuplicates: true,
      }),
      /den must be >= 2/
    );
  });
});

section("Phase 4 / L3: 仮分数 (improper_fraction) operand", () => {
  test("全オペランドが仮分数 (n>d) で既約", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["improper_fraction"],
      seed: 701, allowDuplicates: true,
    });
    for (const p of problems) {
      const leaves = [];
      const collect = (n) => {
        if (n.type === "num") leaves.push(n);
        else { collect(n.left); collect(n.right); }
      };
      collect(p.expr);
      for (const leaf of leaves) {
        assert.ok(leaf.value.n > leaf.value.d,
          `not improper: ${leaf.display}`);
        // 既約: Frac は構築時に約分するので再構築値が同じ
        const re = new Frac(leaf.value.n, leaf.value.d);
        assert.equal(re.n, leaf.value.n);
        assert.equal(re.d, leaf.value.d);
      }
    }
  });
  test("仮分数加減算: 答えは fraction か int", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["improper_fraction"],
      seed: 702, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(["frac", "int"].includes(p.answer.type),
        `unexpected: ${p.answer.type}`);
    }
  });
});

section("Phase 4 / L3: 帯分数 (mixed_number) operand", () => {
  test("全オペランドの display が 'N a/b' 形式 で a<b", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["mixed_number"],
      seed: 801, allowDuplicates: true,
    });
    for (const p of problems) {
      const leaves = [];
      const collect = (n) => {
        if (n.type === "num") leaves.push(n);
        else { collect(n.left); collect(n.right); }
      };
      collect(p.expr);
      for (const leaf of leaves) {
        const m = leaf.display.match(/^(\d+) (\d+)\/(\d+)$/);
        assert.ok(m, `not mixed format: ${leaf.display}`);
        const [, intPart, n, d] = m.map(Number);
        assert.ok(intPart >= 1, `intPart < 1: ${leaf.display}`);
        assert.ok(n >= 1 && n < d, `n out of [1..d-1]: ${leaf.display}`);
        // 既約: gcd(n,d)=1
        const reduced = new Frac(n, d);
        assert.equal(reduced.n, n);
        assert.equal(reduced.d, d);
        // 内部値の整合
        const expected = intPart * d + n;
        assert.equal(leaf.value.n, expected,
          `value mismatch: ${leaf.display} vs ${leaf.value.toString()}`);
        assert.equal(leaf.value.d, d);
      }
    }
  });
  test("帯分数加減算: 答えは mixed / frac / int (L-035)", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["mixed_number"],
      seed: 802, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(["mixed", "frac", "int"].includes(p.answer.type),
        `unexpected answer type: ${p.answer.type}`);
    }
  });
  test("帯分数 + ×/÷ は fatal throw (L-024)", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2,
        ops: ["+", "*"], numberTypes: ["mixed_number"],
        seed: 1, allowDuplicates: true,
      }),
      /未対応/
    );
  });
});

section("Phase 4 / L3: 小数×整数・分数×整数 (L-033)", () => {
  test("integer + decimal1 + ['*']: 全 × の左右に少なくとも 1 つは整数", () => {
    const { problems } = generateSheet({
      count: 200, types: ["arithmetic"], terms: 2,
      ops: ["*"], numberTypes: ["integer", "decimal1"],
      digits: 1, seed: 901, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.equal(p.expr.op, "*");
      const lIsInt = p.expr.left.value.isInt();
      const rIsInt = p.expr.right.value.isInt();
      assert.ok(lIsInt || rIsInt,
        `neither operand is integer: ${p.question}`);
    }
  });
  test("integer + proper_fraction + ['*']: 全 × の左右に少なくとも 1 つは整数", () => {
    const { problems } = generateSheet({
      count: 200, types: ["arithmetic"], terms: 2,
      ops: ["*"], numberTypes: ["integer", "proper_fraction"],
      digits: 1, seed: 902, allowDuplicates: true,
    });
    for (const p of problems) {
      const lIsInt = p.expr.left.value.isInt();
      const rIsInt = p.expr.right.value.isInt();
      assert.ok(lIsInt || rIsInt, `neither integer: ${p.question}`);
      // 答えが正しく計算されている
      const re = evalNode(p.expr);
      if (p.answer.type === "int") {
        assert.equal(re.n, p.answer.value);
        assert.equal(re.d, 1);
      } else if (p.answer.type === "frac") {
        assert.equal(re.n, p.answer.num);
        assert.equal(re.d, p.answer.den);
      }
    }
  });
  test("integer + mixed_number + ['*']: 全 × の左右に少なくとも 1 つは整数", () => {
    const { problems } = generateSheet({
      count: 200, types: ["arithmetic"], terms: 2,
      ops: ["*"], numberTypes: ["integer", "mixed_number"],
      seed: 903, allowDuplicates: true,
    });
    for (const p of problems) {
      const lIsInt = p.expr.left.value.isInt();
      const rIsInt = p.expr.right.value.isInt();
      assert.ok(lIsInt || rIsInt, `neither integer: ${p.question}`);
    }
  });
  test("整数 + 小数 + ['+','-','*'] 混合: × の制約 + 加減もOK + 全問 reverse-eval 一致", () => {
    const { problems } = generateSheet({
      count: 300, types: ["arithmetic"], terms: 2,
      ops: ["+","-","*"], numberTypes: ["integer", "decimal1"],
      digits: 1, seed: 904, allowDuplicates: true,
    });
    let mulCount = 0;
    for (const p of problems) {
      if (p.expr.op === "*") {
        mulCount++;
        const lIsInt = p.expr.left.value.isInt();
        const rIsInt = p.expr.right.value.isInt();
        assert.ok(lIsInt || rIsInt, `× without int: ${p.question}`);
      }
      // reverse-eval
      const re = evalNode(p.expr);
      if (p.answer.type === "int") {
        assert.equal(re.n, p.answer.value);
      } else if (p.answer.type === "decimal" || p.answer.type === "frac") {
        assert.equal(re.n, p.answer.num);
        assert.equal(re.d, p.answer.den);
      }
    }
    assert.ok(mulCount > 0, "no × problems generated");
  });
  test("小数のみ + ['*'] (integer 救済なし) → fatal throw", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2,
        ops: ["*"], numberTypes: ["decimal1"],
        seed: 1, allowDuplicates: true,
      }),
      /未対応/
    );
  });
  test("分数 + ÷ (整数があっても) は依然 fatal throw", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2,
        ops: ["/"], numberTypes: ["integer", "proper_fraction"],
        seed: 1, allowDuplicates: true,
      }),
      /未対応/
    );
  });
});

section("Phase 4 / L1: formatAnswer mode 'mixed' (L-035)", () => {
  test("5/3 → mixed '1 2/3'", () => {
    const r = formatAnswer(new Frac(5, 3), "mixed");
    assert.equal(r.type, "mixed");
    assert.equal(r.intPart, 1);
    assert.equal(r.num, 2);
    assert.equal(r.den, 3);
    assert.equal(r.display, "1 2/3");
  });
  test("7/2 → mixed '3 1/2'", () => {
    const r = formatAnswer(new Frac(7, 2), "mixed");
    assert.equal(r.type, "mixed");
    assert.equal(r.display, "3 1/2");
  });
  test("6/3 → int 2 (整数化)", () => {
    const r = formatAnswer(new Frac(6, 3), "mixed");
    assert.equal(r.type, "int");
    assert.equal(r.value, 2);
  });
  test("1/3 → frac '1/3' (真分数は帯分数化しない)", () => {
    const r = formatAnswer(new Frac(1, 3), "mixed");
    assert.equal(r.type, "frac");
    assert.equal(r.display, "1/3");
  });
  test("3/3 → int 1", () => {
    const r = formatAnswer(new Frac(3, 3), "mixed");
    assert.equal(r.type, "int");
    assert.equal(r.value, 1);
  });
});

section("Phase 4 / L3: 帯分数 operand → 答えも帯分数 (L-035)", () => {
  test("mixed_number 加減: 仮分数結果は帯分数表示", () => {
    const { problems } = generateSheet({
      count: 200, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["mixed_number"],
      seed: 1101, allowDuplicates: true,
    });
    let mixedCount = 0;
    for (const p of problems) {
      assert.ok(["mixed", "frac", "int"].includes(p.answer.type));
      if (p.answer.type === "mixed") {
        mixedCount++;
        // display は "N a/b" 形式
        assert.match(p.answer.display, /^\d+ \d+\/\d+$/);
        // 真分数部分: 0 < num < den
        assert.ok(p.answer.num > 0 && p.answer.num < p.answer.den);
        assert.ok(p.answer.intPart >= 1);
      }
    }
    // 200問中いくつかは帯分数答えが出るはず
    assert.ok(mixedCount > 0, "no mixed answers generated");
  });
  test("mixed_number + integer + × → 答えも mixed 形式", () => {
    const { problems } = generateSheet({
      count: 200, types: ["arithmetic"], terms: 2,
      ops: ["*"], numberTypes: ["integer", "mixed_number"],
      seed: 1102, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.ok(["mixed", "frac", "int"].includes(p.answer.type),
        `unexpected: ${p.answer.type}`);
    }
  });
  test("answerMode を 'fraction' で明示すると仮分数のまま (mode 上書き)", () => {
    const { problems } = generateSheet({
      count: 50, types: ["arithmetic"], terms: 2,
      ops: ["+", "-"], numberTypes: ["mixed_number"],
      answerMode: "fraction",
      seed: 1103, allowDuplicates: true,
    });
    for (const p of problems) {
      // mixed type は出ない (frac か int のみ)
      assert.ok(["frac", "int"].includes(p.answer.type),
        `mixed leaked despite fraction mode: ${p.answer.type}`);
    }
  });
});

section("Phase 4 / L3: 繰り上がり/繰り下がり制御 (L-036)", () => {
  // 1桁加算: a+b<10 (carry なし) / a+b>=10 (carry あり)
  test("digits=1 + carry='without': 全問 sum < 10", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+"], digits: 1, carry: "without",
      seed: 1201, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.expr.left.value.n, b = p.expr.right.value.n;
      assert.ok(a + b < 10, `unexpected carry: ${a}+${b}=${a+b}`);
    }
  });
  test("digits=1 + carry='with': 全問 sum >= 10", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+"], digits: 1, carry: "with",
      seed: 1202, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.expr.left.value.n, b = p.expr.right.value.n;
      assert.ok(a + b >= 10, `unexpected no-carry: ${a}+${b}=${a+b}`);
    }
  });
  // 2桁減算: 桁ごとに borrow 判定
  test("digits=2 − carry='without': 全問 borrow なし", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["-"], digits: 2, carry: "without",
      seed: 1203, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.expr.left.value.n, b = p.expr.right.value.n;
      assert.ok((a % 10) >= (b % 10), `unexpected borrow at units: ${a}-${b}`);
    }
  });
  test("digits=2 − carry='with': 全問 borrow あり", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["-"], digits: 2, carry: "with",
      seed: 1204, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.expr.left.value.n, b = p.expr.right.value.n;
      // 単位桁か十の位のどこかで a の桁 < b の桁
      let borrow = false;
      let aa = a, bb = b;
      while (bb > 0) {
        if ((aa % 10) < (bb % 10)) { borrow = true; break; }
        aa = Math.floor(aa/10); bb = Math.floor(bb/10);
      }
      assert.ok(borrow, `unexpected no borrow: ${a}-${b}`);
    }
  });
  // 2桁加算 (column-wise carry)
  test("digits=2 + carry='without': 単位桁の和 < 10", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2,
      ops: ["+"], digits: 2, carry: "without",
      seed: 1205, allowDuplicates: true,
    });
    for (const p of problems) {
      const a = p.expr.left.value.n, b = p.expr.right.value.n;
      let aa = a, bb = b;
      while (aa > 0 || bb > 0) {
        assert.ok((aa%10) + (bb%10) < 10, `column carry: ${a}+${b}`);
        aa = Math.floor(aa/10); bb = Math.floor(bb/10);
      }
    }
  });
  // 3項
  test("3項 +,- mix carry='without': 各 +/- ノードで carry/borrow なし", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 3,
      ops: ["+","-"], digits: 1, carry: "without",
      seed: 1206, allowDuplicates: true,
    });
    for (const p of problems) {
      // 木の各 +/- を検査
      const violations = [];
      function walk(n) {
        if (n.type !== "op") return;
        walk(n.left); walk(n.right);
        if (n.op !== "+" && n.op !== "-") return;
        const lv = evalNode(n.left).n, rv = evalNode(n.right).n;
        if (n.op === "+") {
          let aa=lv, bb=rv;
          while (aa>0||bb>0) { if (aa%10+bb%10>=10) violations.push("+"); aa=Math.floor(aa/10); bb=Math.floor(bb/10); }
        } else {
          let aa=lv, bb=rv;
          while (bb>0) { if (aa%10<bb%10) violations.push("-"); aa=Math.floor(aa/10); bb=Math.floor(bb/10); }
        }
      }
      walk(p.expr);
      assert.equal(violations.length, 0, `${p.question} violates without (${violations.join(",")})`);
    }
  });
  // fatal: carry + 非整数
  test("carry='with' + numberTypes に小数 → fatal throw", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2,
        ops: ["+"], numberTypes: ["integer", "decimal1"],
        carry: "with", seed: 1, allowDuplicates: true,
      }),
      /整数のみ/
    );
  });
  test("carry に未知の値 → fatal throw", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2,
        ops: ["+"], digits: 1, carry: "yes",
        seed: 1, allowDuplicates: true,
      }),
      /carry/
    );
  });
});

section("Phase 4 / L3: 穴埋め (□ プレースホルダ) L1 (L-038)", () => {
  test("placeholder='left' + 整数 加算: a+b=c → answer = c-b", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["+"],
      digits: 1, placeholder: "left",
      seed: 1301, allowDuplicates: true,
    });
    for (const p of problems) {
      const m = p.question.match(/^□ \+ (\d+) = (\d+)$/);
      assert.ok(m, `bad question format: ${p.question}`);
      const b = Number(m[1]), c = Number(m[2]);
      assert.equal(p.answer.value, c - b, `${p.question}: expected ${c-b}, got ${p.answer.value}`);
      assert.equal(p.placeholder.slot, "left");
    }
  });
  test("placeholder='right' + 整数 減算 (非対称): a-□=b → answer = a-b", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["-"],
      digits: 2, placeholder: "right",
      seed: 1302, allowDuplicates: true,
    });
    for (const p of problems) {
      const m = p.question.match(/^(\d+) − □ = (\d+)$/);
      assert.ok(m, `bad: ${p.question}`);
      const a = Number(m[1]), b = Number(m[2]);
      assert.equal(p.answer.value, a - b);
    }
  });
  test("placeholder='right' + 整数 除算 (非対称): a÷□=b → answer = a÷b", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["/"],
      digits: 1, placeholder: "right",
      seed: 1303, allowDuplicates: true,
    });
    for (const p of problems) {
      const m = p.question.match(/^(\d+) ÷ □ = (\d+)$/);
      assert.ok(m, `bad: ${p.question}`);
      const a = Number(m[1]), b = Number(m[2]);
      assert.equal(p.answer.value, a / b);
    }
  });
  test("placeholder='left' + 整数 乗算: □×b=c → answer = c÷b", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["*"],
      digits: 1, placeholder: "left",
      seed: 1304, allowDuplicates: true,
    });
    for (const p of problems) {
      const m = p.question.match(/^□ × (\d+) = (\d+)$/);
      assert.ok(m, `bad: ${p.question}`);
      const b = Number(m[1]), c = Number(m[2]);
      assert.equal(p.answer.value, c / b);
    }
  });
  test("placeholder='result': a op b = □ → answer = eval(expr)", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["+","-","*"],
      digits: 1, placeholder: "result",
      seed: 1305, allowDuplicates: true,
    });
    for (const p of problems) {
      assert.match(p.question, / = □$/);
      // 答えは元の式の評価値
      const re = evalNode(p.expr);
      assert.equal(p.answer.value, re.n);
      assert.equal(re.d, 1);
    }
  });
  test("placeholder='random': □ が必ず1個入る、答えは整数", () => {
    const { problems } = generateSheet({
      count: 200, types: ["arithmetic"], terms: 2, ops: ["+","-","*","/"],
      digits: 1, placeholder: "random",
      seed: 1306, allowDuplicates: true,
    });
    const slotCount = { left: 0, right: 0, result: 0 };
    for (const p of problems) {
      const cnt = (p.question.match(/□/g) || []).length;
      assert.equal(cnt, 1, `${p.question} has ${cnt} placeholders`);
      assert.equal(p.answer.type, "int");
      slotCount[p.placeholder.slot]++;
    }
    // ランダム選択なので3 slot 全てが出現する
    assert.ok(slotCount.left > 0);
    assert.ok(slotCount.right > 0);
    assert.ok(slotCount.result > 0);
  });
  test("placeholder + terms=3 → fatal", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 3, ops: ["+"],
        digits: 1, placeholder: "left",
        seed: 1, allowDuplicates: true,
      }),
      /placeholder/
    );
  });
  test("placeholder + 小数 → fatal", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2, ops: ["+"],
        numberTypes: ["decimal1"], placeholder: "left",
        seed: 1, allowDuplicates: true,
      }),
      /placeholder/
    );
  });
  test("placeholder に未知の値 → fatal", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2, ops: ["+"],
        digits: 1, placeholder: "wrong",
        seed: 1, allowDuplicates: true,
      }),
      /placeholder/
    );
  });
});

section("Phase 4 / L1: 小数第2位 decimal2 (L-039)", () => {
  test("genDecimal2: 値は分母100のFracで第2位は非ゼロ", () => {
    const rng = new SeedRandom(2001);
    const seen = new Set();
    for (let i = 0; i < 100; i++) {
      const r = rng.int(0, 9);
      const t = rng.int(0, 9);
      const h = rng.int(1, 9);
      const expected = r * 100 + t * 10 + h;
      const value = new Frac(expected, 100);
      // 第2位 (h) は 1..9 (非ゼロ)
      assert.ok(h >= 1 && h <= 9);
      // 末尾の数字 (h) が0でない → display文字列の最後が"0"でない
      const display = r + "." + t + h;
      assert.ok(!display.endsWith("0"), `trailing zero: ${display}`);
      seen.add(display);
    }
    assert.ok(seen.size > 30);
  });
  test("decimal2 加減: 全オペランドが分母100の倍数", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["+","-"],
      numberTypes: ["decimal2"], seed: 2002, allowDuplicates: true,
    });
    for (const p of problems) {
      const lv = p.expr.left.value, rv = p.expr.right.value;
      // どちらも分母100 (または100の約数だが0.01の桁を持つ場合は100)
      // 既約後は分母が 100 の約数 (1,2,4,5,10,20,25,50,100)
      assert.ok([1,2,4,5,10,20,25,50,100].includes(lv.d), `lv.d=${lv.d}`);
      assert.ok([1,2,4,5,10,20,25,50,100].includes(rv.d), `rv.d=${rv.d}`);
    }
  });
  test("decimal1 + decimal2 混合: 桁数不一致 (Ⅳ-2)", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["+","-"],
      numberTypes: ["decimal1","decimal2"], seed: 2003, allowDuplicates: true,
    });
    let mixCount = 0;
    for (const p of problems) {
      const ld = p.expr.left.display, rd = p.expr.right.display;
      // どちらも小数 (整数表記ではない)
      assert.match(ld, /^\d+\.\d+$/);
      assert.match(rd, /^\d+\.\d+$/);
      // 桁数を数える: ピリオド以降
      const lDecLen = ld.split(".")[1].length;
      const rDecLen = rd.split(".")[1].length;
      if (lDecLen !== rDecLen) mixCount++;
    }
    assert.ok(mixCount > 0, "no length-mismatch problems generated");
  });
  test("整数 + decimal2 (Ⅳ-3 5−1.25 系)", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["-"],
      numberTypes: ["integer","decimal2"], digits: 1,
      seed: 2004, allowDuplicates: true,
    });
    for (const p of problems) {
      // 答えが正しい
      const re = evalNode(p.expr);
      if (p.answer.type === "decimal" || p.answer.type === "frac") {
        assert.equal(re.n, p.answer.num);
        assert.equal(re.d, p.answer.den);
      } else if (p.answer.type === "int") {
        assert.equal(re.n, p.answer.value);
      }
    }
  });
  test("decimal2 のみ + × → fatal (L-024 維持)", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2, ops: ["*"],
        numberTypes: ["decimal2"], seed: 1, allowDuplicates: true,
      }),
      /未対応/
    );
  });
  test("decimal2 + 整数 + × 解禁 (L-033 と互換)", () => {
    const { problems } = generateSheet({
      count: 100, types: ["arithmetic"], terms: 2, ops: ["*"],
      numberTypes: ["integer","decimal2"], digits: 1,
      seed: 2005, allowDuplicates: true,
    });
    for (const p of problems) {
      // 各 × の左右どちらかは整数
      const lIsInt = p.expr.left.value.isInt();
      const rIsInt = p.expr.right.value.isInt();
      assert.ok(lIsInt || rIsInt, `neither int: ${p.question}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 4 / L-045: 補数フィルタ + 九九段別", () => {
  // 単一の + ノード (terms=2) なので tree 直下の left/right を見る
  function pairOf(p) {
    const lv = p.expr.left.value, rv = p.expr.right.value;
    return [lv.n, rv.n];
  }
  test("complement: le2 → max(a,b)∈{8,9} かつ a+b≥10", () => {
    const { problems } = generateSheet({
      count: 60, types: ["arithmetic"], terms: 2, ops: ["+"],
      numberTypes: ["integer"], digits: 1, complement: "le2",
      seed: 4501, allowDuplicates: true,
    });
    assert.ok(problems.length > 0, "no problems generated");
    for (const p of problems) {
      const [a, b] = pairOf(p);
      assert.ok(a + b >= 10, `no carry: ${p.question}`);
      const mx = Math.max(a, b);
      assert.ok(mx === 8 || mx === 9, `max not 8/9: ${p.question}`);
    }
  });
  test("complement: ge3 → max(a,b)≤7 かつ a+b≥10", () => {
    const { problems } = generateSheet({
      count: 60, types: ["arithmetic"], terms: 2, ops: ["+"],
      numberTypes: ["integer"], digits: 1, complement: "ge3",
      seed: 4502, allowDuplicates: true,
    });
    assert.ok(problems.length > 0, "no problems generated");
    for (const p of problems) {
      const [a, b] = pairOf(p);
      assert.ok(a + b >= 10, `no carry: ${p.question}`);
      assert.ok(Math.max(a, b) <= 7, `max > 7: ${p.question}`);
    }
  });
  test("complement + digits≠1 → fatal", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2, ops: ["+"],
        numberTypes: ["integer"], digits: 2, complement: "le2",
        seed: 1, allowDuplicates: true,
      }),
      /complement/
    );
  });
  test("complement + ops に + 以外 → fatal", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2, ops: ["+","-"],
        numberTypes: ["integer"], digits: 1, complement: "le2",
        seed: 1, allowDuplicates: true,
      }),
      /complement/
    );
  });
  test("multiplicandSet [2,3,5] → 全 × ノードで片方が set 内 (arithmetic)", () => {
    const { problems } = generateSheet({
      count: 60, types: ["arithmetic"], terms: 2, ops: ["*"],
      numberTypes: ["integer"], digits: 1, multiplicandSet: [2,3,5],
      seed: 4503, allowDuplicates: true,
    });
    assert.ok(problems.length > 0, "no problems generated");
    const set = new Set([2,3,5]);
    for (const p of problems) {
      const [a, b] = pairOf(p);
      assert.ok(set.has(a) || set.has(b), `neither in set: ${p.question}`);
    }
  });
  test("multiplicandSet [7,8,9] → 全 × ノードで片方が set 内 (multiplication legacy)", () => {
    const { problems } = generateSheet({
      count: 60, types: ["multiplication"], digits: 1,
      multiplicandSet: [7,8,9],
      seed: 4504, allowDuplicates: true,
    });
    assert.ok(problems.length > 0, "no problems generated");
    const set = new Set([7,8,9]);
    for (const p of problems) {
      const a = p.expr.left.value.n, b = p.expr.right.value.n;
      assert.ok(set.has(a) || set.has(b), `neither in set: ${p.question}`);
    }
  });
  test("multiplicandSet + digits≠1 → fatal", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2, ops: ["*"],
        numberTypes: ["integer"], digits: 2, multiplicandSet: [2,3,5],
        seed: 1, allowDuplicates: true,
      }),
      /multiplicandSet/
    );
  });
  test("multiplicandSet (空配列) → fatal", () => {
    assert.throws(
      () => generateSheet({
        count: 5, types: ["arithmetic"], terms: 2, ops: ["*"],
        numberTypes: ["integer"], digits: 1, multiplicandSet: [],
        seed: 1, allowDuplicates: true,
      }),
      /multiplicandSet/
    );
  });
});

// ─────────────────────────────────────────────────────────────
section("Phase 4 / L-046: filter 拡張 (carry-all / forceZeroDigit / factor10 / remainderClass)", () => {
  function pair(p) { return [p.expr.left.value.n, p.expr.right.value.n]; }
  test("carry='all' 2桁加算 → 下位2列で連続 carry (carry_in 込み)", () => {
    const { problems } = generateSheet({
      count: 60, types: ["arithmetic"], terms: 2, ops: ["+"],
      numberTypes: ["integer"], digits: 2, carry: "all",
      seed: 4601, allowDuplicates: true,
    });
    assert.ok(problems.length > 0);
    for (const p of problems) {
      const [a, b] = pair(p);
      assert.ok((a%10)+(b%10) >= 10, `ones no carry: ${p.question}`);
      // tens は carry_in=1 込みで >= 10 → digit-only では >= 9
      assert.ok((Math.floor(a/10)%10)+(Math.floor(b/10)%10) + 1 >= 10, `tens no carry: ${p.question}`);
    }
  });
  test("carry='all' 3桁減算 → 下位2列で連続 borrow (borrow_in 込み、2桁では数学的に不可能)", () => {
    const { problems } = generateSheet({
      count: 60, types: ["arithmetic"], terms: 2, ops: ["-"],
      numberTypes: ["integer"], digits: 3, carry: "all",
      seed: 4602, allowDuplicates: true,
    });
    assert.ok(problems.length > 0);
    for (const p of problems) {
      const [a, b] = pair(p);
      assert.ok((a%10) < (b%10), `ones no borrow: ${p.question}`);
      // tens は borrow_in=1 込みで da - 1 < db → da <= db
      assert.ok((Math.floor(a/10)%10) <= (Math.floor(b/10)%10), `tens no borrow: ${p.question}`);
    }
  });
  test("carry='all' + digits=1 → fatal", () => {
    assert.throws(() => generateSheet({
      count: 5, types: ["arithmetic"], terms: 2, ops: ["+"],
      numberTypes: ["integer"], digits: 1, carry: "all",
      seed: 1, allowDuplicates: true,
    }), /carry/);
  });
  test("forceZeroDigit → 少なくとも一つのオペランドに 0 桁", () => {
    const { problems } = generateSheet({
      count: 60, types: ["arithmetic"], terms: 2, ops: ["+","-"],
      numberTypes: ["integer"], digits: 3, forceZeroDigit: true,
      seed: 4603, allowDuplicates: true,
    });
    assert.ok(problems.length > 0);
    function hasZero(n) { let x = n; if (x < 10) return false; while (x>0) { if (x%10===0) return true; x = Math.floor(x/10); } return false; }
    for (const p of problems) {
      const [a, b] = pair(p);
      assert.ok(hasZero(a) || hasZero(b), `no zero digit: ${p.question}`);
    }
  });
  test("forceZeroDigit + digits=1 → fatal", () => {
    assert.throws(() => generateSheet({
      count: 5, types: ["arithmetic"], terms: 2, ops: ["+"],
      numberTypes: ["integer"], digits: 1, forceZeroDigit: true,
      seed: 1, allowDuplicates: true,
    }), /forceZeroDigit/);
  });
  test("factor10 (Ⅱ-6) → 全 × ノードで片方が 10 の倍数", () => {
    const { problems } = generateSheet({
      count: 60, types: ["arithmetic"], terms: 2, ops: ["*"],
      numberTypes: ["integer"], digits: 2, factor10: true,
      seed: 4604, allowDuplicates: true,
    });
    assert.ok(problems.length > 0);
    for (const p of problems) {
      const [a, b] = pair(p);
      const lz = a % 10 === 0 && a >= 10;
      const rz = b % 10 === 0 && b >= 10;
      assert.ok(lz || rz, `neither factor10: ${p.question}`);
    }
  });
  test("factor10 + digits=1 → fatal", () => {
    assert.throws(() => generateSheet({
      count: 5, types: ["arithmetic"], terms: 2, ops: ["*"],
      numberTypes: ["integer"], digits: 1, factor10: true,
      seed: 1, allowDuplicates: true,
    }), /factor10/);
  });
  test("remainderClass='large' (Ⅲ-3) → r ≥ ceil(b/2)", () => {
    const { problems } = generateSheet({
      count: 60, types: ["remainder_division"],
      divisorMax: 9, quotientMax: 9, remainderClass: "large",
      seed: 4605, allowDuplicates: true,
    });
    assert.ok(problems.length > 0);
    for (const p of problems) {
      const b = p.meta.divisor, r = p.answer.remainder;
      assert.ok(r >= Math.ceil(b/2), `r=${r} < ceil(b/2) for b=${b}`);
      assert.ok(r >= 1 && r < b, `r out of range`);
    }
  });
  test("remainderClass='max' (Ⅲ-4) → r = b-1", () => {
    const { problems } = generateSheet({
      count: 60, types: ["remainder_division"],
      divisorMax: 9, quotientMax: 9, remainderClass: "max",
      seed: 4606, allowDuplicates: true,
    });
    assert.ok(problems.length > 0);
    for (const p of problems) {
      const b = p.meta.divisor, r = p.answer.remainder;
      assert.equal(r, b - 1, `r=${r} != b-1 for b=${b}`);
    }
  });
  test("factor10 (Ⅲ-11) → 除数も被除数も 10 の倍数", () => {
    const { problems } = generateSheet({
      count: 60, types: ["remainder_division"],
      divisorMax: 9, quotientMax: 9, factor10: true,
      seed: 4607, allowDuplicates: true,
    });
    assert.ok(problems.length > 0);
    for (const p of problems) {
      const a = p.meta.dividend, b = p.meta.divisor, r = p.answer.remainder;
      assert.equal(a % 10, 0, `dividend not /10: ${a}`);
      assert.equal(b % 10, 0, `divisor not /10: ${b}`);
      assert.equal(r % 10, 0, `remainder not /10: ${r}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
