# 算数プリントメーカー（Phase 2）

AIを使わず、アルゴリズムで算数プリントを自動生成するWebアプリ。
プラグイン構造で、JSファイルを追加するだけで新しい問題タイプを拡張できる。

**現バージョンのスコープ**：整数・小数・真分数・仮分数・帯分数 / 2項・3項 / 四則演算 / あまりあり除算 / 記述式。

---

## スコープ管理（SAKUMON 152 サブセクションのうち何を作るか）

`tasks/SAKUMON_SECTIONS.md` に記載されている 152 サブセクションのうち、本プロジェクトで**実装対象とする単元**と**明示的にスコープアウトする単元**を以下に整理する。スコープアウトされた単元は、当面実装せず、SAKUMON_VERIFICATION の進捗集計からも除外する。

### ✅ 実装対象 (in-scope: 93 件)

| 大セクション | 件数 | 備考 |
|---|---|---|
| Ⅰ. 整数の加減算 (Ⅰ-1〜10) | 10 | Ⅰ-11〜13 (補数の□) は逆算スコープアウトで除外 |
| Ⅱ. 整数の乗算 (Ⅱ-1〜3, 5, 6, 8) | 6 | Ⅱ-4 (2式並べ) と Ⅱ-7 (筆算) は除外 |
| Ⅲ. 整数の除算 (Ⅲ-1〜5, 11) | 6 | Ⅲ-6 (□穴埋め) と Ⅲ-7〜10 (筆算) は除外 |
| Ⅳ. 小数の四則演算 (一部) | 8 | Ⅳ-2/3/4/6 (decimal2 必要) と Ⅳ-13/14 (逆算) は除外 |
| Ⅴ. 分数の四則演算 (Ⅴ-1〜18) | 18 | Ⅴ-19 (分数補数の□) は除外 |
| Ⅵ. 整数・小数・分数の混合 | 6 | 全部 |
| Ⅶ. 計算の順序と括弧 | 9 | 全部 |
| Ⅸ. 計算の工夫 | 12 | 全部 (計算工夫 pattern templates が必要) |
| Ⅹ. 単位の計算 (Ⅹ-1〜7, 18) | 8 | Ⅹ-8/16/17 (文章題) と Ⅹ-9〜15 (図形) は除外 |
| ⅩⅠ. 時刻と時間 (ⅩⅠ-1〜10) | 10 | ⅩⅠ-11 (文章題) は除外 |
| **合計** | **93** | |

### ❌ スコープアウト (out-of-scope: 59 件)

明示的に除外する単元 = 当面実装しない。新規レイヤの規模が大きい、または本プロダクトの主用途 (1 枚で大量の計算演習) と整合しないため。

| 単元 | 件数 | スコープアウト理由 | 対応する新レイヤ |
|---|---|---|---|
| **Ⅷ. 逆算 (□を求める計算) 全 7 件** | 7 | □ プレースホルダ AST node + 逆算ソルバが必要。範囲が広く単独で 1 イテレーション規模 | □ AST + 逆算 |
| Ⅰ-11 / Ⅰ-12 / Ⅰ-13 (補数の□) | 3 | 同上 (Ⅷ と同じ層) | □ AST + 逆算 |
| Ⅲ-6 (あまりあり 穴埋め4パターン) | 1 | 同上 | □ AST + 逆算 |
| Ⅳ-13 / Ⅳ-14 (概数逆算 / 1への補数) | 2 | 同上 | □ AST + 逆算 |
| Ⅴ-19 (分数補数) | 1 | 同上 | □ AST + 逆算 |
| **ⅩⅡ. 数の性質 全 8 件** | 8 | 答えがリスト (約数/倍数列挙) や非数値 (素因数分解) で、現行の `answer` 構造体に収まらない | 数の性質プラグイン (答え型拡張) |
| **ⅩⅢ. 割合と比 全 10 件** | 10 | 比/百分率/歩合の概念層 + □ プレースホルダ + 文章題テンプレが必要 | 割合・比の概念層 + 文章題 |
| **ⅩⅣ. 筆算 (縦式) 全 6 件** | 6 | CSS Grid 縦書きレイアウト + 繰り上がり書き込み欄 + 列揃えが必要。本プロダクトは横書き計算ドリル特化 | 筆算レイアウト |
| Ⅱ-7 (中間ゼロの乗算 筆算) | 1 | 同上 | 筆算レイアウト |
| Ⅲ-7 〜 Ⅲ-10 (仮商修正 / 商の空位) | 4 | 同上 | 筆算レイアウト |
| Ⅹ-8 / Ⅹ-16 / Ⅹ-17 (単位の文章題) | 3 | 文章題テンプレートエンジンが必要 | 文章題エンジン |
| ⅩⅠ-11 (時間の文章題) | 1 | 同上 | 文章題エンジン |
| Ⅹ-9 〜 Ⅹ-15 (面積/体積) | 7 | 図形ドメイン (周長/面積/体積) が必要 | 図形ドメイン |
| Ⅱ-4 (九九 交換法則検証) | 1 | 「a×b と b×a を 2 式並べる」出題形式が必要 | 2 式並べ出題形式 |
| Ⅳ-2 (加減 桁不一致 3.4+1.25) | 1 | decimal2 (小数第二位) の数生成が必要。主用途と整合しない | decimal2 数生成 |
| Ⅳ-3 (5−1.25 系) | 1 | 同上 | decimal2 数生成 |
| Ⅳ-4 (1.25×4 末尾0消去) | 1 | 同上 | decimal2 数生成 |
| Ⅳ-6 (0.12×0.3) | 1 | 同上 | decimal2 数生成 |
| **合計** | **59** | | |

> 注: スコープアウトされた単元は、将来の方針変更で再導入する可能性がある。その場合は本セクションの分類を更新する。

### 📊 達成率の数え方

- **分母**: in-scope 93 件 (スコープアウトは除外)
- **分子 (✅)**: 既存 config だけで該当単元の問題が完全に生成できる
- **🟡**: 似た形は出るが「狙い撃ち」設定がまだない (filter 拡張で ✅ 化可)
- **⬜**: 既存アーキの小拡張で対応可
- **❌**: 新レイヤが必要

詳細な進捗は `tasks/SAKUMON_VERIFICATION.md` を参照。

---

## UI アーキテクチャ（v3）

### 二重構造

本リポジトリには同じロジックの実装が**2つ**存在します：

| 実装 | 場所 | 用途 |
|---|---|---|
| モジュール版 | `js/` 配下 | Node.js テスト / 開発 / 他プロジェクトへの再利用 |
| インライン版 | `index.html` 内の `<script>` | エンドユーザー配布・ブラウザ実行 |

**なぜ二重化？** ES モジュール（`import`/`export`）は `file://` プロトコルでは CORS により
ロードできません。ユーザーが `index.html` をダブルクリックで開くと何も動かなくなります
（L-019 参照）。このため、配布用 HTML は全ロジックを `<script>` に inline しています。

モジュール版とインライン版が乖離しないよう、`scripts/inline_sync_check.mjs`（将来追加予定）で
出力一致を自動検証することを推奨します。現在は手動で：
```bash
# 同じ設定でモジュール版とインライン版の結果を比較
node -e '...'  # 手動確認
```

### タブ構成

```
┌─────────────────────────────────────────┐
│ ① 問題生成 │ ② 問題表示・印刷 │ ③ 解答     │
├─────────────────────────────────────────┤
│                                         │
│  (タブごとに独立した内容)                  │
│                                         │
└─────────────────────────────────────────┘
```

- **① 問題生成**：設定フォーム＋生成ボタン。問題・解答は見えない
- **② 問題表示・印刷**：問題のみ（`7/8 + 2/3 = □`）。印刷ボタンで配布用にプリント
- **③ 解答**：丸つけ用の**完成式**（`7/8 + 2/3 = 37/24`）。問題の式とセットで答えが見えるので、先生が丸つけしやすい

初期状態ではタブ②③は disabled。生成実行後に有効化されます。
印刷は **開いているタブだけ**が対象になり、`@media print` で他のタブは隠されます。

### 分数の視覚表示

`7/8` のような分数は、純CSSの `display: inline-flex` で**分子・横棒・分母**の縦並び表現に
レンダリングされます（LaTeX や外部ライブラリ不要）：

```
  7        2        37
  ─   +    ─   =    ──
  8        3        24
```

`renderMath()` ヘルパーが `a/b` パターンを検出して `<span class="frac">` に変換します。
整数・小数・演算子はそのまま通過します。詳細は L-022。

### 印刷レイアウト

**用紙**: A4 縦 (portrait)、余白 15mm
**配置**: 列方向 (上から下) に項番が並ぶ
**プリセット** (UI で選択、L-041 再改訂で 10/20/30 → 20/40/60 に増量):

| プリセット | 用途 | 本文サイズ | 列×行 | 1 ページ |
|---|---|---|---|---|
| **大** | 低学年・ゆったり | 18pt | 2×10 | **20 問** |
| **中** | 標準 | 13pt | 2×20 | **40 問** |
| **小** | 大量演習 | 11pt | 3×20 | **60 問** |

サイズ決定の根拠は A4 縦の有効本文域 (≒240mm) に対して各プリセットの行高 (font-size × 1.4) を積み上げて十分余裕がある範囲で密度を最大化したものです。当初は教科書体様規格を基準に 10/20/30 としましたが、実機印刷で紙面下半分が大きく余ることが判明し、計算ドリル本来の用途 (1 枚で大量演習) に合わせて 20/40/60 に増量しました (L-041 再改訂)。

```
┌────────────────────────────────┐
│        算数プリント              │  ← title 18pt 固定
│   問題数: 25 / 1 / 3 ページ      │  ← meta 9pt 固定
├──────────────┬──────────────────┤
│ (1) ...      │ (6)  ...         │
│ (2) ...      │ (7)  ...         │
│ (3) ...      │ (8)  ...         │  ← 本文サイズはプリセット連動
│ (4) ...      │ (9)  ...         │
│ (5) ...      │ (10) ...         │
└──────────────┴──────────────────┘
```

実装:
- `@page { size: A4 portrait; margin: 15mm; }`
- `.print-page[data-size="X"]` で CSS Grid の `font-size` / `grid-template-columns` / `grid-template-rows` がカスケード
- `renderPrintPanel` / `renderAnswerPanel` が選択中のプリセットに合わせて問題を `PROBLEMS_PER_PAGE` 単位で `<div class="print-page">` に分割
- 11 問以上あれば自動的に複数ページに分割 (例: 中プリセットで 25 問 → 10 / 10 / 5 の 3 ページ)

詳細は L-040 / L-041。

---

## クイックスタート

### ブラウザで使う（ダブルクリックでOK）
`index.html` をブラウザで直接開くだけで動きます。
**v3 以降は自己完結型 HTML なので簡易サーバー不要**（L-019 参照）。

UI は3タブ構成：
1. **① 問題生成**：演算子・数の種類・項数・桁数・問題数・シードを設定して生成
2. **② 問題表示・印刷**：生成された問題だけを表示。印刷ボタンで配布用にプリント
3. **③ 解答**：丸つけ用の解答リスト。別途印刷可能

生成ボタンを押すまでタブ2・3は無効化されています。

### 論理テスト（開発者向け）
```bash
cd mvp
npm test       # 論理テスト (現在 86 ケース)
npm run sync   # モジュール版 ⇔ インライン版 同期検証 (L-019/L-024/L-028/L-033)
npm run check  # test と sync をまとめて実行
```
期待：`86 passed, 0 failed` および `16 pass, 0 fail`

### 実動作確認（目視・ストレス）
論理テストが通っても実動作で違和感が出るケースがある（L-016, L-017, L-018, L-027 参照）。
リリース前に必ず以下も通す：

```bash
node scripts/smoke.mjs       # 典型シナリオの出力を目視
node scripts/verify.mjs      # 制約遵守を大量データで検証
node scripts/stress.mjs      # 実運用想定シナリオ＋時間計測
node scripts/sync_check.mjs  # モジュール版とインライン版の出力一致確認
```

---

## ファイル構成

```
mvp/
├── index.html                  # Phase 2 UI
├── package.json
├── README.md
├── tasks/
│   ├── todo.md
│   └── lessons.md              # 失敗事項・予防ルール (L-001〜L-015)
└── js/
    ├── core/
    │   ├── Frac.js             # 有理数
    │   ├── SeedRandom.js       # xorshift32
    │   └── Evaluator.js        # AST評価 + render + allNonNegative + hasTrivial
    ├── problems/
    │   ├── _helpers.js         # formatAnswer(mode) / buildProblem / fracToDecimalString
    │   ├── _numberGen.js       # 整数 / 小数第1位 / 真分数の乱数生成
    │   ├── addition.js         # Phase 1 互換（整数 a+b）
    │   ├── subtraction.js      # Phase 1 互換（整数 a-b、非負）
    │   ├── multiplication.js   # Phase 1 互換（整数 a×b）
    │   ├── division.js         # Phase 1 互換（整数 a÷b、割り切れ）
    │   ├── arithmetic.js       # Phase 2 汎用 N 項プラグイン ★
    │   └── remainder.js        # Phase 2 あまりあり除算 ★
    ├── registry.js
    ├── bootstrap.js            # 全プラグイン登録の集約点
    ├── generator.js            # retry / dedup / validation / config pass-through
    └── tests/
        └── test.js             # 47テスト
```

---

## 提供プラグイン

### 旧式（単一演算・2項整数のみ、Phase 1 互換用）

| id | 内容 |
|---|---|
| `addition` | 整数 a + b |
| `subtraction` | 整数 a − b（非負保証） |
| `multiplication` | 整数 a × b |
| `division` | 整数 a ÷ b（割り切れ保証） |

### Phase 2

| id | 内容 |
|---|---|
| `arithmetic` | 汎用 N 項 × 任意の演算子 × 任意の数の種類 |
| `remainder_division` | あまりあり除算 |

**これから新規利用するなら `arithmetic` 一本で十分。**
旧プラグインは既存コードとの互換のために残してある。

---

## API

### `generateSheet(config)`

```js
import { generateSheet } from "./js/generator.js";

const { problems, meta } = generateSheet({
  count: 20,
  types: ["arithmetic"],
  seed: 42,
  allowDuplicates: true,

  // 以下は arithmetic プラグインが解釈するオプション
  terms: 3,                               // 2 or 3
  ops: ["+", "-", "*"],                   // 使う演算子
  numberTypes: ["integer"],               // "integer" | "decimal1" | "decimal2" | "proper_fraction" | "improper_fraction" | "mixed_number"
  digits: 2,                              // 整数の桁数
  allowParens: true,                      // 括弧形（結果が変わるときのみ採用）
});
```

### config オプション一覧

| キー | 型 | 既定値 | 説明 |
|---|---|---|---|
| `count` | number | 10 | 生成問題数 |
| `types` | string[] | `["addition", "subtraction", "multiplication", "division"]` | 使うプラグインid |
| `seed` | number | 1 | 乱数シード（同じなら同じ問題列） |
| `allowDuplicates` | boolean | false | 重複許可 |
| `terms` | number | 2 | 項数（2 または 3、arithmetic用） |
| `ops` | string[] | `["+","-","*","/"]` | 演算子集合（arithmetic用） |
| `numberTypes` | string[] | `["integer"]` | `integer` / `decimal1` / `decimal2` / `proper_fraction` / `improper_fraction` / `mixed_number` |
| `digits` | number | 1 | 整数の桁数（1〜3） |
| `allowParens` | boolean | true | 3項時の括弧許可 |
| `divisorMax` | number | 9 | あまりあり除算の除数最大 |
| `quotientMax` | number | 9 | あまりあり除算の商最大 |
| `notation` | string | `"amari"` | `"amari"` or `"dots"`（⋯）|
| `carry` | string | `"any"` | `"any"` / `"with"` / `"without"` / `"all"` 整数加減の繰り上がり/繰り下がり制御 (L-036、L-046 で `"all"` 追加: 連続両桁、Ⅰ-4/Ⅰ-8) |
| `placeholder` | string | `"none"` | `"none"` / `"left"` / `"right"` / `"result"` / `"random"` 穴埋め(□) 配置 (L-038) |
| `complement` | string | `"any"` | `"any"` / `"le2"` / `"ge3"` 1桁加算の補数フィルタ (Ⅰ-2/Ⅰ-3、L-045) |
| `multiplicandSet` | number[] | undefined | 例: `[2,3,5]`。九九の段別フィルタ。`digits=1` + `*` 必須 (Ⅱ-1〜Ⅱ-3、L-045) |
| `forceZeroDigit` | boolean | `false` | 整数オペランドの少なくとも一つに 0 桁を含む (Ⅰ-9、L-046) |
| `factor10` | boolean | `false` | arithmetic: 全 × ノードで片方が 10 の倍数 (Ⅱ-6) / remainder: 除数・被除数ともに 10 の倍数 (Ⅲ-11)。L-046 |
| `remainderClass` | string | `"any"` | `"any"` / `"large"` (r ≥ ⌈b/2⌉、Ⅲ-3) / `"max"` (r = b−1、Ⅲ-4)。あまりあり除算のみ。L-046 |

---

## Problem データ構造

```js
// 通常の arithmetic 問題
{
  type: "arithmetic",
  expr: { /* AST */ },
  question: "(6 + 2) × 5 =",     // 末尾は必ず "=" (□ なし)
  answer: {
    type: "int" | "decimal" | "frac",
    value?: 40,             // int の場合
    num?: 21, den?: 20,     // decimal / frac の場合
    display: "40"           // 常に存在
  }
}

// あまりあり除算
{
  type: "remainder_division",
  expr: { /* a ÷ b の AST */ },
  question: "17 ÷ 5 =",          // 末尾は必ず "=" ("あまり" もなし)
  answer: {
    type: "remainder",
    quotient: 3,
    remainder: 2,
    display: "3 あまり 2"          // notation:"dots" なら "3 ⋯ 2"
  },
  meta: { dividend: 17, divisor: 5 }
}
```

問題文の不変条件については下記「問題文フォーマット仕様」を必ず参照のこと。

### answer.type の振り分けルール

| type | 出る条件 |
|---|---|
| `int` | 結果が整数（どの数種類でも） |
| `decimal` | `numberTypes` に `decimal1` または `decimal2` が含まれ、結果が小数で表せる |
| `frac` | `numberTypes` に `proper_fraction` が含まれ、結果が分数 |
| `remainder` | `remainder_division` プラグイン |

---

## 問題文フォーマット仕様（手書き紙テスト前提）

本アプリの出力は **印刷して生徒が手書きで答えを記入する** ことを前提とした
紙のテストプリントである。この前提から、問題文には以下の不変条件が課される。

### 問題文の不変条件（必須・テストで自動検証）

すべての問題タイプの `question` 文字列は、以下を**必ず**満たす：

1. **末尾が `=` で終わる**
   `"3 + 5 ="`、`"17 ÷ 5 ="`、`"1/2 + 1/3 ="` のように、等号で終わる
2. **`□` を含まない**
   記入欄を示すプレースホルダ記号は印字面に出さない
3. **`あまり` `⋯` `_____` などの「答えの位置を示すラベル・記号」を含まない**
4. **答えそのもの（`answer.display` と同一文字列）が問題文に現れない**

### 例

| ✅ 正しい問題文 | ❌ 禁止 | 理由 |
|---|---|---|
| `3 + 5 =` | `3 + 5 = □` | □ は記入欄の暗示 |
| `17 ÷ 5 =` | `17 ÷ 5 = □ あまり □` | あまり がヒント |
| `1/2 + 1/3 =` | `1/2 + 1/3 = □` | 同上 |

### 解答との関係

解答は**問題文を一切変更せず**、末尾に append するだけで完成形を得る：

```js
// 完成式 = 問題文 + " " + 答え
const answeredLine = p.question + " " + p.answer.display;
// → "3 + 5 = 8"
// → "17 ÷ 5 = 3 あまり 2"
// → "1/2 + 1/3 = 5/6"
```

`□` を `replace` するような実装は禁止。問題文に □ が存在しないため動かないし、
内部表現と印刷表現を分離するという原則にも反する。

### 自動検証

`js/tests/test.js` の **Phase 3** セクションで全プラグインに対して以下を強制：

```js
assert.ok(!p.question.includes("□"));
assert.ok(!p.question.includes("あまり"));
assert.ok(!p.question.includes("⋯"));
assert.ok(p.question.endsWith("="));
```

### 将来の例外

「穴埋め」「選択肢」など、問題文に □ や記号が**意味的に必要**なタイプを追加する場合は、
それらは別の `type` として定義し、上記不変条件は当該タイプには適用しない。
ただし、**通常の記述式（`arithmetic`, `remainder_division`）には例外なく適用される**。

詳しくは `tasks/lessons.md` の **L-023** を参照。

---

## 数学的保証

| 項目 | 保証内容 |
|---|---|
| 浮動小数点誤差 | 全計算を Frac で行うため一切発生しない |
| 負の数 | 問題中・答え・**途中計算のどこにも登場しない**（`allNonNegative`） |
| 自明計算 | `×0` `×1` `÷1` を全て排除（`hasTrivial`） |
| ゼロ除算 | 構造的に不可能（生成時にブロック） |
| 割り切れ除算 | 逆算方式（除数 × 商 で被除数を構築） |
| あまりあり除算 | `a = b × q + r` かつ `0 < r < b` を構造的に保証 |
| 分数の既約 | Frac コンストラクタで常に GCD 約分 |
| 括弧 | 計算結果が変わる場合のみ生成（MVP要件の通り） |
| 再現性 | 同じ seed + config なら毎回同じ問題列 |

---

## プラグインを追加する

### 最小手順
1. `js/problems/xxx.js` を作成し、`export const XxxProblem = { id, generate(config, rng) {...} }` を書く
2. `js/bootstrap.js` に `import` + `register(XxxProblem)` の2行を追加
3. `js/tests/test.js` に対応テストを追加（計算・制約・表示形式・逆方向検証の4点セット、L-015 参照）
4. `lessons.md` の L-001〜L-015 に一度目を通す

### 必須インターフェース
```js
export const XxxProblem = {
  id: "xxx",                              // 一意のid
  generate(config, rng) {                 // rng は SeedRandom インスタンス
    // ...
    return {
      type: "xxx",
      expr: /* AST */,
      question: "...",
      answer: { type, display, ... },
    };
    // または null を返すと generator が retry する
  },
};
```

---

## テスト構成（47ケース）

| セクション | ケース数 | 内容 |
|---|---|---|
| Frac | 6 | 四則・約分・符号・ゼロ除算・toString |
| SeedRandom | 3 | 決定性・範囲 |
| Evaluator | 4 | 優先順位・左結合・括弧自動 |
| Problem plugins (Phase 1) | 4 | 旧プラグイン smoke |
| Property: 1000問 | 3 | 大量生成・逆方向・重複排除 |
| Determinism | 2 | seed再現性 |
| Failure / boundary | 3 | 未知type・不可能dedup・count=1 |
| Frac↔Decimal | 2 | fracToDecimalString |
| AST helpers | 5 | allNonNegative / hasTrivial |
| Arithmetic 3-term integer | 5 | 500問・非負・自明なし・逆方向・括弧 |
| Arithmetic decimal | 3 | 300問・逆方向・非負 |
| Arithmetic fraction | 3 | 既約・非負・分数表記維持 |
| Remainder | 3 | 500問・関係式・表記切替 |
| 統合（混合types） | 1 | arithmetic + remainder 混合 |

**`47 passed, 0 failed`**

---

## 既知の制限

- `arithmetic` で `×` や `÷` を含める場合、数の種類は整数のみに自動制限される（L-014）
- 3項の `÷` は位置 0（式の先頭）に限定される（L-013）
- 小数は第1位まで、分数は真分数のみ・最大分母9
- UI は最小限（設定フォーム + 問題表示）。印刷は A4 縦・10 問/ページ固定 (L-040)。列数・フォントサイズの調整 UI はまだない

---

## バージョン履歴

- **Phase 1**：整数・2項・四則・25テスト
- **Phase 2**：3項・小数・真分数・あまりあり除算・自明計算抑制・途中非負保証・47テスト
