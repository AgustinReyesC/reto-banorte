import type { ReactNode } from "react";
import { UiComponentSchema, type UiComponent } from "@/schemas/ui-catalog";
import { NumberInputDialog } from "@/ui-catalog/dialogs/number-input-dialog";
import { ChoiceDialog } from "@/ui-catalog/dialogs/choice-dialog";
import { ConfirmationDialog } from "@/ui-catalog/dialogs/confirmation-dialog";
import { KpiCard } from "@/ui-catalog/display/kpi-card";
import { ProgressTracker } from "@/ui-catalog/display/progress-tracker";
import { ScenarioComparison } from "@/ui-catalog/display/scenario-comparison";
import { BreakdownChart } from "@/ui-catalog/display/breakdown-chart";
import { TrendChart } from "@/ui-catalog/display/trend-chart";
import { SummaryTable } from "@/ui-catalog/display/summary-table";
import { Slider } from "@/ui-catalog/display/slider";
import { Timeline } from "@/ui-catalog/display/timeline";
import { AlertCard } from "@/ui-catalog/display/alert-card";
import { CtaButton } from "@/ui-catalog/display/cta-button";
import { TextBlock } from "@/ui-catalog/fallback/text-block";
import { ListBlock } from "@/ui-catalog/fallback/list-block";
import { UnknownComponentFallback } from "@/ui-catalog/fallback/unknown-component-fallback";
import type { RenderUiComponentOptions } from "@/ui-catalog/types";

export type { RenderUiComponentOptions } from "@/ui-catalog/types";

/**
 * Punto de entrada para renderizar contenido que viene del agente.
 * Valida el JSON crudo contra el contrato (Zod) antes de tocar el DOM: si un
 * tipo es desconocido o las props no validan, cae al fallback. La UI nunca
 * se rompe en la demo.
 */
export function renderAgentComponent(raw: unknown, options: RenderUiComponentOptions = {}): ReactNode {
  const parsed = UiComponentSchema.safeParse(raw);
  if (!parsed.success) {
    return <UnknownComponentFallback key="fallback" />;
  }
  return renderUiComponent(parsed.data, options);
}

/** Dispatcher tipado del catálogo A2UI. */
export function renderUiComponent(
  component: UiComponent,
  options: RenderUiComponentOptions = {}
): ReactNode {
  const { onAction } = options;

  switch (component.type) {
    case "number_input_dialog":
      return <NumberInputDialog key={component.id} component={component} onAction={onAction} />;

    case "choice_dialog":
      return <ChoiceDialog key={component.id} component={component} onAction={onAction} />;

    case "confirmation_dialog":
      return <ConfirmationDialog key={component.id} component={component} onAction={onAction} />;

    case "kpi_card":
      return <KpiCard key={`${component.label}-${component.value}`} component={component} />;

    case "progress_tracker":
      return <ProgressTracker key={`${component.label}-${component.target}`} component={component} />;

    case "scenario_comparison":
      return <ScenarioComparison key={component.scenarios.map((s) => s.label).join("-")} component={component} />;

    case "breakdown_chart":
      return <BreakdownChart key={component.segments.map((s) => s.label).join("-")} component={component} />;

    case "trend_chart":
      return <TrendChart key={component.points.map((p) => p.label).join("-")} component={component} />;

    case "summary_table":
      return <SummaryTable key={component.columns.join("-")} component={component} />;

    case "slider":
      return <Slider key={component.id} component={component} onAction={onAction} />;

    case "timeline":
      return <Timeline key={component.items.map((item) => item.label).join("-")} component={component} />;

    case "alert_card":
      return <AlertCard key={`${component.title}-${component.tone ?? "info"}`} component={component} />;

    case "cta_button":
      return <CtaButton key={component.id} component={component} onAction={onAction} />;

    case "text_block":
      return <TextBlock key={component.text} component={component} />;

    case "list_block":
      return <ListBlock key={component.items.join("-")} component={component} />;

    default:
      return <UnknownComponentFallback key="fallback" />;
  }
}
