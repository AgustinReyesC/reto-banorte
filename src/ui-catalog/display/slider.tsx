"use client";

import { useState } from "react";
import type { ComponentOfType, RenderUiComponentOptions } from "@/ui-catalog/types";

export function Slider({
  component,
  onAction,
}: {
  component: ComponentOfType<"slider">;
  onAction?: RenderUiComponentOptions["onAction"];
}) {
  const [value, setValue] = useState(component.defaultValue ?? component.min);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink)" }}>
        <strong>{component.label}</strong>
        <span style={{ color: "var(--garnet)", fontWeight: 700 }}>
          {value}
          {component.unit ? ` ${component.unit}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={component.min}
        max={component.max}
        step={component.step ?? 1}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        onPointerUp={() => onAction?.(component.id, value)}
        onKeyUp={() => onAction?.(component.id, value)}
        style={{ width: "100%", accentColor: "var(--garnet)" }}
      />
    </div>
  );
}
