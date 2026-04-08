// js/core/Frac.js
// 有理数クラス。コンストラクタで常にGCD約分する。float禁止。

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

export class Frac {
  constructor(num, den = 1) {
    if (!Number.isInteger(num) || !Number.isInteger(den)) {
      throw new Error(`Frac requires integers: ${num}/${den}`);
    }
    if (den === 0) throw new Error("Frac: division by zero");
    if (den < 0) { num = -num; den = -den; }
    const g = gcd(num, den);
    this.n = num / g;
    this.d = den / g;
  }

  static from(x) { return x instanceof Frac ? x : new Frac(x); }

  add(o) { o = Frac.from(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { o = Frac.from(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { o = Frac.from(o); return new Frac(this.n * o.n, this.d * o.d); }
  div(o) {
    o = Frac.from(o);
    if (o.n === 0) throw new Error("Frac: divide by zero");
    return new Frac(this.n * o.d, this.d * o.n);
  }

  eq(o) { o = Frac.from(o); return this.n === o.n && this.d === o.d; }
  isInt() { return this.d === 1; }
  isZero() { return this.n === 0; }
  sign() { return Math.sign(this.n); }

  toString() { return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`; }
}
