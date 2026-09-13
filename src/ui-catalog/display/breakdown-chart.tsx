import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

export function BreakdownChart({ component }: { component: ComponentOfType<"breakdown_chart"> }) {
  const total = component.segments.reduce((sum, segment) => sum + segment.value, 0);
  const max = Math.max(...component.segments.map((segment) => segment.value), 1);

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-3)", height: "100%", alignContent: "start" }}>
      {component.title ? <strong style={{ color: "var(--ink)" }}>{component.title}</strong> : null}
      <div style={{ display: "grid", gap: 10 }}>
        {component.segments.map((segment) => {
          const percentage = segment.percentage ?? (total > 0 ? (segment.value / total) * 100 : 0);
          return (
            <div key={segment.label} style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--ink)" }}>
                <span style={{ textTransform: "capitalize" }}>{segment.label}</span>
                <span style={{ color: "var(--ink-soft)" }}>
                  {currency(segment.value)} · {percentage.toFixed(0)}%
                </span>
              </div>
              <div style={{ background: "var(--line)", height: 10, borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(segment.value / max) * 100}%`,
                    height: "100%",
                    background: "var(--garnet)",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {component.unit ? <div style={{ color: "var(--ink-faint)", fontSize: 12 }}>Unidad: {component.unit}</div> : null}
    </div>
  );
}
