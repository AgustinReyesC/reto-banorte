import type { ComponentOfType } from "@/ui-catalog/types";

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

function formatCell(cell: string | number): string {
  return typeof cell === "number" ? numberFormat.format(cell) : cell;
}

export function SummaryTable({ component }: { component: ComponentOfType<"summary_table"> }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-3)", overflowX: "auto", height: "100%", alignContent: "start" }}>
      {component.title ? <strong style={{ color: "var(--ink)" }}>{component.title}</strong> : null}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {component.columns.map((column) => (
              <th key={column} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--line)", color: "var(--ink-soft)" }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {component.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: "8px 10px", borderBottom: "1px solid var(--line)", color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                  {formatCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
