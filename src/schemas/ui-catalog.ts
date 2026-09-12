import { z } from "zod";

/**
 * BORRADOR — subconjunto mínimo del catálogo A2UI para cerrar el flujo feliz
 * de metas de ahorro. Faltan del catálogo completo: breakdown_chart,
 * trend_chart, summary_table, slider, timeline, alert_card (casos
 * secundarios). Dueño real de este archivo: quien construya ui-catalog/,
 * pero el agente necesita una forma concreta para poder devolver JSON
 * validado en vez de texto libre.
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
]);
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const ChatRequestSchema = z.object({
  usuarioId: z.string().default("u_ana"),
  history: z.array(ChatTurnSchema).default([]),
  message: z.string().min(1),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  response: AgentUiResponseSchema,
  history: z.array(ChatTurnSchema),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
