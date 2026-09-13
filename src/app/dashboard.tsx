"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderAgentComponent } from "@/ui-catalog/registry";
import { useWidgets } from "@/widgets/use-widgets";
import type { SavedWidget } from "@/widgets/store";
import { CardDetailsTile, BalanceTile, QuickActionsTile, type DashboardData } from "@/app/dashboard-widgets";
import { resolveLayout, rectsOverlap, type GridRect } from "@/app/grid-layout";
import { WidgetPicker } from "@/app/widget-picker";

const POSITIONS_STORAGE_KEY = "banorte-dashboard-positions";
const COLS = 8;
const ROW_HEIGHT = 108;
const GAP = 16;

interface GridItem {
  id: string;
  w: number;
  h: number;
}

function widgetTitle(summary: SavedWidget["summary"]): string {
  if (summary.type === "kpi_card" || summary.type === "progress_tracker") return summary.label;
  return "Resumen";
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
  onDragStart,
  onDragEnd,
  children,
}: {
  id: string;
  rect: GridRect;
  title?: string;
  headerAction?: React.ReactNode;
  editMode: boolean;
  isDragged: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      draggable={editMode}
      onDragStart={() => onDragStart(id)}
      onDragEnd={onDragEnd}
      style={{
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
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

export function Dashboard({ dashboardData, onStartGoal }: { dashboardData: DashboardData; onStartGoal: () => void }) {
  const { widgets, toggle, upsert } = useWidgets();
  const [editMode, setEditMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewBox, setPreviewBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>({});
  const hasLoaded = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;
    try {
      const raw = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
      if (raw) setSavedPositions(JSON.parse(raw));
    } catch {
      // localStorage corrupto: seguimos con posiciones vacías (auto-acomodo)
    }
  }, []);

  const capacidadAhorro = Math.max(0, dashboardData.ingresoMensualPromedio - dashboardData.gastoMensualPromedio);

  const items: GridItem[] = useMemo(
    () => [
      { id: "card", w: 3, h: 3 },
      { id: "balance", w: 2, h: 2 },
      { id: "quick-actions", w: 2, h: 2 },
      { id: "summary", w: 3, h: 3 },
      ...widgets.map((w) => ({ id: w.widgetId, w: w.expanded ? 3 : 3, h: w.expanded ? 3 : 3 })),
    ],
    [widgets]
  );

  const layout = useMemo(() => resolveLayout(items, savedPositions, COLS), [items, savedPositions]);

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
          Arrastra un widget a cualquier espacio libre de la cuadrícula para moverlo.
        </p>
      ) : null}

      {pickerOpen ? (
        <WidgetPicker
          onAdd={(payload) => {
            upsert(payload);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}

      <div
        ref={gridRef}
        onDragOver={handleGridDragOver}
        onDrop={handleGridDrop}
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridAutoRows: ROW_HEIGHT,
          gap: GAP,
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
          const tileProps = { id: item.id, rect, editMode, isDragged: draggedId === item.id, onDragStart: setDraggedId, onDragEnd: clearDrag };

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
          const detail = widget.detail ?? [];
          return (
            <Tile
              key={item.id}
              {...tileProps}
              title={widgetTitle(widget.summary)}
              headerAction={
                <button
                  type="button"
                  onClick={() => toggle(widget.widgetId)}
                  style={{ background: "none", border: "none", color: "var(--garnet)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  {widget.expanded ? "Cerrar" : "Ver detalle"}
                </button>
              }
            >
              <div style={{ display: "grid", gap: 12, height: "100%" }}>
                {renderAgentComponent(widget.summary)}
                {widget.expanded
                  ? detail.length > 0
                    ? detail.map((c) => renderAgentComponent(c))
                    : <p style={{ color: "var(--ink-faint)", fontSize: 13, margin: 0 }}>Sin detalle adicional.</p>
                  : null}
              </div>
            </Tile>
          );
        })}
      </div>
    </div>
  );
}
