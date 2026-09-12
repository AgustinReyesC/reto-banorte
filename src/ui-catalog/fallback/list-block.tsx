import type { ComponentOfType } from "@/ui-catalog/types";

export function ListBlock({ component }: { component: ComponentOfType<"list_block"> }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18, color: "var(--ink)", display: "grid", gap: 6 }}>
      {component.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
