// js/registry.js
// 問題タイプのレジストリ。JSを追加してregister()するだけで拡張可能。

const registry = new Map();

export function register(problemType) {
  if (!problemType.id) throw new Error("problemType.id required");
  if (typeof problemType.generate !== "function") {
    throw new Error("problemType.generate required");
  }
  registry.set(problemType.id, problemType);
}

export function generate(id, config, rng) {
  const pt = registry.get(id);
  if (!pt) throw new Error("unknown problem type: " + id);
  return pt.generate(config, rng);
}

export function listTypes() { return [...registry.keys()]; }
export function has(id) { return registry.has(id); }
