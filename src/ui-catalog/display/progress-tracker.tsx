import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

export function ProgressTracker({ component }: { component: ComponentOfType<"progress_tracker"> }) {
  const percent = component.target > 0 ? Math.min((component.current / component.target) * 100, 100) : 0;

  return (
    <div style={{ border: "1px solid #dfe7f5", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <strong>{component.label}</strong>
        <span>
          {currency(component.current)} / {currency(component.target)}
        </span>
      </div>
      <div style={{ background: "#e2e8f0", height: 12, borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: "linear-gradient(90deg, #22c55e 0%, #14b8a6 100%)",
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}
