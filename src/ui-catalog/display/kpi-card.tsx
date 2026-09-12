import type { ComponentOfType } from "@/ui-catalog/types";

export function KpiCard({ component }: { component: ComponentOfType<"kpi_card"> }) {
  return (
    <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", borderRadius: 16, padding: 16, display: "grid", gap: 8 }}>
      <div style={{ color: "#475569", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4 }}>{component.label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{component.value}</div>
      {component.helpText ? <div style={{ color: "#475569", fontSize: 12 }}>{component.helpText}</div> : null}
    </div>
  );
}
