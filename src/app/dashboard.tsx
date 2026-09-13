"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderAgentComponent } from "@/ui-catalog/registry";
import { A2uiSurfaceView } from "@/a2ui/render";
import { blocksToSurface } from "@/a2ui/surface";
import { useWidgets } from "@/widgets/use-widgets";
import { loadWidgets, type SavedWidget } from "@/widgets/store";
import { screenToBlocks, trimBlocks, mergeBlocks } from "@/widgets/screen-utils";
import type { AgentScreen, ChatTurn } from "@/schemas/ui-catalog";
import { CardDetailsTile, BalanceTile, QuickActionsTile, type DashboardData } from "@/app/dashboard-widgets";
import { resolveLayout, rectsOverlap, type GridRect } from "@/app/grid-layout";

const POSITIONS_STORAGE_KEY = "banorte-dashboard-positions";
const SIZES_STORAGE_KEY = "banorte-dashboard-sizes";
const COLS = 8;
const COL_WIDTH = 112;
const ROW_HEIGHT = 108;
const REFRESH_INTERVAL_MS = 60_000;
const REFRESH_MESSAGE =
  "Actualiza los datos de este widget manteniendo el mismo diseño y los mismos bloques.";
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

function Spinner({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height: "100%",
        color: "var(--ink-soft)",
        fontSize: 13,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          border: "3px solid var(--line)",
          borderTopColor: "var(--garnet)",
          animation: "agent-spin 0.8s linear infinite",
        }}
      />
      {label ? <span>{label}</span> : null}
    </div>
  );
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
  compact = false,
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
  compact?: boolean;
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
        padding: compact ? 12 : 18,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: compact ? 8 : 12, flexShrink: 0 }}>
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
  const { widgets, upsert, remove } = useWidgets();
  const [editMode, setEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewBox, setPreviewBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [savedSizes, setSavedSizes] = useState<Record<string, { w: number; h: number }>>({});
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; rect: GridRect } | null>(null);
  const [resizeDraft, setResizeDraft] = useState<{ id: string; w: number; h: number } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adaptingId, setAdaptingId] = useState<string | null>(null);
  const hasLoaded = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<Record<string, GridRect>>({});
  const resizeDraftRef = useRef<{ id: string; w: number; h: number } | null>(null);
  const refreshingRef = useRef(false);

  /**
   * Reutiliza el agente para que el widget sea interactivo: reenvía el evento
   * (o un mensaje de refresco) con el historial guardado y reemplaza el widget
   * con la pantalla que devuelve el agente.
   */
  const runWidgetTurn = useCallback(
    async (
      widget: SavedWidget,
      body: { message: string } | { event: { componentId: string; value?: unknown } },
      options?: { requireExportable?: boolean; replaceLayout?: boolean }
    ) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId: widget.usuarioId, history: widget.history, ...body }),
      });
      const data = (await response.json()) as {
        response?: AgentScreen;
        history?: ChatTurn[];
        error?: string;
      };
      if (!response.ok || !data.response || !data.history) {
        throw new Error(data.error ?? "No se pudo actualizar el widget.");
      }
      // Un refresco no debe reemplazar el widget con un aviso o error.
      if (options?.requireExportable && !data.response.exportable) return;
      // Al adaptar el tamaño queremos el layout nuevo del agente, no conservar
      // la disposición anterior.
      const placed = screenToBlocks(data.response);
      const { cols, blocks } = trimBlocks(
        options?.replaceLayout ? placed : mergeBlocks(widget.blocks, placed)
      );
      upsert({
        widgetId: widget.widgetId,
        title: data.response.title,
        cols,
        blocks,
        usuarioId: widget.usuarioId,
        history: data.history,
        refreshable: data.response.refreshable,
      });
      // Respetamos el tamaño que el usuario eligió: solo lo calculamos la
      // primera vez que aparece el widget (o si nunca se redimensionó).
      setSavedSizes((current) => {
        if (current[widget.widgetId]) return current;
        const rows = blocks.reduce((max, block) => Math.max(max, block.y + block.h), 0) + 1;
        const next = { ...current, [widget.widgetId]: { w: cols, h: rows } };
        window.localStorage.setItem(SIZES_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [upsert]
  );

  const runWidgetTurnRef = useRef(runWidgetTurn);
  runWidgetTurnRef.current = runWidgetTurn;

  async function handleWidgetAction(widget: SavedWidget, componentId: string, value?: unknown) {
    setBusyId(widget.widgetId);
    try {
      await runWidgetTurn(widget, { event: { componentId, value } });
    } catch (error) {
      console.error("Acción del widget falló:", error);
    } finally {
      setBusyId(null);
    }
  }

  async function refreshWidget(widget: SavedWidget) {
    setBusyId(widget.widgetId);
    try {
      await runWidgetTurn(widget, { message: REFRESH_MESSAGE }, { requireExportable: true });
    } catch (error) {
      console.error("Refresco del widget falló:", error);
    } finally {
      setBusyId(null);
    }
  }

  /**
   * Cuando el usuario cambia el tamaño del widget, no lo escalamos: le pedimos
   * al agente (A2UI) que regenere la misma información adaptada a ese tamaño.
   */
  async function adaptWidgetSize(widget: SavedWidget, w: number, h: number) {
    setBusyId(widget.widgetId);
    setAdaptingId(widget.widgetId);
    try {
      await runWidgetTurn(
        widget,
        {
          message: `Adapta este widget a un tamaño de ${w} columnas de ancho por ${h} filas de alto, manteniendo exactamente la misma información y datos.`,
        },
        { requireExportable: true, replaceLayout: true }
      );
    } catch (error) {
      console.error("Adaptación de tamaño falló:", error);
    } finally {
      setBusyId(null);
      setAdaptingId(null);
    }
  }

  const adaptWidgetSizeRef = useRef(adaptWidgetSize);
  adaptWidgetSizeRef.current = adaptWidgetSize;

  // Actualización automática de los widgets que dependen de datos.
  useEffect(() => {
    const interval = window.setInterval(async () => {
      if (refreshingRef.current || document.hidden) return;
      refreshingRef.current = true;
      try {
        for (const widget of loadWidgets()) {
          if (!widget.refreshable || widget.history.length === 0) continue;
          await runWidgetTurnRef.current(widget, { message: REFRESH_MESSAGE }, { requireExportable: true });
        }
      } catch (error) {
        console.error("Auto-refresh de widgets falló:", error);
      } finally {
        refreshingRef.current = false;
      }
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

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
        return {
          id: w.widgetId,
          w: saved?.w ?? w.cols,
          h: saved?.h ?? widgetRows(w.blocks),
        };
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
          // Le pedimos al agente que regenere el widget adaptado a ese tamaño.
          const widget = loadWidgets().find((item) => item.widgetId === active.id);
          if (widget) void adaptWidgetSizeRef.current(widget, draft.w, draft.h);
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
                  {summaryComponents.map((c, index) => (
                    <div key={index} style={{ containerType: "inline-size", minWidth: 0 }}>
                      {renderAgentComponent(c)}
                    </div>
                  ))}
                </div>
              </Tile>
            );
          }

          const widget = widgetsById.get(item.id);
          if (!widget) return null;
          return (
            <Tile
              key={item.id}
              {...tileProps}
              title={widget.title}
              onResizeStart={startResize}
              compact
              headerAction={
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {widget.refreshable ? (
                    <button
                      type="button"
                      onClick={() => void refreshWidget(widget)}
                      disabled={busyId === widget.widgetId}
                      style={{
                        background: "none",
                        border: "none",
                        color: busyId === widget.widgetId ? "var(--ink-faint)" : "var(--garnet)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: busyId === widget.widgetId ? "default" : "pointer",
                      }}
                    >
                      {busyId === widget.widgetId ? "Actualizando…" : "Actualizar"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(widget.widgetId)}
                    style={{ background: "none", border: "none", color: "var(--ink-faint)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Quitar
                  </button>
                </div>
              }
            >
              <div style={{ height: "100%", minHeight: 0, overflow: "hidden" }}>
                {adaptingId === widget.widgetId ? (
                  <Spinner label="Ajustando al nuevo tamaño…" />
                ) : (
                  <A2uiSurfaceView
                    surface={blocksToSurface(widget.widgetId, widget.cols, widget.blocks)}
                    rowHeight="fill"
                    onAction={(componentId, value) => void handleWidgetAction(widget, componentId, value)}
                  />
                )}
              </div>
            </Tile>
          );
        })}
        </div>
      </div>
    </div>
  );
}
