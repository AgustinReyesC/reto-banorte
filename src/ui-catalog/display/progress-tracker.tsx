import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

export function ProgressTracker({ component }: { component: ComponentOfType<"progress_tracker"> }) {
  const percent = component.target > 0 ? Math.min((component.current / component.target) * 100, 100) : 0;

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-3)", height: "100%", alignContent: "center" }}>
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
