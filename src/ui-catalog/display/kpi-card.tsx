import type { ComponentOfType } from "@/ui-catalog/types";

export function KpiCard({ component }: { component: ComponentOfType<"kpi_card"> }) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--garnet-soft) 0%, var(--surface-sunken) 100%)",
        borderRadius: "var(--radius-inner)",
        padding: "clamp(10px, 8cqw, 16px)",
        display: "grid",
        gap: "clamp(4px, 4cqw, 8px)",
        alignContent: "center",
        minWidth: 0,
        height: "100%",
      }}
    >
      <div style={{ color: "var(--ink-soft)", fontSize: "clamp(10px, 7cqw, 13px)", overflowWrap: "anywhere" }}>
        {component.label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(15px, 13cqw, 26px)",
          fontWeight: 600,
          color: "var(--ink)",
          lineHeight: 1.15,
          overflowWrap: "anywhere",
        }}
      >
        {component.value}
      </div>
      {component.helpText ? (
        <div style={{ color: "var(--ink-faint)", fontSize: "clamp(9px, 6cqw, 12px)", overflowWrap: "anywhere" }}>
          {component.helpText}
        </div>
      ) : null}
    </div>
  );
}
