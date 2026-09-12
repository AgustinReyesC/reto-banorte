import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

export function BreakdownChart({ component }: { component: ComponentOfType<"breakdown_chart"> }) {
  const total = component.segments.reduce((sum, segment) => sum + segment.value, 0);
  const max = Math.max(...component.segments.map((segment) => segment.value), 1);

  return (
    <div style={{ border: "1px solid #dfe7f5", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
      {component.title ? <strong>{component.title}</strong> : null}
      <div style={{ display: "grid", gap: 10 }}>
        {component.segments.map((segment) => {
          const percentage = segment.percentage ?? (total > 0 ? (segment.value / total) * 100 : 0);
          return (
            <div key={segment.label} style={{ display: "grid", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ textTransform: "capitalize" }}>{segment.label}</span>
                <span style={{ color: "#475569" }}>
                  {currency(segment.value)} · {percentage.toFixed(0)}%
                </span>
              </div>
              <div style={{ background: "#e2e8f0", height: 10, borderRadius: 999, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${(segment.value / max) * 100}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #2563eb, #38bdf8)",
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {component.unit ? <div style={{ color: "#475569", fontSize: 12 }}>Unidad: {component.unit}</div> : null}
    </div>
  );
}
