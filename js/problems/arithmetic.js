// js/problems/arithmetic.js
// 汎用四則演算プラグイン。
// N項 (2〜3) × 任意の演算子組 × 任意の数の種類 × 任意の答え形式、に対応。
// 制約保証: 負数禁止 / 途中非負 / 自明計算抑制 / 割り切れ保証 / ゼロ除算禁止。

import { num, op, evalNode, allNonNegative, hasTrivial } from "../core/Evaluator.js";
import { genNumber } from "./_numberGen.js";
import { buildProblem, formatAnswer } from "./_helpers.js";

const ALL_OPS = ["+", "-", "*", "/"];
// L-038: 穴埋め用に表示シンボルが必要
const SYM_DISPLAY = { "+": "+", "-": "−", "*": "×", "/": "÷" };

// L-036: 繰り上がり / 繰り下がり判定 (column-wise、整数のみ)
function additionHasCarry(a, b) {
  while (a > 0 || b > 0) {
    if ((a % 10) + (b % 10) >= 10) return true;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return false;
}
function subtractionHasBorrow(a, b) {
  // a >= b 前提 (allNonNegative で保証)
  while (b > 0) {
    if ((a % 10) < (b % 10)) return true;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return false;
}
// L-046: 全桁 carry/borrow ヘルパー (Ⅰ-4 / Ⅰ-8)
//   「両桁 carry/borrow」= 下位 2 桁で連続して carry/borrow が発生
//   carry_in / borrow_in を考慮した正しい筆算判定
function additionAllColsCarry(a, b) {
  if (a < 10 || b < 10) return false;
  let carryIn = 0;
  let count = 0;
  for (let pos = 0; pos < 2; pos++) {
    const sum = (a % 10) + (b % 10) + carryIn;
    if (sum < 10) return false;
    count++;
    carryIn = 1;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return count >= 2;
}
function subtractionAllColsBorrow(a, b) {
  if (b < 10) return false;
  // 数学的に 2 桁同士では不成立 (digits>=3 が事実上の前提)
  let borrowIn = 0;
  let count = 0;
  let ai = a, bi = b;
  for (let pos = 0; pos < 2; pos++) {
    const da = ai % 10;
    const db = bi % 10;
    if (da - borrowIn >= db) return false;
    count++;
    borrowIn = 1;
    ai = Math.floor(ai / 10);
    bi = Math.floor(bi / 10);
  }
  return count >= 2;
}
// L-046: 整数に 0 桁が含まれるか (例: 30, 105, 207)
//   1 桁の数は対象外 (0 自体は使われないので必ず false 扱い)
function intHasZeroDigit(n) {
  if (n < 10) return false;
  while (n > 0) {
    if (n % 10 === 0) return true;
    n = Math.floor(n / 10);
  }
  return false;
}
// AST 全ノードを走査し、+ / - で carry/borrow が起きる箇所が「ある / ない」を判定
function computeCarryStatus(node) {
  let any = false;
  function walk(n) {
    if (n.type !== "op") return;
    walk(n.left); walk(n.right);
    if (n.op !== "+" && n.op !== "-") return;
    const lv = evalNode(n.left), rv = evalNode(n.right);
    if (!lv.isInt() || !rv.isInt()) return;
    const has = n.op === "+"
      ? additionHasCarry(lv.n, rv.n)
      : subtractionHasBorrow(lv.n, rv.n);
    if (has) any = true;
  }
  walk(node);
  return any;
}
// L-046: 全 +/- ノードで全桁 carry/borrow か
function computeAllColsCarryStatus(node) {
  let allOk = true;
  let count = 0;
  function walk(n) {
    if (n.type !== "op") return;
    walk(n.left); walk(n.right);
    if (n.op !== "+" && n.op !== "-") return;
    const lv = evalNode(n.left), rv = evalNode(n.right);
    if (!lv.isInt() || !rv.isInt()) { allOk = false; return; }
    count++;
    const ok = n.op === "+"
      ? additionAllColsCarry(lv.n, rv.n)
      : subtractionAllColsBorrow(lv.n, rv.n);
    if (!ok) allOk = false;
  }
  walk(node);
  return count > 0 && allOk;
}
// L-046: 整数リーフのうち少なくとも一つに 0 桁が含まれるか
function treeHasZeroDigitOperand(node) {
  let found = false;
  function walk(n) {
    if (found) return;
    if (n.type === "num") {
      if (n.value.isInt() && intHasZeroDigit(n.value.n)) found = true;
      return;
    }
    walk(n.left); walk(n.right);
  }
  walk(node);
  return found;
}
// L-046: 全 × ノードで「片方が 10 の倍数」を満たすか (Ⅱ-6 末尾ゼロの乗算)
function treeAllMulFactor10(node) {
  let ok = true;
  let mulCount = 0;
  function walk(n) {
    if (!ok || n.type !== "op") return;
    walk(n.left); walk(n.right);
    if (n.op !== "*") return;
    mulCount++;
    const lv = evalNode(n.left), rv = evalNode(n.right);
    if (!lv.isInt() || !rv.isInt()) { ok = false; return; }
    const lz = lv.n % 10 === 0 && lv.n >= 10;
    const rz = rv.n % 10 === 0 && rv.n >= 10;
    if (!(lz || rz)) ok = false;
  }
  walk(node);
  return mulCount > 0 && ok;
}

/**
 * 左結合フラット木を構築: ((n1 op1 n2) op2 n3) op3 n4 ...
 */
function buildLeftAssoc(nums, ops) {
  let tree = nums[0];
  for (let i = 0; i < ops.length; i++) {
    tree = op(ops[i], tree, nums[i + 1]);
  }
  return tree;
}

/**
 * 右結合木を構築: n1 op1 (n2 op2 (n3 op3 n4 ...))
 */
function buildRightAssoc(nums, ops) {
  let tree = nums[nums.length - 1];
  for (let i = ops.length - 1; i >= 0; i--) {
    tree = op(ops[i], nums[i], tree);
  }
  return tree;
}

/**
 * 除算の右オペランドがゼロか、ゼロ除算を含むか？
 * evalで落ちる前に弾く。
 */
function hasZeroDivision(node) {
  if (node.type === "num") return false;
  if (hasZeroDivision(node.left) || hasZeroDivision(node.right)) return true;
  if (node.op === "/") {
    try {
      const rv = evalNode(node.right);
      if (rv.isZero()) return true;
    } catch { return true; }
  }
  return false;
}

/**
 * 除算があるとき、被除数 = 除数 × 整数商 の形にするため、
 * 先頭オペランドを「後続の除算に合う値」に書き換える。
 * MVP方針: 除算が絡む場合は整数×整数に限定してしまう。
 * → ここでは divisionを含む場合は integer-only を強制する。
 */
function containsOp(ops, target) { return ops.indexOf(target) >= 0; }

export const ArithmeticProblem = {
  id: "arithmetic",

  /**
   * config:
   *   terms:       2 | 3  (項数、default 2)
   *   ops:         ["+","-","*","/"] から選ぶ (default 全部)
   *   numberTypes: ["integer","decimal1","proper_fraction"] (default ["integer"])
   *   digits:      整数の桁数 (default 1)
   *   answerMode:  "auto" | "int" | "decimal" | "fraction" (default "auto")
   *   allowParens: true で括弧形も生成候補 (default true)
   */
  generate(config, rng) {
    const terms        = config.terms ?? 2;
    const ops          = (config.ops ?? ALL_OPS).filter(o => ALL_OPS.includes(o));
    const numberTypes  = config.numberTypes ?? ["integer"];
    const digits       = config.digits ?? 1;
    const allowParens  = config.allowParens ?? true;

    // answerMode を明示指定がなければ numberTypes から推定する
    // 帯分数が含まれれば帯分数優先、他の分数 → fraction、小数 → decimal、それ以外 → integer
    const FRACTION_TYPES = ["proper_fraction", "improper_fraction", "mixed_number"];
    const answerMode = config.answerMode ?? (
      numberTypes.includes("mixed_number")              ? "mixed" :
      numberTypes.some(t => FRACTION_TYPES.includes(t)) ? "fraction" :
      (numberTypes.includes("decimal1") || numberTypes.includes("decimal2")) ? "decimal" :
                                                          "int"
    );

    if (ops.length === 0) {
      const e = new Error("ArithmeticProblem: ops is empty");
      e.fatal = true; throw e;
    }
    if (terms < 2 || terms > 3) {
      const e = new Error("ArithmeticProblem: terms must be 2 or 3");
      e.fatal = true; throw e;
    }
    // L-024 / L-033: 小数/分数 と ×/÷ の組み合わせ制限を整理
    //   (a) 小数/分数 + ÷         → 未対応 (fatal)
    //   (b) 小数/分数のみ + ×      → 整数の救済がないため未対応 (fatal)
    //   (c) 小数/分数 + 整数 + ×   → OK。各 × 位置で「左右の少なくとも一方が整数」を強制
    const isNonIntType = (t) => t !== "integer";
    const hasNonIntType = numberTypes.some(isNonIntType);
    const hasIntType    = numberTypes.includes("integer");
    const opsHaveDiv    = ops.includes("/");
    const opsHaveMul    = ops.includes("*");

    if (hasNonIntType && opsHaveDiv) {
      const e = new Error(
        "ArithmeticProblem: 小数/分数 と ÷ の組み合わせは未対応です " +
        `(numberTypes=${JSON.stringify(numberTypes)}, ops=${JSON.stringify(ops)})`
      );
      e.fatal = true; throw e;
    }
    if (hasNonIntType && opsHaveMul && !hasIntType) {
      const e = new Error(
        "ArithmeticProblem: 小数/分数のみで × を使うのは未対応です。integer も含めてください " +
        `(numberTypes=${JSON.stringify(numberTypes)}, ops=${JSON.stringify(ops)})`
      );
      e.fatal = true; throw e;
    }
    // L-036 / L-046: 繰り上がり/繰り下がり制御は整数のみで意味がある
    //   any | with | without | all (L-046: 全桁 carry/borrow 強制 = Ⅰ-4 / Ⅰ-8)
    const carry = config.carry ?? "any";
    const CARRY_MODES = ["any", "with", "without", "all"];
    if (!CARRY_MODES.includes(carry)) {
      const e = new Error(`ArithmeticProblem: carry は ${JSON.stringify(CARRY_MODES)} のいずれか (got ${JSON.stringify(carry)})`);
      e.fatal = true; throw e;
    }
    if (carry !== "any" && hasNonIntType) {
      const e = new Error(
        "ArithmeticProblem: 繰り上がり/繰り下がり制御 (carry) は整数のみで使えます " +
        `(numberTypes=${JSON.stringify(numberTypes)})`
      );
      e.fatal = true; throw e;
    }
    if (carry === "all" && digits < 2) {
      const e = new Error("ArithmeticProblem: carry='all' は digits>=2 のときのみ意味を持つ (Ⅰ-4 / Ⅰ-8)");
      e.fatal = true; throw e;
    }
    // L-046: forceZeroDigit (Ⅰ-9 空位を含む加減)
    const forceZeroDigit = !!config.forceZeroDigit;
    if (forceZeroDigit && hasNonIntType) {
      const e = new Error("ArithmeticProblem: forceZeroDigit は整数のみ対応");
      e.fatal = true; throw e;
    }
    if (forceZeroDigit && digits < 2) {
      const e = new Error("ArithmeticProblem: forceZeroDigit は digits>=2 のみ対応");
      e.fatal = true; throw e;
    }
    // L-046: factor10 (Ⅱ-6 末尾ゼロの乗算)
    const factor10 = !!config.factor10;
    if (factor10) {
      if (hasNonIntType) {
        const e = new Error("ArithmeticProblem: factor10 は整数のみ対応");
        e.fatal = true; throw e;
      }
      if (!ops.includes("*")) {
        const e = new Error("ArithmeticProblem: factor10 は ops に '*' を含む時のみ有効");
        e.fatal = true; throw e;
      }
      if (digits < 2) {
        const e = new Error("ArithmeticProblem: factor10 は digits>=2 のみ対応");
        e.fatal = true; throw e;
      }
    }
    // L-045: 補数フィルタ (Ⅰ-2 / Ⅰ-3)
    //   le2 = max(a,b) ∈ {8,9} かつ carry あり (補数 ≤ 2、最低負荷)
    //   ge3 = max(a,b) ≤ 7    かつ carry あり (補数 ≥ 3)
    //   1 桁 + 演算限定 (Ⅰ-2/Ⅰ-3 の仕様)
    const complement = config.complement ?? "any";
    const COMPLEMENT_MODES = ["any", "le2", "ge3"];
    if (!COMPLEMENT_MODES.includes(complement)) {
      const e = new Error(`ArithmeticProblem: complement は ${JSON.stringify(COMPLEMENT_MODES)} のいずれか (got ${JSON.stringify(complement)})`);
      e.fatal = true; throw e;
    }
    if (complement !== "any") {
      if (digits !== 1) {
        const e = new Error("ArithmeticProblem: complement フィルタは digits=1 のみ対応");
        e.fatal = true; throw e;
      }
      if (!ops.includes("+") || ops.some(o => o !== "+")) {
        const e = new Error("ArithmeticProblem: complement フィルタは ops=['+'] のみ対応");
        e.fatal = true; throw e;
      }
      if (hasNonIntType) {
        const e = new Error("ArithmeticProblem: complement フィルタは整数のみ対応");
        e.fatal = true; throw e;
      }
    }
    // L-045: 九九段別 (Ⅱ-1 / Ⅱ-2 / Ⅱ-3)
    //   multiplicandSet: [2,3,5] のように指定すると、× ノードの左右どちらかが
    //   必ずこの集合に含まれる。1 桁 × 限定。
    const multiplicandSet = config.multiplicandSet ?? null;
    if (multiplicandSet !== null) {
      if (!Array.isArray(multiplicandSet) || multiplicandSet.length === 0
          || !multiplicandSet.every(x => Number.isInteger(x) && x >= 1 && x <= 9)) {
        const e = new Error("ArithmeticProblem: multiplicandSet は 1〜9 の整数の非空配列");
        e.fatal = true; throw e;
      }
      if (!ops.includes("*")) {
        const e = new Error("ArithmeticProblem: multiplicandSet は ops に '*' を含む時のみ有効");
        e.fatal = true; throw e;
      }
      if (digits !== 1) {
        const e = new Error("ArithmeticProblem: multiplicandSet は digits=1 のみ対応 (九九)");
        e.fatal = true; throw e;
      }
    }
    // L-038: 穴埋め (□ プレースホルダ) — L1 (2項・整数のみ)
    const placeholder = config.placeholder ?? "none";
    const PLACEHOLDER_SLOTS = ["none", "left", "right", "result", "random"];
    if (!PLACEHOLDER_SLOTS.includes(placeholder)) {
      const e = new Error(
        `ArithmeticProblem: placeholder は ${JSON.stringify(PLACEHOLDER_SLOTS)} のいずれか (got ${JSON.stringify(placeholder)})`
      );
      e.fatal = true; throw e;
    }
    if (placeholder !== "none") {
      if (terms !== 2) {
        const e = new Error("ArithmeticProblem: placeholder は terms=2 のみ対応 (L1 スコープ)");
        e.fatal = true; throw e;
      }
      if (hasNonIntType) {
        const e = new Error("ArithmeticProblem: placeholder は整数のみ対応 (L1 スコープ)");
        e.fatal = true; throw e;
      }
    }

    // 演算子列を選ぶ
    const opSeq = [];
    for (let i = 0; i < terms - 1; i++) opSeq.push(ops[rng.int(0, ops.length - 1)]);

    // 除算が opSeq に含まれる時は (a) で既に fatal 済みのはずだが、念のため整数のみに退避
    const hasDivInSeq = opSeq.some(o => o === "/");
    const baseTypes = hasDivInSeq ? ["integer"] : numberTypes;

    // 各オペランド位置の型を選ぶ
    const opTypes = [];
    for (let i = 0; i < terms; i++) {
      opTypes.push(baseTypes[rng.int(0, baseTypes.length - 1)]);
    }
    // L-033: × 位置の制約 — 左右どちらかが必ず integer
    //   ペアの両方が非int になっていたら、ランダムにどちらかを integer に書き換える。
    //   3項以上で × が連続する場合、中央の項は両方の制約を一度に満たす。
    for (let i = 0; i < opSeq.length; i++) {
      if (opSeq[i] !== "*") continue;
      const li = i, ri = i + 1;
      if (isNonIntType(opTypes[li]) && isNonIntType(opTypes[ri])) {
        if (rng.int(0, 1) === 0) opTypes[li] = "integer";
        else                     opTypes[ri] = "integer";
      }
    }

    // 数を引く (L-028: numGenConfig を全て転送)
    const numGenConfig = {
      digits,
      decimalIntMax:  config.decimalIntMax,
      fractionDen:    config.fractionDen,
      fractionDenMax: config.fractionDenMax,
      mixedIntMax:    config.mixedIntMax,
    };
    const nums = [];
    for (let i = 0; i < terms; i++) {
      const n = genNumber(rng, [opTypes[i]], numGenConfig);
      nums.push(num(n.value, n.display));
    }

    // 除算がある場合: 被除数を「除数×商」に書き換えて割り切れを保証
    // - 除算は位置0に限定（L-013）
    // - 被除数が digits の範囲を超えないよう q を調整
    for (let i = 0; i < opSeq.length; i++) {
      if (opSeq[i] === "/") {
        if (i !== 0) return null; // 位置0以外は非対応
        const divisor = nums[i + 1].value;
        if (divisor.isZero()) return null;
        const d = divisor.n;
        // 被除数の範囲を digits に合わせる
        const max = Math.pow(10, digits) - 1;
        const min = digits === 1 ? 1 : Math.pow(10, digits - 1);
        const qMin = Math.max(2, Math.ceil(min / d)); // q=1 は a÷a になり hasTrivial で弾かれるので q≥2
        const qMax = Math.floor(max / d);
        if (qMax < qMin) return null; // 範囲内で成立する商がない
        const q = rng.int(qMin, qMax);
        const a = d * q;
        nums[0] = num(a, String(a));
      }
    }

    // 木を構築: 左結合 or 右結合 (allowParens時のみ右結合候補)
    let tree;
    if (terms === 2 || !allowParens) {
      tree = buildLeftAssoc(nums, opSeq);
    } else {
      // 右結合と左結合で計算結果が変わるなら50%で右結合、変わらないなら左結合
      const L = buildLeftAssoc(nums, opSeq);
      const R = buildRightAssoc(nums, opSeq);
      try {
        const lv = evalNode(L);
        const rv = evalNode(R);
        if (!lv.eq(rv) && rng.int(0, 1) === 0) {
          tree = R; // 括弧で意味が変わる形
        } else {
          tree = L;
        }
      } catch {
        tree = L;
      }
    }

    // 検証ゲート
    if (hasZeroDivision(tree)) return null;
    if (hasTrivial(tree))      return null;
    if (!allNonNegative(tree)) return null;

    // L-036 / L-046: carry/borrow フィルタ
    if (carry !== "any") {
      // 加減ノードが 1 つも無いと判定不能 → reject
      const hasAddSub = (function check(n) {
        if (n.type !== "op") return false;
        if (n.op === "+" || n.op === "-") return true;
        return check(n.left) || check(n.right);
      })(tree);
      if (!hasAddSub) return null;
      if (carry === "all") {
        if (!computeAllColsCarryStatus(tree)) return null;
      } else {
        const has = computeCarryStatus(tree);
        if (carry === "with"    && !has) return null;
        if (carry === "without" &&  has) return null;
      }
    }

    // L-046: forceZeroDigit (Ⅰ-9 空位を含む加減)
    if (forceZeroDigit && !treeHasZeroDigitOperand(tree)) return null;

    // L-046: factor10 (Ⅱ-6 末尾ゼロの乗算 — 全 × ノードで片方が 10 の倍数)
    if (factor10 && !treeAllMulFactor10(tree)) return null;

    // L-045: 補数フィルタ (1桁 + 限定なので tree は単一の + ノード)
    if (complement !== "any") {
      if (tree.type !== "op" || tree.op !== "+") return null;
      const lv = evalNode(tree.left), rv = evalNode(tree.right);
      if (!lv.isInt() || !rv.isInt()) return null;
      const a = lv.n, b = rv.n;
      if (a + b < 10) return null; // carry 必須
      const mx = Math.max(a, b);
      if (complement === "le2" && !(mx === 8 || mx === 9)) return null;
      if (complement === "ge3" && mx > 7) return null;
    }

    // L-045: 九九段別フィルタ — × ノードの左右いずれかが set に含まれること
    if (multiplicandSet !== null) {
      const setObj = new Set(multiplicandSet);
      let ok = true;
      (function walk(n) {
        if (!ok || n.type !== "op") return;
        walk(n.left); walk(n.right);
        if (n.op !== "*") return;
        const lv = evalNode(n.left), rv = evalNode(n.right);
        if (!lv.isInt() || !rv.isInt()) { ok = false; return; }
        if (!(setObj.has(lv.n) || setObj.has(rv.n))) ok = false;
      })(tree);
      if (!ok) return null;
    }

    const problem = buildProblem("arithmetic", tree, answerMode);
    if (problem === null) return null;

    // L-038: placeholder substitution (L1: 2項のみ)
    if (placeholder === "none") return problem;
    let slot = placeholder;
    if (placeholder === "random") {
      const slots = ["left", "right", "result"];
      slot = slots[rng.int(0, 2)];
    }
    const lDisp = tree.left.display;
    const rDisp = tree.right.display;
    const opSym = SYM_DISPLAY[tree.op];
    const resultFrac = evalNode(tree);
    const resultAns  = formatAnswer(resultFrac, answerMode);
    if (resultAns === null) return null;
    const resultDisp = resultAns.display;

    let invQuestion, invAnswer;
    if (slot === "left") {
      invQuestion = `□ ${opSym} ${rDisp} = ${resultDisp}`;
      invAnswer   = formatAnswer(tree.left.value, answerMode);
    } else if (slot === "right") {
      invQuestion = `${lDisp} ${opSym} □ = ${resultDisp}`;
      invAnswer   = formatAnswer(tree.right.value, answerMode);
    } else { // result
      invQuestion = `${lDisp} ${opSym} ${rDisp} = □`;
      invAnswer   = resultAns;
    }
    if (invAnswer === null) return null;
    return {
      type: "arithmetic",
      expr: tree,
      question: invQuestion,
      answer: invAnswer,
      placeholder: { slot },
    };
  },
};
