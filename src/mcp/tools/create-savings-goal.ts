import { CreateSavingsGoalInput, CreateSavingsGoalOutput } from "@/schemas/mcp-tools";
import { upsertSavingsGoal } from "@/data";

/** Única acción del reto que persiste de verdad: crea o actualiza (upsert por usuario) la meta de ahorro. */
export async function createSavingsGoal(rawInput: unknown) {
  const input = CreateSavingsGoalInput.parse(rawInput);
  const goal = await upsertSavingsGoal(input.usuarioId, {
    monto: input.monto,
    meses: input.meses,
    aporteMensual: input.aporteMensual,
  });
  return CreateSavingsGoalOutput.parse(goal);
}
