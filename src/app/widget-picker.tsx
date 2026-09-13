"use client";

import { useState } from "react";
import { renderAgentComponent } from "@/ui-catalog/registry";
import type { WidgetPayload } from "@/widgets/store";
import type { UiComponent } from "@/schemas/ui-catalog";

interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  buildPayload: () => WidgetPayload;
}

/**
  widgets que el usuario puede agregar manualmente desde el
  dashboard (a diferencia de los que crea el agente). Cada template arma un
  WidgetPayload válido contra UiComponentSchema, con datos de ejemplo.
 */
const TEMPLATES: WidgetTemplate[] = [
  {
    id: "progreso-ahorro",
    name: "Progreso de ahorro",
    description: "Barra de avance hacia una meta de ahorro.",
    buildPayload: () => ({
      widgetId: `widget-progreso-ahorro-${Date.now()}`,
      summary: {
        type: "progress_tracker",
        label: "Meta de ahorro",
        current: 12000,
        target: 50000,
        unit: "MXN",
      },
    }),
  },
  {
    id: "presupuesto",
    name: "Presupuesto",
    description: "Desglose de gasto por categoría del mes.",
    buildPayload: () => ({
      widgetId: `widget-presupuesto-${Date.now()}`,
      summary: {
        type: "breakdown_chart",
        title: "Presupuesto por categoría",
        unit: "MXN",
        segments: [
          { label: "Comida", value: 4200 },
          { label: "Transporte", value: 1800 },
          { label: "Entretenimiento", value: 1200 },
        ],
      },
    }),
  },
];

export function WidgetPicker({ onAdd, onClose }: { onAdd: (payload: WidgetPayload) => void; onClose: () => void }) {
  const initialSelectedId = TEMPLATES[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(initialSelectedId);

  if (TEMPLATES.length === 0) return null;

  const selected = TEMPLATES.find((t) => t.id === selectedId) ?? TEMPLATES[0];

  if (!selected) return null;

  const previewComponent: UiComponent = selected.buildPayload().summary;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(38, 22, 26, 0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: 18,
          width: "min(760px, 100%)",
          maxHeight: "min(560px, 90vh)",
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(38, 22, 26, 0.25)",
        }}
      >
        <div
          style={{
            background: "var(--surface-sunken)",
            borderRight: "1px solid var(--line)",
            padding: 12,
            display: "grid",
            gap: 4,
            alignContent: "start",
            overflowY: "auto",
          }}
        >
          {TEMPLATES.map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: active ? "var(--surface)" : "transparent",
                  boxShadow: active ? "0 1px 2px rgba(38, 22, 26, 0.08)" : "none",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: "0 0 4px", fontFamily: "var(--font-display)", fontSize: 19 }}>{selected.name}</h2>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13.5 }}>{selected.description}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-faint)", fontSize: 18, lineHeight: 1, padding: 4 }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              background: "var(--surface-sunken)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 18,
            }}
          >
            {renderAgentComponent(previewComponent)}
          </div>

          <button
            type="button"
            onClick={() => onAdd(selected.buildPayload())}
            style={{
              justifySelf: "start",
              background: "var(--garnet)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "11px 20px",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
