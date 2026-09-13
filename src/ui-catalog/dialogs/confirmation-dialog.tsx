"use client";

import type { ComponentOfType, RenderUiComponentOptions } from "@/ui-catalog/types";

export function ConfirmationDialog({
  component,
  onAction,
}: {
  component: ComponentOfType<"confirmation_dialog">;
  onAction?: RenderUiComponentOptions["onAction"];
}) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
      <div style={{ color: "var(--ink)" }}>{component.message}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => onAction?.(component.id, true)}
          style={{ background: "var(--garnet)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", cursor: "pointer", fontWeight: 700 }}
        >
          {component.confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => onAction?.(component.id, false)}
          style={{ background: "var(--surface-sunken)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}
        >
          {component.cancelLabel}
        </button>
      </div>
    </div>
  );
}
