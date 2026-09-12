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
    <div style={{ border: "1px solid #dfe7f5", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
      <label htmlFor={component.id} style={{ fontWeight: 700 }}>
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
        style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #c9d4ea" }}
      />
      <button
        type="button"
        onClick={() => onAction?.(component.id, value)}
        style={{ background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", border: "none", cursor: "pointer", fontWeight: 700 }}
      >
        Enviar
      </button>
    </div>
  );
}
