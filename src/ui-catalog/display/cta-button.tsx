"use client";

import type { ComponentOfType, RenderUiComponentOptions } from "@/ui-catalog/types";

export function CtaButton({
  component,
  onAction,
}: {
  component: ComponentOfType<"cta_button">;
  onAction?: RenderUiComponentOptions["onAction"];
}) {
  return (
    <button
      type="button"
      onClick={() => onAction?.(component.id, component.payload ?? component.action)}
      style={{ background: "var(--garnet)", color: "#fff", border: "none", borderRadius: "var(--radius-inner)", padding: "12px 16px", cursor: "pointer", fontWeight: 700, width: "100%" }}
    >
      {component.label}
    </button>
  );
}
