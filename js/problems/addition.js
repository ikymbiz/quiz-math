// js/problems/addition.js
import { num, op } from "../core/Evaluator.js";
import { rangeForDigits, buildProblem } from "./_helpers.js";

export const AdditionProblem = {
  id: "addition",
  generate(config, rng) {
    const [min, max] = rangeForDigits(config.digits ?? 1);
    const a = rng.int(min, max);
    const b = rng.int(min, max);
    return buildProblem("addition", op("+", num(a), num(b)));
  },
};
