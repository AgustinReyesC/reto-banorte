import type { ComponentOfType } from "@/ui-catalog/types";

export function Timeline({ component }: { component: ComponentOfType<"timeline"> }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-inner)", padding: "var(--space-4)", display: "grid", gap: "var(--space-3)", height: "100%", alignContent: "start" }}>
      {component.title ? <strong style={{ color: "var(--ink)" }}>{component.title}</strong> : null}
      <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 12 }}>
        {component.items.map((item, index) => (
          <li key={`${item.label}-${index}`} style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--garnet)", marginTop: 4 }} />
              {index < component.items.length - 1 ? (
                <span style={{ flex: 1, width: 2, background: "var(--garnet-soft)", marginTop: 4 }} />
              ) : null}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: "var(--ink)" }}>{item.label}</div>
              {item.detail ? <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>{item.detail}</div> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
