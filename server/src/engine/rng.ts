// ============================================================
// Seeded pseudo-random number generator (mulberry32).
// Deterministic and reproducible: same seed → same sequence.
// Every stochastic decision in the engine flows through here so
// a match can be replayed bit-for-bit from its stored seed.
// ============================================================

export class Rng {
  private state: number;

  constructor(seed: number) {
    // force to uint32
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** True with probability p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Pick one element. */
  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** Approx. standard normal via sum of uniforms (Irwin–Hall, n=6). */
  gaussian(mean = 0, sd = 1): number {
    let s = 0;
    for (let i = 0; i < 6; i++) s += this.next();
    return mean + (s - 3) * sd;
  }

  /** Poisson sample (Knuth) for match goal counts. */
  poisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= this.next();
    } while (p > L);
    return k - 1;
  }
}

/** Deterministically derive a numeric seed from any strings/numbers. */
export function makeSeed(...parts: (string | number)[]): number {
  let h = 2166136261 >>> 0; // FNV-1a
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
