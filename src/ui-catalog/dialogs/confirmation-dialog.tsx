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
    <div style={{ border: "1px solid #dfe7f5", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
      <div>{component.message}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => onAction?.(component.id, true)}
          style={{ background: "#0ea5e9", color: "white", border: "none", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}
        >
          {component.confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => onAction?.(component.id, false)}
          style={{ background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}
        >
          {component.cancelLabel}
        </button>
      </div>
    </div>
  );
}
