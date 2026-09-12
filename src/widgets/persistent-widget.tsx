"use client";

import { renderAgentComponent } from "@/ui-catalog/registry";
import type { SavedWidget } from "@/widgets/store";

function widgetTitle(summary: SavedWidget["summary"]): string {
  if (summary.type === "kpi_card" || summary.type === "progress_tracker") return summary.label;
  return "Resumen";
}

export function PersistentWidget({ widget, onToggle }: { widget: SavedWidget; onToggle: () => void }) {
  const detail = widget.detail ?? [];

  return (
    <div style={{ background: "white", border: "1px solid #dfe7f5", borderRadius: 18, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{ width: "100%", border: "none", background: "#eff6ff", padding: "16px 18px", textAlign: "left", cursor: "pointer" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong>{widgetTitle(widget.summary)}</strong>
          <span style={{ color: "#475569" }}>{widget.expanded ? "Cerrar" : "Abrir"}</span>
        </div>
      </button>

      <div style={{ padding: 18, display: "grid", gap: 12 }}>
        {renderAgentComponent(widget.summary)}
      </div>

      {widget.expanded ? (
        detail.length > 0 ? (
          <div style={{ padding: 18, paddingTop: 0, display: "grid", gap: 12 }}>
            {detail.map((component) => renderAgentComponent(component))}
          </div>
        ) : (
          <div style={{ padding: 18, paddingTop: 0, color: "#475569" }}>Sin detalle adicional.</div>
        )
      ) : null}
    </div>
  );
}
