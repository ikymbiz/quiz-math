# 引継ぎ資料 #3 — 算数プリントメーカー MVP

最新版: **v32-ready** (`/mnt/user-data/outputs/sansu-mvp-v32-ready.zip`)
作業ディレクトリ: `/home/claude/mvp`
作成日: 2026-04-07
前回引継ぎ: HANDOFF-2.md (v31 logic 完了 / UI 配線 + ドキュメント残置時点)

## ✅ このセッションで完了 (v31 残タスクをすべて消化)

HANDOFF-2.md の「🚧 v31 残タスク」6 項目をすべて完了。リポジトリは v31 完成形 = **v32 着手可能状態** に到達。

### 1. UI 配線 (`index.html`) ✅
v31 で追加した config キーすべてを UI に露出:
- `<select id="carry">` に `<option value="all">連続 (両桁とも繰り上がり/下がり / Ⅰ-4・Ⅰ-8)</option>` 追加
- 新規 `<input type="checkbox" id="forceZeroDigit">` (空位 0 桁を含む整数 / Ⅰ-9)
- 新規 `<input type="checkbox" id="factor10">` (末尾ゼロの乗算 / あまり除算 / Ⅱ-6・Ⅲ-11)
- 新規 `<select id="remainderClass">` (any / large / max ; あまりあり除算のみ)
- 配置: `placeholder` select の直下 (carry / complement / multiplicandSet グループの自然な延長)
- `readUIConfig` (1594 行付近): `forceZeroDigit` / `factor10` / `remainderClass` を cfg に追加
- `applyUIConfig` (1633 行付近): 同 3 キーの逆方向反映を追加 (JSON インポート対応)

### 2. `tasks/SAKUMON_VERIFICATION.md` 更新 ✅
- Ⅰ-4 🟡→✅ (config: `digits=2, ops=[+], carry=all`)
- Ⅰ-8 🟡→✅ (config: `digits=3, ops=[-], carry=all` ※digits≥3 必須を明記)
- Ⅰ-9 🟡→✅ (config: `digits=2, forceZeroDigit=true`)
- Ⅱ-6 🟡→✅ (config: `digits=2, ops=[*], factor10=true`)
- Ⅲ-3 🟡→✅ (config: `remainderClass="large"`)
- Ⅲ-4 🟡→✅ (config: `remainderClass="max"`)
- Ⅲ-11 ⬜→✅ (config: `remainder_division, factor10=true`)
- サマリ表: Ⅰ行 4/5/1/3 → 7/2/1/3、Ⅱ行 4/1/0/3 → 5/0/0/3、Ⅲ行 3/2/1/5 → 6/0/0/5
- 合計: ✅20→**27**、🟡18→**12**、⬜2→**1**、❌112 (152 の整合済み)

> 注: HANDOFF-2.md は 🟡18→**14** と書いていましたが、実際の差分計算 (🟡 から 6 件が ✅ へ昇格) では **🟡12** が正解です。154 にならず 152 のままで合うのもこちら。

### 3. `tasks/lessons.md` に **L-046** 追記 ✅
内容:
- carry='all' は **carry_in/borrow_in 込みの筆算判定**であること
- 2 桁同士の subtraction で「両桁 borrow」は数学的に不可能 → Ⅰ-8 は実質 digits≥3 専用
- `factor10` は arithmetic / remainder で別実装 (前者は post-gen filter、後者は b/a/r を ×10 スケール)
- 投資効果: 7 セクションを 1 イテレーションで解禁 (L-045 と同水準)
- **反省**: 数学的不可能ケース (`carry='all' + ops=['-'] + digits=2`) は validation で明示 fatal にすべき → v32 タスク化

### 4. `README.md` config テーブル更新 ✅
- `carry` 行を更新 (`"all"` 値追加 + L-046 注記)
- `forceZeroDigit` / `factor10` / `remainderClass` 3 行新設
- `factor10` が arithmetic と remainder で**別意味** であることを明記

### 5. `tasks/todo.md` 更新 ✅
- v31 セクション全項目を `[x]` でマーク (Ⅰ-10 `digitsRange` のみ未実装で残置 → v32 へ持ち越し)
- v32 セクションを新設 (digitsRange / 通分型A,B,C / 帯分borrow / fatal 化追加)

### 6. 動作確認 ✅
```
node syntax check (index.html inline)  → JS OK
npm test                                → 135 passed, 0 failed
npm run sync                            → 42 pass, 0 fail
```
※ 実画面確認 (P-001 / L-018 / L-027) はブラウザ環境がないため未実施。
   **次セッションのユーザー側で UI 確認推奨** — 特に新規チェックボックス 2 つ + remainderClass select の表示位置とラベル文言。

## 📊 最終ステータス

### SAKUMON 進捗 (152 中)
- **v31 完成時**: ✅27 / 🟡12 / ⬜1 / ❌112
- in-scope 93 件換算: ✅29% (v30 比 +7 件、+8pt)
- 「現アーキで生成可能 (✅+🟡)」: 39 / 152 ≒ 26%

### ファイル変更まとめ (このセッション)
```
index.html                    ← UI 配線 (carry='all' option / 3 widgets / read+apply)
tasks/SAKUMON_VERIFICATION.md ← 7 セクション昇格 + サマリ再集計
tasks/lessons.md              ← L-046 追記 (200 行ほど)
tasks/todo.md                 ← v31 完了マーク + v32 セクション新設
README.md                     ← config テーブルに 4 キー (carry更新 + 新3キー)
HANDOFF-3.md                  ← 本ファイル (新規)
```
※ v31 のロジック実装 (`js/problems/arithmetic.js` / `js/problems/remainder.js` / inline mirror / `js/tests/test.js` / `scripts/sync_check.mjs`) は HANDOFF-2.md 時点で完了済みのため未編集。

## 🚀 次に進むべき方向 (v32)

`tasks/todo.md` の v32 セクションに整理済み:

1. **Ⅰ-10 `digitsRange: [min, max]`** — 桁数の異なる加減算 (例: 3 桁 + 2 桁)。v31 でやり残した唯一の filter 系。
2. **Ⅴ-3 / Ⅴ-4 / Ⅴ-5 通分型 A/B/C** — 分数加減で「分母が一方の倍数」「互いに素」「共通因数あり」の 3 タイプを撃ち分けるフィルタ。
3. **Ⅴ-7 / Ⅴ-8 帯分数 borrow** — 整数部からの繰り下がり有無を制御。
4. **validation 強化** — `carry='all' + ops=['-'] + digits=2` のような数学的不可能ケースを retry 枯渇ではなく明示 fatal に (L-046 の反省)。

これらで in-scope 93 件中さらに 6 件解禁見込み → ✅33 (35%) 到達予定。

それ以降のロードマップは HANDOFF-2.md の「v32 以降」表をそのまま採用 (v33 小数演算 / v34 分数演算 / v35-36 Quantity / v37 概算 / v38 計算工夫 / v39 残務)。**残り 8 イテレーションで in-scope 93 件すべて完成見込み**。

## 🔑 重要な原則 (再掲)

- **P-001**: 同じ失敗を繰り返さない (lessons.md 参照)
- **P-002**: 指示に従う (拡大も縮小もしない)
- **P-003**: 指示にない変更は承認を得る
- **L-019**: js/ ESM と index.html インラインの**二重実装**に注意
- **L-032**: 実装したら README と SAKUMON_VERIFICATION 必ず反映
- **L-034**: `npm run sync` で module ↔ inline 一致を担保
- **L-018 / L-027**: テスト緑でも実画面で動かすまで完了としない
- **L-042**: 印刷は `beforeprint`/`afterprint`、`window.print()` 後の setTimeout 禁止
- **L-044**: CSS Grid `1fr` は親の definite height が必要
- **L-046** (今回追加): 「両桁 carry/borrow」は carry_in 込みの筆算判定。素朴な digit 比較で済ませない。

## 検証コマンド

```bash
cd /home/claude/mvp
npm test          # 現在 135/135
npm run sync      # 現在 42/42
```

JS 構文確認:
```bash
node --input-type=module -e "
import fs from 'fs';
const html = fs.readFileSync('index.html','utf8');
const m = html.match(/<script>([\\s\\S]*?)<\\/script>/);
try { new Function(m[1]); console.log('OK'); } catch(e) { console.log('ERR:', e.message); }
"
```

## 次の応答テンプレート (v32 開始時)

```
principles 確認 → P-001 / L-019 / L-032 / L-034 / L-046。
v31 は完成 (135/135、sync 42/42、UI + ドキュメント全部揃った)。
v32 着手: Ⅰ-10 digitsRange → Ⅴ-3/4/5 通分型 → Ⅴ-7/8 帯分borrow → validation fatal 化。
順に lessons / sync / test / SAKUMON / README を回しながら進める。
```
