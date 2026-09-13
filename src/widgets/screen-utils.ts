import type { AgentScreen, UiComponent } from "@/schemas/ui-catalog";
import { resolveLayout } from "@/app/grid-layout";
import type { PlacedBlock } from "@/widgets/store";

export const SCREEN_COLS = 8;
export const SCREEN_MAX_H = 6;

/** Ancho/alto mínimo por tipo para que los elementos no salgan angostos ni recortados. */
const MIN_WIDTH_BY_TYPE: Partial<Record<UiComponent["type"], number>> = {
  kpi_card: 2,
  alert_card: 2,
  progress_tracker: 4,
  trend_chart: 4,
  breakdown_chart: 4,
  scenario_comparison: 4,
  summary_table: 4,
  timeline: 4,
  slider: 3,
  number_input_dialog: 3,
  choice_dialog: 3,
  confirmation_dialog: 3,
  cta_button: 2,
};

const MIN_HEIGHT_BY_TYPE: Partial<Record<UiComponent["type"], number>> = {
  trend_chart: 2,
  breakdown_chart: 2,
  scenario_comparison: 2,
  summary_table: 2,
  timeline: 2,
};

/**
 * Convierte los bloques que propone el agente en bloques colocados en la
 * grilla. El "scale" de la pantalla multiplica w y h de todos los bloques por
 * el mismo factor, de modo que el tamaño cambia sin deformar la proporción.
 */
export function screenToBlocks(screen: AgentScreen): PlacedBlock[] {
  const scale = screen.scale;
  const seeded: PlacedBlock[] = screen.blocks.map((block) => {
    const minWidth = MIN_WIDTH_BY_TYPE[block.component.type] ?? 1;
    const minHeight = MIN_HEIGHT_BY_TYPE[block.component.type] ?? 1;
    return {
      id: block.id,
      component: block.component,
      w: Math.min(Math.max(Math.round(block.w * scale), minWidth), SCREEN_COLS),
      h: Math.min(Math.max(Math.round(block.h * scale), minHeight), SCREEN_MAX_H),
      x: 0,
      y: 0,
    };
  });
  // Sin rellenar: el widget se ajusta al ancho que realmente usa su contenido.
  return packBlocks(seeded, SCREEN_COLS, false);
}

/**
 * Ajusta el layout del widget a un número de columnas (las que ocupa el tile):
 * reempaqueta los bloques en esa cantidad de columnas para que las celdas
 * conserven su ancho (~1 columna del dashboard) y no se compriman.
 */
export function layoutWidget(
  blocks: PlacedBlock[],
  targetCols: number
): { cols: number; blocks: PlacedBlock[]; rows: number } {
  const cols = Math.min(Math.max(Math.round(targetCols), 1), SCREEN_COLS);
  const packed = packBlocks(
    blocks.map((block) => ({ ...block, w: Math.min(block.w, cols) })),
    cols
  );
  const rows = packed.reduce((max, block) => Math.max(max, block.y + block.h), 0);
  return { cols, blocks: packed, rows };
}

/**
 * Empaqueta los bloques en filas que llenan el ancho disponible y con alturas
 * uniformes. Es la red de seguridad para que el widget siempre tenga un
 * acomodo ordenado aunque el agente no siga los patrones al pie de la letra.
 * Asume que los bloques vienen en orden de fila (izq→der, arriba→abajo).
 */
export function packBlocks(blocks: PlacedBlock[], cols: number, fill = true): PlacedBlock[] {
  const rows: PlacedBlock[][] = [];
  let current: PlacedBlock[] = [];
  let currentWidth = 0;

  for (const block of blocks) {
    const w = Math.min(Math.max(block.w, 1), cols);
    if (current.length > 0 && currentWidth + w > cols) {
      rows.push(current);
      current = [];
      currentWidth = 0;
    }
    current.push({ ...block, w });
    currentWidth += w;
    if (currentWidth >= cols) {
      rows.push(current);
      current = [];
      currentWidth = 0;
    }
  }
  if (current.length > 0) rows.push(current);

  const result: PlacedBlock[] = [];
  let y = 0;

  for (const row of rows) {
    // Reparte el espacio sobrante para que la fila llene el ancho.
    const widths = row.map((block) => block.w);
    let leftover = fill ? cols - widths.reduce((sum, w) => sum + w, 0) : 0;
    let index = 0;
    while (leftover > 0 && widths.length > 0) {
      const position = index % widths.length;
      if ((widths[position] ?? cols) < cols) {
        widths[position] = (widths[position] ?? 0) + 1;
        leftover -= 1;
      }
      index += 1;
      if (index > cols * widths.length) break;
    }

    const rowHeight = row.reduce((max, block) => Math.max(max, block.h), 1);
    let x = 0;
    row.forEach((block, i) => {
      const w = widths[i] ?? block.w;
      result.push({ ...block, x, y, w, h: rowHeight });
      x += w;
    });
    y += rowHeight;
  }

  return result;
}

/**
 * Recorta los márgenes vacíos del widget y devuelve el ancho en columnas que
 * realmente usa su contenido (para que no ocupe todo el contenedor padre).
 */
export function trimBlocks(blocks: PlacedBlock[]): { cols: number; blocks: PlacedBlock[] } {
  const minX = blocks.reduce((min, block) => Math.min(min, block.x), Number.POSITIVE_INFINITY);
  const minY = blocks.reduce((min, block) => Math.min(min, block.y), Number.POSITIVE_INFINITY);
  const normalized = blocks.map((block) => ({ ...block, x: block.x - minX, y: block.y - minY }));
  const cols = normalized.reduce((max, block) => Math.max(max, block.x + block.w), 1);
  return { cols, blocks: normalized };
}

/**
 * Fusiona una pantalla nueva del agente con la disposición ya guardada del
 * widget: conserva la posición/tamaño de los bloques con el mismo id (para no
 * perder lo que el usuario organizó) y auto-acomoda los bloques nuevos.
 */
export function mergeBlocks(existing: PlacedBlock[], incoming: PlacedBlock[]): PlacedBlock[] {
  const byId = new Map(existing.map((block) => [block.id, block]));
  const saved: Record<string, { x: number; y: number }> = {};

  const merged = incoming.map((block) => {
    const previous = byId.get(block.id);
    if (!previous) return block;
    saved[block.id] = { x: previous.x, y: previous.y };
    return { ...block, x: previous.x, y: previous.y, w: previous.w, h: previous.h };
  });

  const layout = resolveLayout(merged, saved, SCREEN_COLS);
  return merged.map((block) => ({ ...block, ...layout[block.id] }));
}
