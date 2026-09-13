import { UiComponentSchema, type UiComponent } from "@/schemas/ui-catalog";
import type { A2uiComponent } from "@/schemas/a2ui";

/**
 * Catálogo A2UI propio de Banorte: mapea cada tipo del catálogo de UI a un
 * nombre de componente A2UI y viceversa. El agente y el renderer comparten
 * este catálogo (identificado por A2UI_CATALOG_ID).
 */

const A2UI_NAME_BY_TYPE: Record<UiComponent["type"], string> = {
  kpi_card: "KpiCard",
  progress_tracker: "ProgressTracker",
  scenario_comparison: "ScenarioComparison",
  breakdown_chart: "BreakdownChart",
  trend_chart: "TrendChart",
  summary_table: "SummaryTable",
  slider: "Slider",
  timeline: "Timeline",
  alert_card: "AlertCard",
  cta_button: "CtaButton",
  number_input_dialog: "NumberInputDialog",
  choice_dialog: "ChoiceDialog",
  confirmation_dialog: "ConfirmationDialog",
  text_block: "TextBlock",
  list_block: "ListBlock",
};

const TYPE_BY_A2UI_NAME: Record<string, UiComponent["type"]> = Object.fromEntries(
  Object.entries(A2UI_NAME_BY_TYPE).map(([type, name]) => [name, type as UiComponent["type"]])
);

export function typeToA2uiName(type: UiComponent["type"]): string {
  return A2UI_NAME_BY_TYPE[type];
}

/** Resuelve un valor dinámico A2UI (`{ path }`) contra el data model. */
export function resolveDynamicValue(value: unknown, dataModel: Record<string, unknown>): unknown {
  if (Array.isArray(value)) return value.map((item) => resolveDynamicValue(item, dataModel));
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.path === "string") {
      return resolvePath(dataModel, record.path);
    }
    const resolved: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(record)) {
      resolved[key] = resolveDynamicValue(nested, dataModel);
    }
    return resolved;
  }
  return value;
}

function resolvePath(dataModel: Record<string, unknown>, path: string): unknown {
  const segments = path.split("/").filter(Boolean);
  let current: unknown = dataModel;
  for (const segment of segments) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/** Convierte un componente del catálogo de UI en las props de un componente A2UI. */
export function uiComponentToA2uiProps(component: UiComponent): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...component };
  delete clone.type;
  // El `id` del componente A2UI es el id del bloque (estructura del árbol).
  // Conservamos el id interno del componente de UI como `componentId` para que
  // las acciones sigan refiriéndose al mismo id que antes.
  if (typeof clone.id === "string") clone.componentId = clone.id;
  delete clone.id;
  return clone;
}

/**
 * Convierte un componente A2UI de vuelta a un componente del catálogo de UI.
 * Devuelve null si el tipo no existe en el catálogo o las props no validan.
 */
export function a2uiComponentToUiComponent(
  component: A2uiComponent,
  dataModel: Record<string, unknown>
): UiComponent | null {
  const type = TYPE_BY_A2UI_NAME[component.component];
  if (!type) return null;

  const props: Record<string, unknown> = { ...component };
  delete props.id;
  delete props.component;
  delete props.children;
  delete props.layout;

  const resolved = resolveDynamicValue(props, dataModel) as Record<string, unknown>;
  const componentId = typeof resolved.componentId === "string" ? resolved.componentId : component.id;
  delete resolved.componentId;

  const candidate = { type, id: componentId, ...resolved };
  const parsed = UiComponentSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
