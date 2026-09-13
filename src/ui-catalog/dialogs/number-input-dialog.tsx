"use client";

import { useState } from "react";
import type { ComponentOfType, RenderUiComponentOptions } from "@/ui-catalog/types";

export function NumberInputDialog({
  component,
  onAction,
}: {
  component: ComponentOfType<"number_input_dialog">;
  onAction?: RenderUiComponentOptions["onAction"];
}) {
  const [value, setValue] = useState(component.defaultValue ?? component.min ?? 0);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-3)" }}>
      <label htmlFor={component.id} style={{ fontWeight: 700, color: "var(--ink)" }}>
        {component.label}
      </label>
      <input
        id={component.id}
        type="number"
        min={component.min ?? 0}
        max={component.max}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        placeholder={component.placeholder ?? "0"}
        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--surface)", color: "var(--ink)" }}
      />
      <button
        type="button"
        onClick={() => onAction?.(component.id, value)}
        style={{ background: "var(--garnet)", color: "#fff", borderRadius: 10, padding: "10px 14px", border: "none", cursor: "pointer", fontWeight: 700 }}
      >
        Enviar
      </button>
    </div>
  );
}
