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
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
      <div style={{ fontWeight: 700, color: "var(--ink)" }}>{component.label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {component.options.map((option) => (
          <button
            key={`${component.id}-${option.value}`}
            type="button"
            onClick={() => onAction?.(component.id, option.value)}
            style={{ border: "1px solid var(--line)", background: "var(--surface-sunken)", color: "var(--ink)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontSize: 13.5 }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
