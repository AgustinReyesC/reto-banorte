import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

export function ScenarioComparison({ component }: { component: ComponentOfType<"scenario_comparison"> }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {component.scenarios.map((scenario) => (
        <div key={scenario.label} style={{ border: "1px solid #dfe7f5", borderRadius: 14, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>{scenario.label}</strong>
            <span style={{ color: scenario.viable ? "#15803d" : "#b45309", fontWeight: 700 }}>
              {scenario.viable ? "Viable" : "Revisa"}
            </span>
          </div>
          <div style={{ color: "#475569" }}>Aporte mensual: {currency(scenario.aporteMensual)}</div>
          <div style={{ color: "#475569" }}>Meses necesarios: {scenario.mesesRequeridos}</div>
        </div>
      ))}
    </div>
  );
}
