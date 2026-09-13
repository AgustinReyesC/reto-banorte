/**
 * Motor de grid del dashboard: posiciones (x, y) en celdas de un grid de
 * `cols` columnas, cada widget con su propio (w, h). Sin librería externa.
 */

export interface GridRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function rectsOverlap(a: GridRect, b: GridRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const MAX_SCAN_ROWS = 500;

/** Primer hueco libre (barrido fila por fila, de izquierda a derecha) que cabe sin traslape. */
export function findFirstOpenSpot(w: number, h: number, cols: number, placed: GridRect[]): { x: number; y: number } {
  for (let y = 0; y < MAX_SCAN_ROWS; y++) {
    for (let x = 0; x <= cols - w; x++) {
      const candidate: GridRect = { x, y, w, h };
      if (!placed.some((r) => rectsOverlap(candidate, r))) return { x, y };
    }
  }
  return { x: 0, y: MAX_SCAN_ROWS };
}

/**
 * Compacta el layout (gravedad vertical): sube cada item lo más posible sin
 * traslaparse, respetando su columna. Elimina huecos verticales para que el
 * acomodo se vea ordenado.
 */
export function compactLayout(
  layout: Record<string, GridRect>,
  ids: string[]
): Record<string, GridRect> {
  const ordered = [...ids].sort((a, b) => {
    const rectA = layout[a];
    const rectB = layout[b];
    if (!rectA || !rectB) return 0;
    return rectA.y - rectB.y || rectA.x - rectB.x;
  });

  const placed: GridRect[] = [];
  const result: Record<string, GridRect> = {};

  for (const id of ordered) {
    const rect = layout[id];
    if (!rect) continue;

    let y = rect.y;
    while (y > 0) {
      const candidate: GridRect = { ...rect, y: y - 1 };
      if (placed.some((other) => rectsOverlap(candidate, other))) break;
      y -= 1;
    }

    const next: GridRect = { ...rect, y };
    placed.push(next);
    result[id] = next;
  }

  return result;
}

/**
 * Resuelve la posición final de cada item: respeta la posición guardada si
 * sigue cabiendo sin traslape; si no (widget nuevo, o choque tras cambiar de
 * tamaño), lo acomoda en el primer hueco libre. Los items se procesan en
 * orden, así que el orden de `items` es también la prioridad de colocación.
 */
export function resolveLayout<T extends { id: string; w: number; h: number }>(
  items: T[],
  saved: Record<string, { x: number; y: number }>,
  cols: number
): Record<string, GridRect> {
  const placed: GridRect[] = [];
  const result: Record<string, GridRect> = {};

  for (const item of items) {
    const savedPos = saved[item.id];
    let rect: GridRect | null = null;

    if (savedPos) {
      const candidate: GridRect = { x: savedPos.x, y: savedPos.y, w: item.w, h: item.h };
      const inBounds = candidate.x >= 0 && candidate.x + candidate.w <= cols && candidate.y >= 0;
      if (inBounds && !placed.some((r) => rectsOverlap(candidate, r))) rect = candidate;
    }

    if (!rect) {
      const spot = findFirstOpenSpot(item.w, item.h, cols, placed);
      rect = { ...spot, w: item.w, h: item.h };
    }

    placed.push(rect);
    result[item.id] = rect;
  }

  return result;
}
