import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

export function ProgressTracker({ component }: { component: ComponentOfType<"progress_tracker"> }) {
  const percent = component.target > 0 ? Math.min((component.current / component.target) * 100, 100) : 0;

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, color: "var(--ink)" }}>
        <strong>{component.label}</strong>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {currency(component.current)} / {currency(component.target)}
        </span>
      </div>
      <div style={{ background: "var(--line)", height: 12, borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "var(--gain)",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
