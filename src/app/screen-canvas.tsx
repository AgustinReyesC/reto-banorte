"use client";

import { useEffect, useRef, useState } from "react";
import type { PlacedBlock } from "@/widgets/store";
import { renderUiComponent } from "@/ui-catalog/registry";
import { rectsOverlap, type GridRect } from "@/app/grid-layout";

const DEFAULT_GAP = 16;
const DEFAULT_ROW_HEIGHT = 108;
const MAX_H = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

interface DragState {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: PlacedBlock;
  preview: GridRect;
}

/**
 * Lienzo de una pantalla/widget: pinta bloques del catálogo en una grilla.
 * En modo `editable` permite arrastrar (mover) y redimensionar cada bloque,
 * rechazando posiciones que se traslapen.
 */
export function ScreenCanvas({
  blocks,
  cols,
  rowHeight = DEFAULT_ROW_HEIGHT,
  colWidth = "fill",
  gap = DEFAULT_GAP,
  editable = false,
  onChange,
  onAction,
}: {
  blocks: PlacedBlock[];
  cols: number;
  rowHeight?: number | "fill";
  /** Ancho de columna en px; "fill" reparte el ancho del contenedor. */
  colWidth?: number | "fill";
  gap?: number;
  editable?: boolean;
  onChange?: (blocks: PlacedBlock[]) => void;
  onAction?: (componentId: string, value?: unknown) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const blocksRef = useRef(blocks);
  const onChangeRef = useRef(onChange);

  blocksRef.current = blocks;
  onChangeRef.current = onChange;

  const dragging = drag !== null;
  const numericRowHeight = typeof rowHeight === "number" ? rowHeight : DEFAULT_ROW_HEIGHT;

  function startDrag(event: React.PointerEvent, block: PlacedBlock, mode: "move" | "resize") {
    if (!editable) return;
    event.preventDefault();
    event.stopPropagation();
    const next: DragState = {
      id: block.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      origin: block,
      preview: { x: block.x, y: block.y, w: block.w, h: block.h },
    };
    dragRef.current = next;
    setDrag(next);
  }

  useEffect(() => {
    if (!dragging) return;
    const grid = gridRef.current;

    function onMove(event: PointerEvent) {
      const current = dragRef.current;
      if (!current || !grid) return;
      const width = grid.getBoundingClientRect().width;
      const colWidth = (width - gap * (cols - 1)) / cols;
      const dCols = Math.round((event.clientX - current.startX) / (colWidth + gap));
      const dRows = Math.round((event.clientY - current.startY) / (numericRowHeight + gap));

      const preview: GridRect =
        current.mode === "move"
          ? {
              x: clamp(current.origin.x + dCols, 0, cols - current.origin.w),
              y: Math.max(0, current.origin.y + dRows),
              w: current.origin.w,
              h: current.origin.h,
            }
          : {
              x: current.origin.x,
              y: current.origin.y,
              w: clamp(current.origin.w + dCols, 1, cols - current.origin.x),
              h: clamp(current.origin.h + dRows, 1, MAX_H),
            };

      const next = { ...current, preview };
      dragRef.current = next;
      setDrag(next);
    }

    function onUp() {
      const current = dragRef.current;
      if (current) {
        const list = blocksRef.current;
        const others = list.filter((block) => block.id !== current.id);
        if (!others.some((block) => rectsOverlap(current.preview, block))) {
          onChangeRef.current?.(
            list.map((block) => (block.id === current.id ? { ...block, ...current.preview } : block))
          );
        }
      }
      dragRef.current = null;
      setDrag(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, gap, cols, numericRowHeight]);

  const rows = blocks.reduce((max, block) => Math.max(max, block.y + block.h), 0);

  return (
    <div
      ref={gridRef}
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns:
          colWidth === "fill" ? `repeat(${cols}, minmax(0, 1fr))` : `repeat(${cols}, ${colWidth}px)`,
        gridTemplateRows: rowHeight === "fill" ? `repeat(${rows}, minmax(0, 1fr))` : undefined,
        gridAutoRows: rowHeight === "fill" ? undefined : numericRowHeight,
        gap,
        width: colWidth === "fill" ? undefined : cols * colWidth + (cols - 1) * gap,
        height: rowHeight === "fill" ? "100%" : undefined,
        alignContent: "start",
        userSelect: dragging ? "none" : undefined,
      }}
    >
      {blocks.map((block) => {
        const rect = drag?.id === block.id ? drag.preview : block;
        const isDragging = drag?.id === block.id;
        return (
          <div
            key={block.id}
            style={{
              gridColumn: `${rect.x + 1} / span ${rect.w}`,
              gridRow: `${rect.y + 1} / span ${rect.h}`,
              position: "relative",
              minWidth: 0,
              minHeight: 0,
              containerType: "inline-size",
              opacity: isDragging ? 0.65 : 1,
            }}
          >
            {editable ? (
              <div
                onPointerDown={(event) => startDrag(event, block, "move")}
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 2,
                  borderRadius: 16,
                  border: "1.5px dashed var(--line)",
                  background: isDragging ? "var(--garnet-soft)" : "transparent",
                  cursor: "grab",
                  touchAction: "none",
                }}
              />
            ) : null}

            <div
              style={{
                height: "100%",
                minHeight: 0,
                overflow: "auto",
                pointerEvents: editable ? "none" : "auto",
              }}
            >
              {renderUiComponent(block.component, { onAction })}
            </div>

            {editable ? (
              <span
                onPointerDown={(event) => startDrag(event, block, "resize")}
                style={{
                  position: "absolute",
                  right: -6,
                  bottom: -6,
                  zIndex: 3,
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  border: "2px solid var(--surface)",
                  background: "var(--garnet)",
                  cursor: "nwse-resize",
                  touchAction: "none",
                }}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
