"use client";

import { PersistentWidget } from "@/widgets/persistent-widget";
import type { SavedWidget } from "@/widgets/store";

export function WidgetZone({
  widgets,
  onToggle,
}: {
  widgets: SavedWidget[];
  onToggle: (widgetId: string) => void;
}) {
  if (widgets.length === 0) {
    return (
      <div style={{ background: "white", border: "1px solid #dfe7f5", borderRadius: 18, padding: 18 }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Metas y seguimiento</h3>
        <p style={{ margin: 0, color: "#475569" }}>Aún no hay widgets activos. Pide al agente crear una meta.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {widgets.map((widget) => (
        <PersistentWidget key={widget.widgetId} widget={widget} onToggle={() => onToggle(widget.widgetId)} />
      ))}
    </div>
  );
}
