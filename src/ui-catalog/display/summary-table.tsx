import type { ComponentOfType } from "@/ui-catalog/types";

const numberFormat = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 });

function formatCell(cell: string | number): string {
  return typeof cell === "number" ? numberFormat.format(cell) : cell;
}

export function SummaryTable({ component }: { component: ComponentOfType<"summary_table"> }) {
  return (
    <div style={{ border: "1px solid #dfe7f5", borderRadius: 16, padding: 16, display: "grid", gap: 12, overflowX: "auto" }}>
      {component.title ? <strong>{component.title}</strong> : null}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {component.columns.map((column) => (
              <th key={column} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {component.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", color: "#0f172a" }}>
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
