import { GetExpenseBreakdownInput, GetExpenseBreakdownOutput } from "@/schemas/mcp-tools";
import { TRANSACCIONES } from "@/data";
import { filtrarPorUsuarioYRango, calcularDesgloseGastos } from "../finance";

export async function getExpenseBreakdown(rawInput: unknown) {
  const input = GetExpenseBreakdownInput.parse(rawInput);
  const transacciones = filtrarPorUsuarioYRango(TRANSACCIONES, input.usuarioId, input.rango);
  const desglose = calcularDesgloseGastos(transacciones);
  return GetExpenseBreakdownOutput.parse(desglose);
}
