import { SimulateSavingsGoalInput, SimulateSavingsGoalOutput } from "@/schemas/mcp-tools";
import { simularMetaAhorro } from "../finance";

export async function simulateSavingsGoal(rawInput: unknown) {
  const input = SimulateSavingsGoalInput.parse(rawInput);
  const simulacion = simularMetaAhorro(input);
  return SimulateSavingsGoalOutput.parse(simulacion);
}
