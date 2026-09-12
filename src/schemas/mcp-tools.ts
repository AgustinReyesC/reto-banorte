import { z } from "zod";
import { RangoFechaSchema, TransaccionSchema, CategoriaGastoSchema, SavingsGoalSchema } from "./financial";

/**
 * Contrato de las 6 tools del MCP. agent/ construye llamadas contra estos
 * input schemas; mcp/ garantiza que las respuestas cumplen los output schemas.
 * El LLM nunca fabrica estos números, solo los consume.
 */

export const GetIncomeSummaryInput = z.object({
  usuarioId: z.string(),
  rango: RangoFechaSchema,
});
export const GetIncomeSummaryOutput = z.object({
  totalIngresos: z.number(),
  promedioMensual: z.number(),
  numTransacciones: z.number().int(),
});

export const GetExpenseBreakdownInput = z.object({
  usuarioId: z.string(),
  rango: RangoFechaSchema,
});
export const GetExpenseBreakdownOutput = z.object({
  totalGastos: z.number(),
  categorias: z.array(
    z.object({
      categoria: CategoriaGastoSchema,
      monto: z.number(),
      porcentaje: z.number(),
    })
  ),
});

export const GetTransactionsInput = z.object({
  usuarioId: z.string(),
  rango: RangoFechaSchema,
});
export const GetTransactionsOutput = z.object({
  transacciones: z.array(TransaccionSchema),
});

export const SimulateSavingsGoalInput = z.object({
  monto: z.number().positive(),
  meses: z.number().int().positive(),
  aporteMensual: z.number().positive().optional(),
});
export const SimulateSavingsGoalOutput = z.object({
  viable: z.boolean(),
  aporteMensualRequerido: z.number(),
  mesesRequeridos: z.number().int(),
  proyeccion: z.array(
    z.object({
      mes: z.number().int(),
      acumulado: z.number(),
    })
  ),
});

export const CreateSavingsGoalInput = z.object({
  usuarioId: z.string(),
  monto: z.number().positive(),
  meses: z.number().int().positive(),
  aporteMensual: z.number().positive(),
});
export const CreateSavingsGoalOutput = SavingsGoalSchema;

export const GetSavingsGoalInput = z.object({
  usuarioId: z.string(),
});
export const GetSavingsGoalOutput = z.object({
  goal: SavingsGoalSchema.nullable(),
});

export const McpToolName = z.enum([
  "get_income_summary",
  "get_expense_breakdown",
  "get_transactions",
  "simulate_savings_goal",
  "create_savings_goal",
  "get_savings_goal",
]);
export type McpToolName = z.infer<typeof McpToolName>;
