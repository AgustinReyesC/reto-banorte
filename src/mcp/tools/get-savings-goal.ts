import { GetSavingsGoalInput, GetSavingsGoalOutput } from "@/schemas/mcp-tools";
import { getSavingsGoal as readSavingsGoal } from "@/data";

export async function getSavingsGoal(rawInput: unknown) {
  const input = GetSavingsGoalInput.parse(rawInput);
  const goal = await readSavingsGoal(input.usuarioId);
  return GetSavingsGoalOutput.parse({ goal });
}
