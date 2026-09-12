import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

export function ScenarioComparison({ component }: { component: ComponentOfType<"scenario_comparison"> }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {component.scenarios.map((scenario) => (
        <div key={scenario.label} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, color: "var(--ink)" }}>
            <strong>{scenario.label}</strong>
            <span style={{ color: scenario.viable ? "var(--gain)" : "var(--gold)", fontWeight: 700, fontSize: 13 }}>
              {scenario.viable ? "Viable" : "Revisa"}
            </span>
          </div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Aporte mensual: {currency(scenario.aporteMensual)}</div>
          <div style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>Meses necesarios: {scenario.mesesRequeridos}</div>
        </div>
      ))}
    </div>
  );
}
