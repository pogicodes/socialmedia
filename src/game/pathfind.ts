/** A* on a 4-connected tile grid with per-tile cost (≥1). Returns tile path (excluding start) or null. */
export function findPath(
  blocked: (x: number, y: number) => boolean,
  cost: (x: number, y: number) => number,
  w: number,
  h: number,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): { x: number; y: number }[] | null {
  if (blocked(tx, ty)) return null;
  const key = (x: number, y: number) => y * w + x;
  const open = new Map<number, { x: number; y: number; g: number; f: number }>();
  const came = new Map<number, number>();
  const g = new Map<number, number>();
  const hdist = (x: number, y: number) => Math.abs(x - tx) + Math.abs(y - ty);

  open.set(key(sx, sy), { x: sx, y: sy, g: 0, f: hdist(sx, sy) });
  g.set(key(sx, sy), 0);
  const closed = new Set<number>();
  let guard = 0;

  while (open.size && guard++ < 5000) {
    let best: { x: number; y: number; g: number; f: number } | null = null;
    for (const n of open.values()) if (!best || n.f < best.f) best = n;
    const cur = best!;
    const ck = key(cur.x, cur.y);
    if (cur.x === tx && cur.y === ty) {
      const path: { x: number; y: number }[] = [];
      let k: number | undefined = ck;
      while (k !== undefined && k !== key(sx, sy)) {
        path.unshift({ x: k % w, y: Math.floor(k / w) });
        k = came.get(k);
      }
      return path;
    }
    open.delete(ck);
    closed.add(ck);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || blocked(nx, ny)) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = cur.g + cost(nx, ny);
      if (ng < (g.get(nk) ?? Infinity)) {
        g.set(nk, ng);
        came.set(nk, ck);
        open.set(nk, { x: nx, y: ny, g: ng, f: ng + hdist(nx, ny) });
      }
    }
  }
  return null;
}
