# タスクリスト (todo.md)

## Phase 1: MVP（整数・2項・4演算）
- [x] 設計合意（プラグイン構造 / AST / 構造化answer）
- [x] lessons.md 初版作成
- [x] Frac クラス（GCD約分・四則・eq・isInt）
- [x] SeedRandom（xorshift32）
- [x] Evaluator（AST評価 + render + 括弧自動）
- [x] registry / bootstrap
- [x] addition / subtraction / multiplication / division プラグイン
- [x] retry / dedup / validation / seed再現性
- [x] 25テスト green
- [x] index.html（最小UI）
- [x] README.md

## Phase 2: 3項・小数・分数・あまりあり
- [x] Evaluator 拡張（num.display / allNonNegative / hasTrivial）
- [x] `_numberGen.js`：integer / decimal1 / proper_fraction
- [x] `_helpers.js`：fracToDecimalString / formatAnswer (mode) / buildProblem (mode)
- [x] `arithmetic.js`：汎用N項プラグイン
  - [x] 2項 / 3項対応
  - [x] 左結合 + 括弧形（結果が変わるときのみ採用）
  - [x] 非負保証（最終も途中も）
  - [x] 自明計算抑制（×0 ×1 ÷1）
  - [x] 割り切れ除算（逆算方式、位置0のみ）
  - [x] answerMode 自動推定（分数→fraction、小数→decimal、整数→int）
  - [x] ×÷は整数のみに制限（MVP安全弁）
- [x] `remainder.js`：あまりあり除算（`a = b×q + r`）
  - [x] あまり表記 "あまり" / "⋯" 切替
- [x] bootstrap.js に新プラグイン登録
- [x] generator.js を config pass-through に拡張
- [x] 47テスト green（Phase 2 で +22）
- [x] index.html UI 更新（Phase 2 オプション対応）
- [x] lessons.md に L-011〜L-015 追記

## Phase 3: UI拡張・配布対応（v3）
- [x] 生成ボタンが無反応バグの原因特定（L-019: ES modules × file://）
- [x] index.html を自己完結型に書き換え（inline bundle、import/export排除）
- [x] 3タブ構成へ分離（問題生成 / 問題表示・印刷 / 解答）
- [x] タブ②③は初期disabled、生成後に有効化
- [x] 印刷機能: `@media print` で開いているタブのみ出力
- [x] 問題タブ・解答タブそれぞれに印刷ボタン
- [x] プリントタイトル入力欄
- [x] モジュール版とインライン版の出力一致を手動検証（5シナリオ完全一致）
- [x] Node論理テストが引き続き全て green (47/47)
- [x] lessons.md に L-019, L-020 追記
- [x] README.md にUI二重構造・タブ仕様を追記

## Phase 3.1: バグ修正・分数視覚化（v4.1）
- [x] 【BUG L-021】解答タブが裸の値しか出さない問題を修正
  - 「□を答えで埋めた完成式」を表示するように変更
  - `buildAnsweredLine(p)` ヘルパーを追加
- [x] 【UX L-022】分数を CSS 視覚分数で表示
  - `renderMath(str)` ヘルパーで `a/b` パターンを `<span class="frac">` に変換
  - LaTeX/MathJax は使用せず純CSS実装
  - 整数・小数・演算子は素通し
- [x] DOM スタブで生成 → 問題表示 → 解答表示の全フロー検証
- [x] lessons.md に L-021 / L-022 追記
- [x] README.md に分数視覚化の説明追加

## Phase 4 候補（未着手）
- [x] モジュール版↔インライン版の自動同期検証スクリプト (`scripts/sync_check.mjs`、L-034)
- [x] 仮分数・帯分数サポート (operand + 答え側 mixed 表示も対応、L-035)
- [x] 小数 × 整数、分数 × 整数の混合演算 (× のみ。÷ は未対応のまま。L-033)
- [ ] 4項以上の式
- [ ] 除算を任意位置に置ける一般化（L-013参照）
- [x] 穴埋めフォーマット（□に入る数を求める）— L1: 2項・整数のみ完了 (L-038)
- [ ] 選択肢フォーマット（4択・ディストラクタ生成）
- [x] 繰り上がり/繰り下がりの制御 (整数加減のみ。L-036)
- [~] 逆算（穴埋め）レベル1〜3 — L1 完了 (L-038)。L2/L3/L4 は次イテレーション
- [x] config JSON 外部化 (UI で書き出し / 読み込み、L-037)
- [x] 印刷レイアウト 基本仕様 — A4縦・10問/枚・縦項番・16pt 本文 (L-040)
- [x] 印刷レイアウトの文字サイズ・問題数 調整 — 大/中/小の3プリセット (L-041)
- [ ] 筆算レイアウト

## Phase 4 / v30: SAKUMON L-045 (補数 filter + 九九段別)
- [x] arithmetic.js: complement / multiplicandSet validation + post-gen filter
- [x] multiplication.js: legacy multiplicandSet 対応 (pre-gen)
- [x] index.html (inline): arithmetic 同等変更
- [x] index.html UI: complement / multiplicandSet select 追加
- [x] readUIConfig / applyUIConfig 配線
- [x] js/tests/test.js: L-045 テスト 8 件 (125/125 pass)
- [x] scripts/sync_check.mjs: L-045 4 シナリオ (35/35 pass)
- [x] tasks/SAKUMON_VERIFICATION.md 更新 (Ⅰ-2/Ⅰ-3/Ⅱ-1/Ⅱ-2/Ⅱ-3 → ✅、サマリ ✅15→20、🟡23→18)
- [x] tasks/lessons.md L-045 追記
- [x] README.md スコープ管理セクション新設 (in-scope 93 / out-of-scope 59 単元明記)
- [x] README.md config テーブルに carry/placeholder/complement/multiplicandSet 追加

## Phase 4 / v31: filter 拡張 (🟡 → ✅ 格上げ) — L-046
- [x] Ⅰ-4 / Ⅰ-8 連続繰り上がり/繰り下がり: `carry: "all"` (carry_in/borrow_in 込みの筆算判定。Ⅰ-8 は digits≥3 必須)
- [x] Ⅰ-9 空位 (0) を含む加減: `forceZeroDigit: true`
- [ ] Ⅰ-10 桁数の異なる加減: `digitsRange: [min, max]` (v32 持ち越し)
- [x] Ⅱ-6 末尾ゼロの乗算: `factor10: true` (片方が 10 の倍数)
- [x] Ⅲ-3 あまり大: `remainderClass: "large"` (r ≥ ⌈b/2⌉)
- [x] Ⅲ-4 あまり限界: `remainderClass: "max"` (r = b-1)
- [x] Ⅲ-11 末尾ゼロ同士のあまり: `factor10: true` for remainder_division
- [x] arithmetic.js / remainder.js / index.html inline 三重実装 (L-019)
- [x] js/tests/test.js: L-046 テスト 9 件 → 135/135 pass
- [x] scripts/sync_check.mjs: L-046 シナリオ 7 件 → 42/42 pass
- [x] index.html UI: carry='all' / forceZeroDigit / factor10 / remainderClass の入力ウィジェット
- [x] readUIConfig / applyUIConfig 配線
- [x] tasks/SAKUMON_VERIFICATION.md 更新 (✅20→27、🟡18→12、⬜2→1)
- [x] tasks/lessons.md L-046 追記
- [x] README.md config テーブルに carry='all' / forceZeroDigit / factor10 / remainderClass 追記

## Phase 4 / v32: filter 拡張 続編
- [ ] Ⅰ-10 `digitsRange: [min, max]` (桁数の異なる加減)
- [ ] Ⅴ-3/4/5 通分型 A/B/C (一方が他方の倍数 / 互いに素 / 共通因数あり)
- [ ] Ⅴ-7/8 帯分数 borrow (繰り下がりあり/なし)
- [ ] `carry='all' + ops=['-'] + digits=2` を validation で fatal 化 (L-046 反省)
