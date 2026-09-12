import { GetTransactionsInput, GetTransactionsOutput } from "@/schemas/mcp-tools";
import { TRANSACCIONES } from "@/data";
import { filtrarPorUsuarioYRango } from "../finance";

export async function getTransactions(rawInput: unknown) {
  const input = GetTransactionsInput.parse(rawInput);
  const transacciones = filtrarPorUsuarioYRango(TRANSACCIONES, input.usuarioId, input.rango);
  return GetTransactionsOutput.parse({ transacciones });
}
