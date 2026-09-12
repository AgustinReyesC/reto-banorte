import { GetIncomeSummaryInput, GetIncomeSummaryOutput } from "@/schemas/mcp-tools";
import { TRANSACCIONES } from "@/data";
import { filtrarPorUsuarioYRango, calcularResumenIngresos } from "../finance";

export async function getIncomeSummary(rawInput: unknown) {
  const input = GetIncomeSummaryInput.parse(rawInput);
  const transacciones = filtrarPorUsuarioYRango(TRANSACCIONES, input.usuarioId, input.rango);
  const resumen = calcularResumenIngresos(transacciones, input.rango);
  return GetIncomeSummaryOutput.parse(resumen);
}
