// 実運用想定: 人が設定しそうな組み合わせを全部、時間計測付きで
import { generateSheet } from "../js/generator.js";
import { evalNode } from "../js/core/Evaluator.js";

const scenarios = [
  ["小1: 1桁+−",                     {count:20, types:["arithmetic"], ops:["+","-"], digits:1, numberTypes:["integer"]}],
  ["小2: 2桁+−",                     {count:20, types:["arithmetic"], ops:["+","-"], digits:2, numberTypes:["integer"]}],
  ["小2: 九九",                       {count:20, types:["arithmetic"], ops:["*"], digits:1, numberTypes:["integer"]}],
  ["小3: あまりあり",                 {count:20, types:["remainder_division"]}],
  ["小3: 3桁+−",                     {count:20, types:["arithmetic"], ops:["+","-"], digits:3, numberTypes:["integer"]}],
  ["小3: 3項四則",                    {count:20, types:["arithmetic"], ops:["+","-","*","/"], terms:3, digits:1, numberTypes:["integer"]}],
  ["小4: 小数+−",                    {count:20, types:["arithmetic"], ops:["+","-"], numberTypes:["decimal1"]}],
  ["小5: 真分数+−",                   {count:20, types:["arithmetic"], ops:["+","-"], numberTypes:["proper_fraction"]}],
  ["小6: 3項四則 2桁",                {count:20, types:["arithmetic"], ops:["+","-","*"], terms:3, digits:2, numberTypes:["integer"]}],
  ["混合: arith+remainder",           {count:30, types:["arithmetic","remainder_division"], ops:["+","-"], digits:2}],
  ["大量: 200問1桁",                  {count:200, types:["arithmetic"], ops:["+","-","*"], digits:1, allowDuplicates:true}],
  ["決定性: seed=42",                 {count:10, types:["arithmetic"], digits:2, seed:42, allowDuplicates:true}],
];

let allGood = true;
for (const [name, cfg] of scenarios) {
  const c = {seed:1, allowDuplicates:true, ...cfg};
  const t0 = performance.now();
  try {
    const {problems, meta} = generateSheet(c);
    const t1 = performance.now();
    // 答えが正しいか全問検証
    let wrong = 0;
    for (const p of problems) {
      if (p.type === "remainder_division") {
        const {dividend:a, divisor:b} = p.meta;
        if (a !== b*p.answer.quotient + p.answer.remainder) wrong++;
      } else {
        const re = evalNode(p.expr);
        if (p.answer.type === "int"     && re.n !== p.answer.value) wrong++;
        if (p.answer.type === "decimal" && (re.n !== p.answer.num || re.d !== p.answer.den)) wrong++;
        if (p.answer.type === "frac"    && (re.n !== p.answer.num || re.d !== p.answer.den)) wrong++;
      }
    }
    const status = wrong === 0 ? "✓" : "✗";
    if (wrong > 0) allGood = false;
    console.log(`${status} ${(t1-t0).toFixed(1).padStart(6)}ms  retries=${String(meta.totalRetries).padStart(3)}  [${name}] (${problems.length}問, ${wrong}誤)`);
    // 最初の1問だけ見本表示
    if (problems.length > 0) console.log(`       e.g. ${problems[0].question} → ${problems[0].answer.display}`);
  } catch (e) {
    console.log(`✗ ERROR [${name}]: ${e.message.slice(0,100)}`);
    allGood = false;
  }
}

console.log();
console.log(allGood ? "全シナリオ OK" : "失敗あり");
