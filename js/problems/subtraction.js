// js/problems/subtraction.js
import { num, op } from "../core/Evaluator.js";
import { rangeForDigits, buildProblem } from "./_helpers.js";

export const SubtractionProblem = {
  id: "subtraction",
  generate(config, rng) {
    const [min, max] = rangeForDigits(config.digits ?? 1);
    let a = rng.int(min, max);
    let b = rng.int(min, max);
    if (a < b) [a, b] = [b, a]; // 負数禁止保証
    return buildProblem("subtraction", op("-", num(a), num(b)));
  },
};
