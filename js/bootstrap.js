// js/bootstrap.js
// 全ての問題タイプをレジストリに登録。新しい問題を追加したらここにimport+registerを1行追加するだけ。

import { register } from "./registry.js";
import { AdditionProblem }       from "./problems/addition.js";
import { SubtractionProblem }    from "./problems/subtraction.js";
import { MultiplicationProblem } from "./problems/multiplication.js";
import { DivisionProblem }       from "./problems/division.js";
import { ArithmeticProblem }     from "./problems/arithmetic.js";
import { RemainderDivisionProblem } from "./problems/remainder.js";

register(AdditionProblem);
register(SubtractionProblem);
register(MultiplicationProblem);
register(DivisionProblem);
register(ArithmeticProblem);
register(RemainderDivisionProblem);
