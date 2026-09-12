import { z } from "zod";
import {
  GetIncomeSummaryInput,
  GetExpenseBreakdownInput,
  GetTransactionsInput,
  SimulateSavingsGoalInput,
  CreateSavingsGoalInput,
  GetSavingsGoalInput,
} from "@/schemas/mcp-tools";
import { getIncomeSummary } from "./get-income-summary";
import { getExpenseBreakdown } from "./get-expense-breakdown";
import { getTransactions } from "./get-transactions";
import { simulateSavingsGoal } from "./simulate-savings-goal";
import { createSavingsGoal } from "./create-savings-goal";
import { getSavingsGoal } from "./get-savings-goal";

/**
 * Registro de tools del MCP, independiente del transporte. `src/app/api/mcp/route.ts`
 * (dueño: agent/api) lo consume para exponerlo por el protocolo que decida usar.
 */
export const MCP_TOOLS = {
  get_income_summary: {
    description: "Obtiene el total y promedio mensual de ingresos de un usuario en un rango de fechas.",
    inputSchema: GetIncomeSummaryInput,
    handler: getIncomeSummary,
  },
  get_expense_breakdown: {
    description: "Obtiene el desglose de gastos por categoría de un usuario en un rango de fechas.",
    inputSchema: GetExpenseBreakdownInput,
    handler: getExpenseBreakdown,
  },
  get_transactions: {
    description: "Obtiene las transacciones crudas de un usuario en un rango de fechas.",
    inputSchema: GetTransactionsInput,
    handler: getTransactions,
  },
  simulate_savings_goal: {
    description: "Simula una meta de ahorro (sin persistir) dado un monto, plazo y aporte mensual opcional.",
    inputSchema: SimulateSavingsGoalInput,
    handler: simulateSavingsGoal,
  },
  create_savings_goal: {
    description: "Crea o actualiza (upsert) la meta de ahorro activa de un usuario. Acción real y persistente.",
    inputSchema: CreateSavingsGoalInput,
    handler: createSavingsGoal,
  },
  get_savings_goal: {
    description: "Obtiene la meta de ahorro activa de un usuario, si existe.",
    inputSchema: GetSavingsGoalInput,
    handler: getSavingsGoal,
  },
} as const satisfies Record<
  string,
  { description: string; inputSchema: z.ZodTypeAny; handler: (rawInput: unknown) => Promise<unknown> }
>;

export type McpToolKey = keyof typeof MCP_TOOLS;
