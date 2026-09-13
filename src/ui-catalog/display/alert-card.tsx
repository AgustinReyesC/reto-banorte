import type { ComponentOfType } from "@/ui-catalog/types";

const TONES = {
  info: { background: "#eff6ff", border: "#bfdbfe", accent: "#1d4ed8" },
  success: { background: "#f0fdf4", border: "#bbf7d0", accent: "#15803d" },
  warning: { background: "#fffbeb", border: "#fde68a", accent: "#b45309" },
  danger: { background: "#fef2f2", border: "#fecaca", accent: "#b91c1c" },
} as const;

export function AlertCard({ component }: { component: ComponentOfType<"alert_card"> }) {
  const tone = TONES[component.tone ?? "info"];

  return (
    <div
      style={{
        background: tone.background,
        border: `1px solid ${tone.border}`,
        borderLeft: `4px solid ${tone.accent}`,
        borderRadius: "var(--radius-inner)",
        padding: "var(--space-4)",
        display: "grid",
        gap: "var(--space-2)",
        height: "100%",
        alignContent: "start",
      }}
    >
      <strong style={{ color: tone.accent }}>{component.title}</strong>
      <div style={{ color: "var(--ink-soft)", lineHeight: 1.5 }}>{component.message}</div>
    </div>
  );
}
