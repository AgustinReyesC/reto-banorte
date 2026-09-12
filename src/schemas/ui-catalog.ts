import { z } from "zod";

/**
 * Contrato del catálogo A2UI completo (display, diálogo y fallback).
 * El agente solo puede invocar estos tipos con estas props: nunca HTML/JSX
 * arbitrario. Si se necesita un componente nuevo, se acuerda con el equipo
 * y se agrega aquí antes de tocar ui-catalog/.
 */

// --- Diálogo (slot-filling) ---

export const NumberInputDialogSchema = z.object({
  type: z.literal("number_input_dialog"),
  id: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  defaultValue: z.number().optional(),
});

export const ChoiceDialogSchema = z.object({
  type: z.literal("choice_dialog"),
  id: z.string(),
  label: z.string(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).min(2),
});

export const ConfirmationDialogSchema = z.object({
  type: z.literal("confirmation_dialog"),
  id: z.string(),
  message: z.string(),
  confirmLabel: z.string(),
  cancelLabel: z.string(),
});

// --- Display ---

export const KpiCardSchema = z.object({
  type: z.literal("kpi_card"),
  label: z.string(),
  value: z.string(),
  helpText: z.string().optional(),
});

export const ProgressTrackerSchema = z.object({
  type: z.literal("progress_tracker"),
  label: z.string(),
  current: z.number(),
  target: z.number(),
  unit: z.string().optional(),
});

export const ScenarioComparisonSchema = z.object({
  type: z.literal("scenario_comparison"),
  scenarios: z
    .array(
      z.object({
        label: z.string(),
        aporteMensual: z.number(),
        mesesRequeridos: z.number(),
        viable: z.boolean(),
      })
    )
    .min(2),
});

export const BreakdownChartSchema = z.object({
  type: z.literal("breakdown_chart"),
  title: z.string().optional(),
  unit: z.string().optional(),
  segments: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        percentage: z.number().optional(),
      })
    )
    .min(1),
});

export const TrendChartSchema = z.object({
  type: z.literal("trend_chart"),
  title: z.string().optional(),
  unit: z.string().optional(),
  points: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
      })
    )
    .min(2),
});

export const SummaryTableSchema = z.object({
  type: z.literal("summary_table"),
  title: z.string().optional(),
  columns: z.array(z.string()).min(1),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).min(1),
});

export const SliderSchema = z.object({
  type: z.literal("slider"),
  id: z.string(),
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number().positive().optional(),
  defaultValue: z.number().optional(),
  unit: z.string().optional(),
});

export const TimelineSchema = z.object({
  type: z.literal("timeline"),
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        label: z.string(),
        detail: z.string().optional(),
      })
    )
    .min(1),
});

export const AlertCardSchema = z.object({
  type: z.literal("alert_card"),
  title: z.string(),
  message: z.string(),
  tone: z.enum(["info", "success", "warning", "danger"]).optional(),
});

export const CtaButtonSchema = z.object({
  type: z.literal("cta_button"),
  id: z.string(),
  label: z.string(),
  action: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// --- Fallback (nunca debe romperse la demo) ---

export const TextBlockSchema = z.object({
  type: z.literal("text_block"),
  text: z.string(),
});

export const ListBlockSchema = z.object({
  type: z.literal("list_block"),
  items: z.array(z.string()),
});

export const UiComponentSchema = z.discriminatedUnion("type", [
  NumberInputDialogSchema,
  ChoiceDialogSchema,
  ConfirmationDialogSchema,
  KpiCardSchema,
  ProgressTrackerSchema,
  ScenarioComparisonSchema,
  BreakdownChartSchema,
  TrendChartSchema,
  SummaryTableSchema,
  SliderSchema,
  TimelineSchema,
  AlertCardSchema,
  CtaButtonSchema,
  TextBlockSchema,
  ListBlockSchema,
]);
export type UiComponent = z.infer<typeof UiComponentSchema>;

/** Lo que el agente debe devolver siempre: nunca texto libre. */
export const AgentUiResponseSchema = z.object({
  reply: z.string(),
  components: z.array(UiComponentSchema).min(1),
  widget: z
    .object({
      widgetId: z.string(),
      summary: UiComponentSchema,
      detail: z.array(UiComponentSchema).optional(),
    })
    .optional(),
});
export type AgentUiResponse = z.infer<typeof AgentUiResponseSchema>;

/** Lo que el frontend manda de vuelta cuando el usuario interactúa con un componente. */
export const UiInteractionEventSchema = z.object({
  componentId: z.string(),
  value: z.unknown(),
});
export type UiInteractionEvent = z.infer<typeof UiInteractionEventSchema>;

// --- Contrato de src/app/api/chat/route.ts ---

export const ChatTurnSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string() }),
  z.object({ role: z.literal("assistant"), content: AgentUiResponseSchema }),
  z.object({ role: z.literal("event"), content: UiInteractionEventSchema }),
]);
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const ChatRequestSchema = z
  .object({
    usuarioId: z.string().default("u_ana"),
    history: z.array(ChatTurnSchema).default([]),
    message: z.string().min(1).optional(),
    event: UiInteractionEventSchema.optional(),
  })
  .refine((data) => Boolean(data.message) !== Boolean(data.event), {
    message: "Envía exactamente uno: 'message' o 'event'.",
  });
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  response: AgentUiResponseSchema,
  history: z.array(ChatTurnSchema),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
