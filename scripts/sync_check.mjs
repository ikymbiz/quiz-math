#!/usr/bin/env node
// scripts/sync_check.mjs
// L-019 / L-024 / L-028 / L-033: モジュール版 (js/) と インライン版 (index.html) が
// 同じ config で同じ問題列を生成するかを自動検証する。
//
// 仕組み:
//  1. index.html から <script>...</script> ブロックを抜き出す
//  2. ロジック部分 (UI ロジック手前まで) を切り出して new Function で評価し、
//     インライン版の generateSheet を取得
//  3. モジュール版を import し、同じ config で両者を実行
//  4. seed が同じなら同じ列が出るはずなので、problem ごとに question / answer.display /
//     answer.type を比較し、最初の差分を報告
//
// 使い方: node scripts/sync_check.mjs
// 終了コード: 全シナリオ一致なら 0、差分があれば 1

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSheet as moduleGenerate } from "../js/generator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.resolve(__dirname, "..", "index.html");

// ─────────────────────────────────────────────────────────────
// インライン版の generateSheet を取り出す
// ─────────────────────────────────────────────────────────────
function loadInlineGenerate() {
  const html = fs.readFileSync(HTML_PATH, "utf8");
  const m = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!m) throw new Error("inline <script> not found in index.html");
  const fullScript = m[1];

  // インライン script は (function() { "use strict"; ...logic... ...UI logic... })();
  // でラップされている。logic だけを抜き出して、自前の関数で囲んで evaluate する。
  //
  // Step 1: ロジック開始位置 = "use strict"; の直後
  const useStrictIdx = fullScript.indexOf('"use strict";');
  if (useStrictIdx < 0) throw new Error('"use strict" not found in inline');
  const logicStart = useStrictIdx + '"use strict";'.length;
  // Step 2: ロジック終端 = "// UI ロジック" マーカーの直前にある "// ═" 罫線
  const uiMarker = "// UI ロジック";
  const uiIdx = fullScript.indexOf(uiMarker);
  if (uiIdx < 0) throw new Error("UI ロジック marker not found");
  const cut = fullScript.lastIndexOf("// ═", uiIdx);
  const logicEnd = cut < 0 ? uiIdx : cut;
  const logic = fullScript.slice(logicStart, logicEnd);

  // Step 3: 自前のラッパで包み、generateSheet を取り出す
  const wrapped = '"use strict";\n' + logic + '\nreturn { generateSheet: generateSheet };';
  const factory = new Function(wrapped);
  const api = factory();
  if (typeof api.generateSheet !== "function") {
    throw new Error("inline generateSheet not exposed");
  }
  return api.generateSheet;
}

// ─────────────────────────────────────────────────────────────
// 比較
// ─────────────────────────────────────────────────────────────
function answerKey(a) {
  if (!a) return "<null>";
  if (a.type === "remainder") return `R(${a.quotient},${a.remainder})`;
  if (a.type === "int")       return `I(${a.value})`;
  if (a.type === "decimal")   return `D(${a.num}/${a.den}|${a.display})`;
  if (a.type === "frac")      return `F(${a.num}/${a.den}|${a.display})`;
  if (a.type === "mixed")     return `M(${a.intPart},${a.num}/${a.den}|${a.display})`;
  return `?(${a.display})`;
}

function compareSheet(label, config, inlineGenerate) {
  let mResult, iResult;
  let mErr = null, iErr = null;
  try { mResult = moduleGenerate(config); } catch (e) { mErr = e; }
  try { iResult = inlineGenerate(config); } catch (e) { iErr = e; }

  // throw 状態の一致を確認
  if (mErr && iErr) {
    // 両方 throw → メッセージの主要部分が似ているかだけ確認
    const ok = (mErr.message.includes("未対応") === iErr.message.includes("未対応"))
            && (mErr.message.includes("生成失敗") === iErr.message.includes("生成失敗"));
    return { label, ok, note: ok ? "both throw (matched)" : `module: ${mErr.message.slice(0,40)} / inline: ${iErr.message.slice(0,40)}` };
  }
  if (mErr || iErr) {
    return { label, ok: false, note: `throw mismatch — module: ${mErr ? mErr.message.slice(0,60) : "ok"} / inline: ${iErr ? iErr.message.slice(0,60) : "ok"}` };
  }

  // 問題列を比較
  const m = mResult.problems;
  const i = iResult.problems;
  if (m.length !== i.length) {
    return { label, ok: false, note: `length differ: module=${m.length}, inline=${i.length}` };
  }
  for (let k = 0; k < m.length; k++) {
    if (m[k].question !== i[k].question) {
      return { label, ok: false, note: `Q[${k}] differ\n      module: ${m[k].question}\n      inline: ${i[k].question}` };
    }
    const mk = answerKey(m[k].answer);
    const ik = answerKey(i[k].answer);
    if (mk !== ik) {
      return { label, ok: false, note: `A[${k}] differ for ${m[k].question}\n      module: ${mk}\n      inline: ${ik}` };
    }
  }
  return { label, ok: true, note: `${m.length} problems matched` };
}

// ─────────────────────────────────────────────────────────────
// テストシナリオ
// ─────────────────────────────────────────────────────────────
const SCENARIOS = [
  ["デフォルト (arithmetic 整数 +-)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    digits: 2, seed: 1001, allowDuplicates: true,
  }],
  ["arithmetic 3項 整数 全演算", {
    count: 20, types: ["arithmetic"], terms: 3, ops: ["+","-","*","/"],
    digits: 1, seed: 1002, allowDuplicates: true,
  }],
  ["arithmetic 小数 +-", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["decimal1"], seed: 1003, allowDuplicates: true,
  }],
  ["arithmetic 真分数 +-", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["proper_fraction"], seed: 1004, allowDuplicates: true,
  }],
  ["arithmetic 真分数 +- (fractionDen=5)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["proper_fraction"], fractionDen: 5,
    seed: 1005, allowDuplicates: true,
  }],
  ["arithmetic 仮分数 +-", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["improper_fraction"], seed: 1006, allowDuplicates: true,
  }],
  ["arithmetic 帯分数 +-", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["mixed_number"], seed: 1007, allowDuplicates: true,
  }],
  ["L-033: 整数+小数 ×", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["integer", "decimal1"], digits: 1,
    seed: 1008, allowDuplicates: true,
  }],
  ["L-033: 整数+真分数 ×", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["integer", "proper_fraction"], digits: 1,
    seed: 1009, allowDuplicates: true,
  }],
  ["L-033: 整数+帯分数 ×", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["integer", "mixed_number"],
    seed: 1010, allowDuplicates: true,
  }],
  ["L-033: 整数+小数 (+,-,×) 混合", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-","*"],
    numberTypes: ["integer", "decimal1"], digits: 1,
    seed: 1011, allowDuplicates: true,
  }],
  ["remainder_division デフォルト", {
    count: 20, types: ["remainder_division"],
    seed: 1012, allowDuplicates: true,
  }],
  ["remainder_division (dots, 限定除数)", {
    count: 20, types: ["remainder_division"], notation: "dots",
    divisorMax: 5, seed: 1013, allowDuplicates: true,
  }],
  ["arithmetic + remainder 混合", {
    count: 20, types: ["arithmetic","remainder_division"],
    terms: 2, digits: 1, ops: ["+","-"],
    seed: 1014, allowDuplicates: true,
  }],
  ["fatal: 小数 + ÷", {
    count: 5, types: ["arithmetic"], terms: 2, ops: ["/"],
    numberTypes: ["decimal1"], seed: 1015, allowDuplicates: true,
  }],
  ["fatal: 小数のみ + ×", {
    count: 5, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["decimal1"], seed: 1016, allowDuplicates: true,
  }],
  ["L-036: 1桁加算 carry without", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+"],
    digits: 1, carry: "without", seed: 1017, allowDuplicates: true,
  }],
  ["L-036: 1桁加算 carry with", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+"],
    digits: 1, carry: "with", seed: 1018, allowDuplicates: true,
  }],
  ["L-036: 2桁減算 borrow with", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["-"],
    digits: 2, carry: "with", seed: 1019, allowDuplicates: true,
  }],
  ["L-036: 3項 +/- carry without", {
    count: 20, types: ["arithmetic"], terms: 3, ops: ["+","-"],
    digits: 1, carry: "without", seed: 1020, allowDuplicates: true,
  }],
  ["L-036: fatal carry + 非整数", {
    count: 5, types: ["arithmetic"], terms: 2, ops: ["+"],
    numberTypes: ["integer","decimal1"], carry: "with",
    seed: 1021, allowDuplicates: true,
  }],
  ["L-038: placeholder=left +", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+"],
    digits: 1, placeholder: "left", seed: 1022, allowDuplicates: true,
  }],
  ["L-038: placeholder=right - (非対称)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["-"],
    digits: 2, placeholder: "right", seed: 1023, allowDuplicates: true,
  }],
  ["L-038: placeholder=right ÷ (非対称)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["/"],
    digits: 1, placeholder: "right", seed: 1024, allowDuplicates: true,
  }],
  ["L-038: placeholder=result", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-","*"],
    digits: 1, placeholder: "result", seed: 1025, allowDuplicates: true,
  }],
  ["L-038: placeholder=random 全演算", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-","*","/"],
    digits: 1, placeholder: "random", seed: 1026, allowDuplicates: true,
  }],
  ["L-038: fatal placeholder + 3項", {
    count: 5, types: ["arithmetic"], terms: 3, ops: ["+"],
    digits: 1, placeholder: "left", seed: 1027, allowDuplicates: true,
  }],
  ["L-039: decimal2 +-", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["decimal2"], seed: 1028, allowDuplicates: true,
  }],
  ["L-039: decimal1 + decimal2 混合 (Ⅳ-2)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["decimal1","decimal2"], seed: 1029, allowDuplicates: true,
  }],
  ["L-039: 整数 + decimal2 (Ⅳ-3)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["integer","decimal2"], digits: 1,
    seed: 1030, allowDuplicates: true,
  }],
  ["L-039: 整数 × decimal2 (L-033 互換)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["integer","decimal2"], digits: 1,
    seed: 1031, allowDuplicates: true,
  }],
  ["L-045: complement le2 (Ⅰ-2)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+"],
    numberTypes: ["integer"], digits: 1, complement: "le2",
    seed: 1045, allowDuplicates: true,
  }],
  ["L-045: complement ge3 (Ⅰ-3)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+"],
    numberTypes: ["integer"], digits: 1, complement: "ge3",
    seed: 1046, allowDuplicates: true,
  }],
  ["L-045: multiplicandSet [2,3,5] (Ⅱ-1)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["integer"], digits: 1, multiplicandSet: [2,3,5],
    seed: 1047, allowDuplicates: true,
  }],
  ["L-045: multiplicandSet [7,8,9] (Ⅱ-3)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["integer"], digits: 1, multiplicandSet: [7,8,9],
    seed: 1048, allowDuplicates: true,
  }],
  ["L-046: carry='all' 2桁加算 (Ⅰ-4)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+"],
    numberTypes: ["integer"], digits: 2, carry: "all",
    seed: 1460, allowDuplicates: true,
  }],
  ["L-046: carry='all' 2桁減算 (Ⅰ-8)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["-"],
    numberTypes: ["integer"], digits: 2, carry: "all",
    seed: 1461, allowDuplicates: true,
  }],
  ["L-046: forceZeroDigit (Ⅰ-9)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["+","-"],
    numberTypes: ["integer"], digits: 3, forceZeroDigit: true,
    seed: 1462, allowDuplicates: true,
  }],
  ["L-046: factor10 乗算 (Ⅱ-6)", {
    count: 20, types: ["arithmetic"], terms: 2, ops: ["*"],
    numberTypes: ["integer"], digits: 2, factor10: true,
    seed: 1463, allowDuplicates: true,
  }],
  ["L-046: remainderClass=large (Ⅲ-3)", {
    count: 20, types: ["remainder_division"],
    divisorMax: 9, quotientMax: 9, remainderClass: "large",
    seed: 1464, allowDuplicates: true,
  }],
  ["L-046: remainderClass=max (Ⅲ-4)", {
    count: 20, types: ["remainder_division"],
    divisorMax: 9, quotientMax: 9, remainderClass: "max",
    seed: 1465, allowDuplicates: true,
  }],
  ["L-046: factor10 あまり除算 (Ⅲ-11)", {
    count: 20, types: ["remainder_division"],
    divisorMax: 9, quotientMax: 9, factor10: true,
    seed: 1466, allowDuplicates: true,
  }],
];

// ─────────────────────────────────────────────────────────────
// 実行
// ─────────────────────────────────────────────────────────────
console.log("=== sync_check: module vs inline ===\n");
let inlineGenerate;
try {
  inlineGenerate = loadInlineGenerate();
  console.log("inline generateSheet loaded\n");
} catch (e) {
  console.error("FATAL: failed to load inline:", e.message);
  process.exit(2);
}

let pass = 0, fail = 0;
for (const [label, config] of SCENARIOS) {
  const r = compareSheet(label, config, inlineGenerate);
  if (r.ok) {
    console.log(`  ✓ ${label}`);
    console.log(`      ${r.note}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}`);
    console.error(`      ${r.note}`);
    fail++;
  }
}
console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
