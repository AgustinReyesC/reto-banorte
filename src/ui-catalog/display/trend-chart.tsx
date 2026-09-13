import { currency } from "@/ui-catalog/format";
import type { ComponentOfType } from "@/ui-catalog/types";

const WIDTH = 340;
const HEIGHT = 150;
const PAD = 28;

export function TrendChart({ component }: { component: ComponentOfType<"trend_chart"> }) {
  const values = component.points.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = component.points.length > 1 ? (WIDTH - PAD * 2) / (component.points.length - 1) : 0;

  const coords = component.points.map((point, index) => ({
    x: PAD + index * stepX,
    y: HEIGHT - PAD - ((point.value - min) / range) * (HEIGHT - PAD * 2),
    label: point.label,
    value: point.value,
  }));

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-2)", height: "100%", alignContent: "start" }}>
      {component.title ? <strong style={{ color: "var(--ink)" }}>{component.title}</strong> : null}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height={HEIGHT} role="img" aria-label={component.title ?? "Tendencia"}>
        <line x1={PAD} y1={HEIGHT - PAD} x2={WIDTH - PAD} y2={HEIGHT - PAD} stroke="var(--line)" strokeWidth={1} />
        <polyline points={coords.map((c) => `${c.x},${c.y}`).join(" ")} fill="none" stroke="var(--garnet)" strokeWidth={2} />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r={3} fill="var(--garnet)" />
            <text x={c.x} y={HEIGHT - 10} textAnchor="middle" fontSize={9} fill="var(--ink-faint)">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ color: "var(--ink-faint)", fontSize: 12 }}>
        {component.unit ? `Unidad: ${component.unit} · ` : ""}Máx: {currency(max)}
      </div>
    </div>
  );
}
