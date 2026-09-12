"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderAgentComponent } from "@/ui-catalog/registry";
import { ScreenCanvas } from "@/app/screen-canvas";
import { useWidgets } from "@/widgets/use-widgets";
import { CardDetailsTile, BalanceTile, QuickActionsTile, type DashboardData } from "@/app/dashboard-widgets";
import { resolveLayout, rectsOverlap, type GridRect } from "@/app/grid-layout";

const POSITIONS_STORAGE_KEY = "banorte-dashboard-positions";
const SIZES_STORAGE_KEY = "banorte-dashboard-sizes";
const COLS = 8;
const COL_WIDTH = 112;
const ROW_HEIGHT = 108;
const GAP = 16;

interface GridItem {
  id: string;
  w: number;
  h: number;
}

/**
 * Filas que ocupa un widget exportado. Suma una fila extra para el
 * encabezado y el padding del tile: sin ese margen la grilla interna se
 * comprime y los componentes (las tarjetas) se recortan.
 */
function widgetRows(blocks: { y: number; h: number }[]): number {
  const contentRows = blocks.reduce((max, block) => Math.max(max, block.y + block.h), 1);
  return contentRows + 1;
}

function DragHandle() {
  return (
    <span aria-hidden style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, color: "var(--ink-faint)", cursor: "grab", flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="3" r="1.3" />
        <circle cx="11" cy="3" r="1.3" />
        <circle cx="5" cy="8" r="1.3" />
        <circle cx="11" cy="8" r="1.3" />
        <circle cx="5" cy="13" r="1.3" />
        <circle cx="11" cy="13" r="1.3" />
      </svg>
    </span>
  );
}

function Tile({
  id,
  rect,
  title,
  headerAction,
  editMode,
  isDragged,
  isResizing,
  onDragStart,
  onDragEnd,
  onResizeStart,
  children,
}: {
  id: string;
  rect: GridRect;
  title?: string;
  headerAction?: React.ReactNode;
  editMode: boolean;
  isDragged: boolean;
  isResizing?: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onResizeStart?: (event: React.PointerEvent, id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable={editMode && !isResizing}
      onDragStart={() => onDragStart(id)}
      onDragEnd={onDragEnd}
      style={{
        position: "relative",
        gridColumn: `${rect.x + 1} / span ${rect.w}`,
        gridRow: `${rect.y + 1} / span ${rect.h}`,
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 1px 2px rgba(38, 22, 26, 0.04)",
        outline: editMode ? "1.5px dashed var(--line)" : "none",
        outlineOffset: -6,
        opacity: isDragged ? 0.35 : 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        transition: "opacity 120ms ease",
      }}
    >
      {editMode || title ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {editMode ? <DragHandle /> : null}
            {title ? <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{title}</span> : null}
          </div>
          {!editMode ? headerAction : null}
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
      {editMode && onResizeStart ? (
        <span
          draggable={false}
          onPointerDown={(event) => onResizeStart(event, id)}
          aria-label="Redimensionar"
          style={{
            position: "absolute",
            right: -7,
            bottom: -7,
            width: 20,
            height: 20,
            borderRadius: 6,
            border: "2px solid var(--surface)",
            background: "var(--garnet)",
            cursor: "nwse-resize",
            touchAction: "none",
            zIndex: 2,
          }}
        />
      ) : null}
    </div>
  );
}

export function Dashboard({ dashboardData, onStartGoal }: { dashboardData: DashboardData; onStartGoal: () => void }) {
  const { widgets, remove } = useWidgets();
  const [editMode, setEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewBox, setPreviewBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [savedSizes, setSavedSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; rect: GridRect } | null>(null);
  const [resizeDraft, setResizeDraft] = useState<{ id: string; w: number; h: number } | null>(null);
  const hasLoaded = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<Record<string, GridRect>>({});
  const resizeDraftRef = useRef<{ id: string; w: number; h: number } | null>(null);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    try {
      const rawPositions = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
      if (rawPositions) setSavedPositions(JSON.parse(rawPositions));
      const rawSizes = window.localStorage.getItem(SIZES_STORAGE_KEY);
      if (rawSizes) setSavedSizes(JSON.parse(rawSizes));
    } catch {
      // localStorage corrupto: seguimos con posiciones/tamaños vacíos (auto-acomodo)
    }
  }, []);

  const capacidadAhorro = Math.max(0, dashboardData.ingresoMensualPromedio - dashboardData.gastoMensualPromedio);

  const items: GridItem[] = useMemo(
    () => [
      { id: "card", w: 4, h: 2 },
      { id: "balance", w: 2, h: 2 },
      { id: "quick-actions", w: 2, h: 2 },
      { id: "summary", w: 4, h: 1 },
      ...widgets.map((w) => {
        const saved = savedSizes[w.widgetId];
        return { id: w.widgetId, w: saved?.w ?? w.cols, h: saved?.h ?? widgetRows(w.blocks) };
      }),
    ],
    [widgets, savedSizes]
  );

  const layout = useMemo(() => {
    const resolved = resolveLayout(items, savedPositions, COLS);
    // Mientras se redimensiona, fijamos el tile en su posición original y
    // mostramos el tamaño borrador; los demás tiles no se mueven.
    if (resizing && resizeDraft) {
      resolved[resizing.id] = {
        x: resizing.rect.x,
        y: resizing.rect.y,
        w: resizeDraft.w,
        h: resizeDraft.h,
      };
    }
    return resolved;
  }, [items, savedPositions, resizing, resizeDraft]);

  layoutRef.current = layout;
  resizeDraftRef.current = resizeDraft;

  function startResize(event: React.PointerEvent, id: string) {
    const rect = layoutRef.current[id];
    if (!rect) return;
    event.preventDefault();
    event.stopPropagation();
    setResizing({ id, startX: event.clientX, startY: event.clientY, rect });
    setResizeDraft({ id, w: rect.w, h: rect.h });
  }

  useEffect(() => {
    if (!resizing) return;
    const active = resizing;

    function onMove(event: PointerEvent) {
      const box = gridRef.current?.getBoundingClientRect();
      if (!box) return;
      const colWidth = (box.width - GAP * (COLS - 1)) / COLS;
      const dCols = Math.round((event.clientX - active.startX) / (colWidth + GAP));
      const dRows = Math.round((event.clientY - active.startY) / (ROW_HEIGHT + GAP));
      // Ancho y alto se ajustan de forma independiente.
      const w = Math.min(Math.max(active.rect.w + dCols, 1), COLS - active.rect.x);
      const h = Math.max(active.rect.h + dRows, 1);
      setResizeDraft({ id: active.id, w, h });
    }

    function onUp() {
      const draft = resizeDraftRef.current;
      if (draft) {
        const candidate: GridRect = { x: active.rect.x, y: active.rect.y, w: draft.w, h: draft.h };
        const others = Object.entries(layoutRef.current)
          .filter(([id]) => id !== active.id)
          .map(([, rect]) => rect);
        if (!others.some((rect) => rectsOverlap(candidate, rect))) {
          setSavedSizes((current) => {
            const next = { ...current, [active.id]: { w: draft.w, h: draft.h } };
            window.localStorage.setItem(SIZES_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
        }
      }
      resizeDraftRef.current = null;
      setResizeDraft(null);
      setResizing(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizing]);

  /** Convierte una posición de mouse a celda (x, y), y de paso regresa la
   *  medida en px de columna del grid en ese momento (para dibujar la vista
   *  previa exactamente donde caerá el widget, gaps incluidos). */
  function cellFromPointer(clientX: number, clientY: number, w: number): { x: number; y: number; colWidth: number } {
    const box = gridRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0, colWidth: 0 };
    const colWidth = (box.width - GAP * (COLS - 1)) / COLS;
    const rawCol = Math.round((clientX - box.left) / (colWidth + GAP));
    const rawRow = Math.round((clientY - box.top) / (ROW_HEIGHT + GAP));
    return {
      x: Math.min(Math.max(rawCol, 0), COLS - w),
      y: Math.max(rawRow, 0),
      colWidth,
    };
  }

  function handleGridDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (!draggedId) return;
    const dragged = items.find((i) => i.id === draggedId);
    if (!dragged) return;
    const { x, y, colWidth } = cellFromPointer(e.clientX, e.clientY, dragged.w);
    setPreviewBox({
      left: x * (colWidth + GAP),
      top: y * (ROW_HEIGHT + GAP),
      width: dragged.w * colWidth + (dragged.w - 1) * GAP,
      height: dragged.h * ROW_HEIGHT + (dragged.h - 1) * GAP,
    });
  }

  function handleGridDrop(e: React.DragEvent) {
    e.preventDefault();
    if (!draggedId) return;
    const dragged = items.find((i) => i.id === draggedId);
    if (dragged) {
      const { x, y } = cellFromPointer(e.clientX, e.clientY, dragged.w);
      const candidate: GridRect = { x, y, w: dragged.w, h: dragged.h };
      const others = Object.entries(layout).filter(([id]) => id !== draggedId).map(([, r]) => r);
      const valid = !others.some((r) => rectsOverlap(candidate, r));
      if (valid) {
        setSavedPositions((current) => {
          const next = { ...current, [draggedId]: { x, y } };
          window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next));
          return next;
        });
      }
    }
    setDraggedId(null);
    setPreviewBox(null);
  }

  const widgetsById = new Map(widgets.map((w) => [w.widgetId, w]));

  const summaryComponents = [
    { type: "kpi_card" as const, label: "Ingreso mensual promedio", value: dashboardData.ingresoMensualPromedio.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }), helpText: "Últimos 12 meses" },
    { type: "kpi_card" as const, label: "Gasto mensual promedio", value: dashboardData.gastoMensualPromedio.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }), helpText: "Últimos 12 meses" },
    { type: "kpi_card" as const, label: "Capacidad de ahorro", value: capacidadAhorro.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }), helpText: "Ingreso − gasto" },
  ];

  function clearDrag() {
    setDraggedId(null);
    setPreviewBox(null);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: 0 }}>Inicio</h1>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          style={{
            background: editMode ? "var(--garnet)" : "var(--surface)",
            color: editMode ? "#fff" : "var(--ink)",
            border: `1px solid ${editMode ? "var(--garnet)" : "var(--line)"}`,
            borderRadius: 10,
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {editMode ? "Listo" : "Modificar"}
        </button>
      </div>

      {editMode ? (
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: -10, marginBottom: 18 }}>
          Arrastra un widget para moverlo y usa la esquina inferior derecha para cambiar su tamaño.
        </p>
      ) : null}

      <div style={{ overflowX: "auto", paddingBottom: 4 }}>
        <div
          ref={gridRef}
          onDragOver={handleGridDragOver}
          onDrop={handleGridDrop}
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, ${COL_WIDTH}px)`,
            gridAutoRows: ROW_HEIGHT,
            gap: GAP,
            width: COLS * COL_WIDTH + (COLS - 1) * GAP,
          }}
        >
        {editMode && previewBox ? (
          <div
            aria-hidden
            style={{
              position: "absolute",
              zIndex: 0,
              left: previewBox.left,
              top: previewBox.top,
              width: previewBox.width,
              height: previewBox.height,
              borderRadius: 16,
              border: "2px dashed var(--garnet)",
              background: "var(--garnet-soft)",
              opacity: 0.6,
              pointerEvents: "none",
            }}
          />
        ) : null}

        {items.map((item) => {
          const rect = layout[item.id];
          if (!rect) return null;
          const tileProps = {
            id: item.id,
            rect,
            editMode,
            isDragged: draggedId === item.id,
            isResizing: resizing?.id === item.id,
            onDragStart: setDraggedId,
            onDragEnd: clearDrag,
          };

          if (item.id === "card") {
            return (
              <Tile key={item.id} {...tileProps} title="Tu tarjeta">
                <CardDetailsTile holderName={dashboardData.usuarioNombre} />
              </Tile>
            );
          }
          if (item.id === "balance") {
            return (
              <Tile key={item.id} {...tileProps}>
                <BalanceTile saldo={dashboardData.saldo} capacidadAhorro={capacidadAhorro} />
              </Tile>
            );
          }
          if (item.id === "quick-actions") {
            return (
              <Tile key={item.id} {...tileProps}>
                <QuickActionsTile onStartGoal={onStartGoal} />
              </Tile>
            );
          }
          if (item.id === "summary") {
            return (
              <Tile key={item.id} {...tileProps} title="Resumen del mes">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, height: "100%" }}>
                  {summaryComponents.map((c) => renderAgentComponent(c))}
                </div>
              </Tile>
            );
          }

          const widget = widgetsById.get(item.id);
          if (!widget) return null;
          const saved = savedSizes[widget.widgetId];
          const widgetScaleY = saved ? saved.h / widgetRows(widget.blocks) : 1;
          return (
            <Tile
              key={item.id}
              {...tileProps}
              title={widget.title}
              onResizeStart={startResize}
              headerAction={
                <button
                  type="button"
                  onClick={() => remove(widget.widgetId)}
                  style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Quitar
                </button>
              }
            >
              <div style={{ height: "100%", minHeight: 0, overflow: "auto" }}>
                <ScreenCanvas
                  blocks={widget.blocks}
                  cols={widget.cols}
                  rowHeight={ROW_HEIGHT * widgetScaleY}
                  editable={false}
                />
              </div>
            </Tile>
          );
        })}
        </div>
      </div>
    </div>
  );
}
