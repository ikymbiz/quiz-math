// js/core/Evaluator.js
// 式はASTで持ち、評価はFrac、表示はrender。
// num ノードは display フィールドを持ち、小数・分数表記を保持できる。

import { Frac } from "./Frac.js";

// Node factories
export const num = (value, display) => {
  const v = Frac.from(value);
  return { type: "num", value: v, display: display ?? v.toString() };
};
export const op = (o, left, right) => ({ type: "op", op: o, left, right });

const PREC = { "+": 1, "-": 1, "*": 2, "/": 2 };
const SYM  = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export function evalNode(node) {
  if (node.type === "num") return node.value;
  const L = evalNode(node.left);
  const R = evalNode(node.right);
  switch (node.op) {
    case "+": return L.add(R);
    case "-": return L.sub(R);
    case "*": return L.mul(R);
    case "/": return L.div(R);
  }
  throw new Error("unknown op: " + node.op);
}

export function render(node, parentPrec = 0) {
  if (node.type === "num") return node.display;
  const p = PREC[node.op];
  const left  = render(node.left, p);
  const right = render(node.right, p + 1); // 右側は同precでも括弧
  const s = `${left} ${SYM[node.op]} ${right}`;
  return p < parentPrec ? `(${s})` : s;
}

/**
 * 式の全ての部分計算が非負か？
 * サブ木を先に評価し、全て非負 → 当該ノードも非負、を再帰的にチェック。
 */
export function allNonNegative(node) {
  if (node.type === "num") return node.value.sign() >= 0;
  if (!allNonNegative(node.left))  return false;
  if (!allNonNegative(node.right)) return false;
  return evalNode(node).sign() >= 0;
}

/**
 * 自明な演算を含むか？
 * - ×0, 0×, ×1, 1×  (零・恒等)
 * - ÷1             (恒等)
 * - ÷0             (未定義)
 * - +0, 0+         (零加算)
 * - −0             (零減算)
 * - a÷a (a≠0)      (常に1)
 * - a−a            (常に0)
 * 直下のnumオペランドのみチェック（生成直後の検証に十分）。
 */
export function hasTrivial(node) {
  if (node.type === "num") return false;
  if (hasTrivial(node.left) || hasTrivial(node.right)) return true;
  const one  = new Frac(1);
  const L = node.left, R = node.right;
  const Lnum = L.type === "num" ? L.value : null;
  const Rnum = R.type === "num" ? R.value : null;

  if (node.op === "*") {
    if (Lnum && (Lnum.isZero() || Lnum.eq(one))) return true;
    if (Rnum && (Rnum.isZero() || Rnum.eq(one))) return true;
  }
  if (node.op === "/") {
    if (Rnum && Rnum.eq(one))   return true;   // x÷1
    if (Rnum && Rnum.isZero())  return true;   // x÷0
    if (Lnum && Rnum && Lnum.eq(Rnum)) return true; // a÷a
  }
  if (node.op === "+") {
    if (Lnum && Lnum.isZero()) return true;    // 0+x
    if (Rnum && Rnum.isZero()) return true;    // x+0
  }
  if (node.op === "-") {
    if (Rnum && Rnum.isZero()) return true;    // x−0
    if (Lnum && Rnum && Lnum.eq(Rnum)) return true; // a−a
  }
  return false;
}
