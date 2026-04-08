// js/core/SeedRandom.js
// seed固定で再現可能な乱数。Math.randomは一切使わない。

export class SeedRandom {
  constructor(seed = 1) {
    this.seed = (seed >>> 0) || 1; // 0はxorshiftで詰むので1に
  }

  next() {
    let x = this.seed;
    x ^= x << 13; x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5; x >>>= 0;
    this.seed = x >>> 0;
    return this.seed / 0xFFFFFFFF;
  }

  int(min, max) {
    // [min, max] inclusive
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick(arr) { return arr[this.int(0, arr.length - 1)]; }
}
