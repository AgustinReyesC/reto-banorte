import type { ComponentOfType } from "@/ui-catalog/types";

export function Timeline({ component }: { component: ComponentOfType<"timeline"> }) {
  return (
    <div style={{ border: "1px solid #dfe7f5", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
      {component.title ? <strong>{component.title}</strong> : null}
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
        {component.items.map((item, index) => (
          <li key={`${item.label}-${index}`} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "#2563eb", marginTop: 4 }} />
              {index < component.items.length - 1 ? (
                <span style={{ flex: 1, width: 2, background: "#dbeafe", marginTop: 4 }} />
              ) : null}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{item.label}</div>
              {item.detail ? <div style={{ color: "#475569", fontSize: 13 }}>{item.detail}</div> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
