import type { ComponentOfType } from "@/ui-catalog/types";

export function KpiCard({ component }: { component: ComponentOfType<"kpi_card"> }) {
  return (
    <div style={{ background: "linear-gradient(135deg, var(--garnet-soft) 0%, var(--surface-sunken) 100%)", borderRadius: 16, padding: 16, display: "grid", gap: 8 }}>
      <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{component.label}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--ink)" }}>{component.value}</div>
      {component.helpText ? <div style={{ color: "var(--ink-faint)", fontSize: 12 }}>{component.helpText}</div> : null}
    </div>
  );
}
