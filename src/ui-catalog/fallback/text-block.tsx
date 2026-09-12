import type { ComponentOfType } from "@/ui-catalog/types";

export function TextBlock({ component }: { component: ComponentOfType<"text_block"> }) {
  return <p style={{ margin: 0, color: "var(--ink)", lineHeight: 1.6 }}>{component.text}</p>;
}
