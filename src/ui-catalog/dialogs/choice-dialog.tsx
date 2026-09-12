"use client";

import type { ComponentOfType, RenderUiComponentOptions } from "@/ui-catalog/types";

export function ChoiceDialog({
  component,
  onAction,
}: {
  component: ComponentOfType<"choice_dialog">;
  onAction?: RenderUiComponentOptions["onAction"];
}) {
  return (
    <div style={{ border: "1px solid #dfe7f5", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 700 }}>{component.label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {component.options.map((option) => (
          <button
            key={`${component.id}-${option.value}`}
            type="button"
            onClick={() => onAction?.(component.id, option.value)}
            style={{ border: "1px solid #c9d4ea", background: "#f8fafc", borderRadius: 10, padding: "8px 12px", cursor: "pointer" }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
