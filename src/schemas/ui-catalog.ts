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

// --- Pantalla generada por el agente ---

/**
 * Un bloque de la pantalla: un componente del catálogo con el tamaño (en
 * celdas del grid) que el agente propone. La posición (x, y) no la decide el
 * LLM: el frontend la auto-acomoda y luego el usuario la puede organizar.
 */
export const ScreenBlockSchema = z.object({
  id: z.string(),
  component: UiComponentSchema,
  w: z.number().int().min(1).max(8).default(2),
  h: z.number().int().min(1).max(6).default(1),
});
export type ScreenBlock = z.infer<typeof ScreenBlockSchema>;

/**
 * Lo que el agente devuelve siempre: una pantalla con su título, un texto
 * breve de contexto y los bloques que la componen. Nunca texto libre.
 */
export const AgentScreenSchema = z.object({
  title: z.string(),
  reply: z.string(),
  /**
   * Factor de escala uniforme del widget (0.5–2). El agente lo ajusta cuando
   * el usuario pide "más chico/grande": al multiplicar w y h de todos los
   * bloques por el mismo factor, se conserva la relación de aspecto.
   */
  scale: z.number().min(0.5).max(2).default(1),
  /**
   * Indica si la pantalla puede guardarse como widget en Inicio. El agente lo
   * pone en false cuando la solicitud está fuera de alcance (respuestas de
   * aviso/error sin contenido de widget real).
   */
  exportable: z.boolean().default(true),
  /**
   * Indica si el widget depende de datos que cambian (análisis, KPIs, saldos)
   * y por lo tanto debe refrescarse periódicamente en Inicio. El agente lo
   * pone en false para pantallas estáticas (confirmaciones, avisos).
   */
  refreshable: z.boolean().default(true),
  blocks: z.array(ScreenBlockSchema).min(1),
});
export type AgentScreen = z.infer<typeof AgentScreenSchema>;

/** Lo que el frontend manda de vuelta cuando el usuario interactúa con un componente. */
export const UiInteractionEventSchema = z.object({
  componentId: z.string(),
  value: z.unknown(),
});
export type UiInteractionEvent = z.infer<typeof UiInteractionEventSchema>;

// --- Contrato de src/app/api/chat/route.ts ---

export const ChatTurnSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string() }),
  z.object({ role: z.literal("assistant"), content: AgentScreenSchema }),
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
  response: AgentScreenSchema,
  history: z.array(ChatTurnSchema),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
