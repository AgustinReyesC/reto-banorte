import { NextResponse } from "next/server";
import { ChatRequestSchema, type ChatResponse } from "@/schemas/ui-catalog";
import { runAgentTurn } from "@/agent/orchestrator";

/** Endpoint del agente: recibe el mensaje + historial del chat, corre el orquestador. */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida", details: parsed.error.message }, { status: 400 });
  }

  const { usuarioId, history, message, event } = parsed.data;
  const { response, history: updatedHistory } = await runAgentTurn({
    usuarioId,
    history,
    message,
    event,
  });

  const payload: ChatResponse = { response, history: updatedHistory };
  return NextResponse.json(payload);
}
