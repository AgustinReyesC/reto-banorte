"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderAgentComponent } from "@/ui-catalog/registry";
import { A2uiSurfaceView } from "@/a2ui/render";
import { blocksToSurface } from "@/a2ui/surface";
import { useWidgets } from "@/widgets/use-widgets";
import { loadWidgets, type SavedWidget } from "@/widgets/store";
import { screenToBlocks, trimBlocks, mergeBlocks, layoutWidget } from "@/widgets/screen-utils";
import type { AgentScreen, ChatTurn } from "@/schemas/ui-catalog";
import { CardDetailsTile, BalanceTile, QuickActionsTile, type DashboardData } from "@/app/dashboard-widgets";
import { resolveLayout, compactLayout, rectsOverlap, type GridRect } from "@/app/grid-layout";
import { WidgetPicker } from "@/app/widget-picker";

const POSITIONS_STORAGE_KEY = "banorte-dashboard-positions";
const SIZES_STORAGE_KEY = "banorte-dashboard-sizes";
const COLS = 8;
const COL_WIDTH = 112;
const ROW_HEIGHT = 112;
const GAP = 20;
const REFRESH_INTERVAL_MS = 60_000;
const REFRESH_MESSAGE =
  "Actualiza los datos de este widget manteniendo el mismo diseño y los mismos bloques.";

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
        gap: 12,
        height: "100%",
        color: "var(--ink-soft)",
        fontSize: 13,
      }}
    >
      <svg width="42" height="42" viewBox="0 0 50 50" role="img" aria-label="Generando widget">
        <circle cx="25" cy="25" r="20" fill="none" stroke="var(--line)" strokeWidth="4" />
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="var(--garnet)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="90 160"
          style={{
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: "agent-spin 0.9s linear infinite",
          }}
        />
      </svg>
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
        borderRadius: "var(--radius-card)",
        padding: compact ? 16 : 20,
        boxShadow: "var(--shadow-card)",
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: compact ? 12 : 16, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {editMode ? <DragHandle /> : null}
            {title ? <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{title}</span> : null}
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

export function Dashboard({
  usuarioId,
  dashboardData,
  onStartGoal,
}: {
  usuarioId: string;
  dashboardData: DashboardData;
  onStartGoal: () => void;
}) {
  const { widgets, upsert, remove } = useWidgets();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
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

  /** Regenera el widget con un mejor acomodo, conservando finalidad y datos. */
  async function regenerateWidget(widget: SavedWidget) {
    setBusyId(widget.widgetId);
    setAdaptingId(widget.widgetId);
    try {
      await runWidgetTurn(
        widget,
        {
          message: `Regenera este widget con un acomodo más estético (siguiendo los patrones de diseño) para un tamaño de ${widget.cols} columnas de ancho por ${widgetRows(widget.blocks)} filas de alto. Conserva exactamente la misma finalidad y datos; puedes reorganizar, agregar o quitar componentes si mejora el resultado.`,
        },
        { requireExportable: true, replaceLayout: true }
      );
    } catch (error) {
      console.error("Regeneración del widget falló:", error);
    } finally {
      setBusyId(null);
      setAdaptingId(null);
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
      { id: "card", w: 3, h: 3 },
      { id: "balance", w: 2, h: 2 },
      { id: "quick-actions", w: 2, h: 2 },
      { id: "summary", w: 4, h: 2 },
      ...widgets.map((w) => {
        const saved = savedSizes[w.widgetId];
        const layout = layoutWidget(w.blocks, saved?.w ?? w.cols);
        return {
          id: w.widgetId,
          w: layout.cols,
          h: saved?.h ?? layout.rows + 1,
        };
      }),
    ],
    [widgets, savedSizes]
  );

  const layout = useMemo(() => {
    const resolved = resolveLayout(items, savedPositions, COLS);
    // Compactamos (gravedad vertical) para que no queden huecos.
    const compacted = compactLayout(resolved, items.map((item) => item.id));
    // Mientras se redimensiona, fijamos el tile en su posición original.
    if (resizing && resizeDraft) {
      compacted[resizing.id] = {
        x: resizing.rect.x,
        y: resizing.rect.y,
        w: resizeDraft.w,
        h: resizeDraft.h,
      };
    }
    return compacted;
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
        const otherEntries = Object.entries(layoutRef.current).filter(([id]) => id !== active.id);
        const collides = otherEntries.some(([, rect]) => rectsOverlap(candidate, rect));

        const commitResize = () => {
          setSavedSizes((current) => {
            const next = { ...current, [active.id]: { w: draft.w, h: draft.h } };
            window.localStorage.setItem(SIZES_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
          // Le pedimos al agente que regenere el widget adaptado a ese tamaño.
          const widget = loadWidgets().find((item) => item.widgetId === active.id);
          if (widget) void adaptWidgetSizeRef.current(widget, draft.w, draft.h);
        };

        if (!collides) {
          commitResize();
        } else {
          // Al agrandar, en vez de rechazar el resize, desplazamos a quien
          // estorbe: el widget conserva su posición y toma el nuevo tamaño,
          // y el resto se reacomoda alrededor (mismo criterio que al
          // arrastrar un widget sobre otro).
          setSavedPositions((currentPositions) => {
            const prioritized = [
              { id: active.id, w: draft.w, h: draft.h },
              ...otherEntries.map(([id, rect]) => ({ id, w: rect.w, h: rect.h })),
            ];
            const forced = { ...currentPositions, [active.id]: { x: active.rect.x, y: active.rect.y } };
            const resolved = resolveLayout(prioritized, forced, COLS);
            const next: Record<string, { x: number; y: number }> = { ...currentPositions };
            for (const [id, rect] of Object.entries(resolved)) {
              next[id] = { x: rect.x, y: rect.y };
            }
            window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
          commitResize();
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
      const origin = layout[draggedId];

      // Widgets del mismo tamaño que caen bajo el cursor: si hay exactamente
      // uno, intercambiamos posiciones.
      const swapTargets = items.filter((item) => {
        if (item.id === draggedId) return false;
        if (item.w !== dragged.w || item.h !== dragged.h) return false;
        const rect = layout[item.id];
        return rect ? rectsOverlap(candidate, rect) : false;
      });

      const swapTarget = swapTargets.length === 1 ? swapTargets[0] : undefined;
      if (swapTarget && origin) {
        const targetRect = layout[swapTarget.id];
        if (targetRect) {
          setSavedPositions((current) => {
            const next = {
              ...current,
              [draggedId]: { x: targetRect.x, y: targetRect.y },
              [swapTarget.id]: { x: origin.x, y: origin.y },
            };
            window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
        }
      } else {
        const others = Object.entries(layout).filter(([id]) => id !== draggedId).map(([, r]) => r);
        const valid = !others.some((r) => rectsOverlap(candidate, r));
        if (valid) {
          setSavedPositions((current) => {
            const next = { ...current, [draggedId]: { x, y } };
            window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
        } else {
          // Cae sobre uno o más widgets que no se pueden intercambiar 1 a 1
          // (tamaños distintos, o más de uno de por medio): en vez de
          // rechazar el drop, el widget arrastrado se queda exactamente
          // donde lo soltaste y el resto se reacomoda a su alrededor,
          // conservando su posición guardada cuando todavía cabe.
          setSavedPositions((current) => {
            const prioritized = [dragged, ...items.filter((item) => item.id !== draggedId)];
            const forced = { ...current, [draggedId]: { x, y } };
            const resolved = resolveLayout(prioritized, forced, COLS);
            const next: Record<string, { x: number; y: number }> = { ...current };
            for (const [id, rect] of Object.entries(resolved)) {
              next[id] = { x: rect.x, y: rect.y };
            }
            window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(next));
            return next;
          });
        }
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
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            style={{
              background: "var(--surface)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Widgets
          </button>
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
      </div>

      {editMode ? (
        <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: -10, marginBottom: 18 }}>
          Arrastra un widget para moverlo y usa la esquina inferior derecha para cambiar su tamaño.
        </p>
      ) : null}

      {pickerOpen ? (
        <WidgetPicker
          usuarioId={usuarioId}
          onAdd={(payload) => {
            upsert(payload);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
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
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, height: "100%" }}>
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
          const savedWidget = savedSizes[widget.widgetId];
          const widgetLayout = layoutWidget(widget.blocks, savedWidget?.w ?? widget.cols);
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
                    onClick={() => void regenerateWidget(widget)}
                    disabled={busyId === widget.widgetId}
                    title="Regenerar el acomodo del widget"
                    style={{
                      background: "none",
                      border: "none",
                      color: busyId === widget.widgetId ? "var(--ink-faint)" : "var(--ink-soft)",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: busyId === widget.widgetId ? "default" : "pointer",
                    }}
                  >
                    Regenerar
                  </button>
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
                    surface={blocksToSurface(widget.widgetId, widgetLayout.cols, widgetLayout.blocks)}
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
