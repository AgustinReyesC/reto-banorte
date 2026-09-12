import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { listMcpTools, callMcpTool } from "./mcp-client";
import { AgentUiResponseSchema, type AgentUiResponse, type ChatTurn } from "@/schemas/ui-catalog";

/**
 * Loop de tool-use: Claude puede llamar cualquiera de las 6 tools del MCP
 * para autocompletar información, o "emit_ui" para responder — nunca texto
 * libre. Garantiza salida estructurada validando emit_ui contra Zod antes
 * de confiar en ella.
 */

const anthropic = new Anthropic({ timeout: 30_000, maxRetries: 2 });
const MODEL = "claude-sonnet-5";
const MAX_TOOL_ITERATIONS = 6;
const MAX_QUESTIONS = 4;
const EMIT_UI_TOOL_NAME = "emit_ui";

const DIALOG_TYPES = new Set(["number_input_dialog", "choice_dialog", "confirmation_dialog"]);

function isDialogOnlyTurn(response: AgentUiResponse): boolean {
  return !response.widget && response.components.every((c) => DIALOG_TYPES.has(c.type));
}

function buildSystemPrompt(usuarioId: string, questionsAsked: number): string {
  const limitReached = questionsAsked >= MAX_QUESTIONS;
  const hoyDate = new Date();
  const hoy = hoyDate.toISOString().slice(0, 10);
  const haceUnAnio = new Date(hoyDate.getFullYear() - 1, hoyDate.getMonth(), hoyDate.getDate())
    .toISOString()
    .slice(0, 10);
  return `Eres el agente financiero de una app bancaria. NUNCA respondes con texto libre: cada turno tuyo debe terminar llamando la tool "${EMIT_UI_TOOL_NAME}".

Hoy es ${hoy}. Cuando llames a una tool que pida "rango" (desde/hasta), usa fechas ISO reales basadas en hoy — por ejemplo, para los últimos 12 meses usa desde=${haceUnAnio} hasta=${hoy}. Nunca inventes un rango de otro año.

Usuario actual: ${usuarioId}.

Caso principal: metas de ahorro. Antes de preguntarle algo al usuario, intenta obtener la información que te falte llamando a las tools del MCP disponibles (ingresos, gastos, meta de ahorro existente). Solo pregúntale al usuario lo que de verdad no puedas inferir de esas tools.

Ya le has hecho ${questionsAsked} pregunta(s) al usuario en esta conversación (máximo ${MAX_QUESTIONS}).${
    limitReached
      ? ` YA ALCANZASTE EL LÍMITE: no puedes pedir más información. Usa los valores que ya tengas (con supuestos razonables si falta algo) y da una solución final ahora mismo.`
      : ""
  }

Cuando tengas monto, meses y aporte mensual, usa simulate_savings_goal para mostrar la proyección antes de confirmar nada. Solo llama create_savings_goal después de que el usuario confirme explícitamente vía confirmation_dialog. Cuando el flujo se cierra con una acción real, incluye "widget" en tu respuesta de emit_ui con un resumen persistente (progress_tracker o kpi_card).`;
}

async function buildTools(): Promise<Anthropic.Tool[]> {
  const mcpTools = await listMcpTools();
  const mcpAsAnthropicTools: Anthropic.Tool[] = mcpTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
  }));

  const emitUiTool: Anthropic.Tool = {
    name: EMIT_UI_TOOL_NAME,
    description:
      "Responde al usuario. Es la ÚNICA forma válida de terminar tu turno: nunca respondas con texto libre.",
    input_schema: z.toJSONSchema(AgentUiResponseSchema) as Anthropic.Tool.InputSchema,
  };

  return [...mcpAsAnthropicTools, emitUiTool];
}

function fallbackResponse(reply: string): AgentUiResponse {
  return {
    reply,
    components: [{ type: "text_block", text: reply }],
  };
}

export interface AgentTurnResult {
  response: AgentUiResponse;
  history: ChatTurn[];
}

export async function runAgentTurn(params: {
  usuarioId: string;
  history: ChatTurn[];
  userMessage: string;
}): Promise<AgentTurnResult> {
  const { usuarioId, history, userMessage } = params;

  const finish = (response: AgentUiResponse): AgentTurnResult => ({
    response,
    history: [...history, { role: "user", content: userMessage }, { role: "assistant", content: response }],
  });

  try {
    const questionsAsked = history.filter(
      (turn) => turn.role === "assistant" && isDialogOnlyTurn(turn.content)
    ).length;

    const tools = await buildTools();

    const messages: Anthropic.MessageParam[] = [
      ...history.map(
        (turn): Anthropic.MessageParam =>
          turn.role === "user" ? { role: "user", content: turn.content } : { role: "assistant", content: JSON.stringify(turn.content) }
      ),
      { role: "user", content: userMessage },
    ];

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: buildSystemPrompt(usuarioId, questionsAsked),
        tools,
        tool_choice: { type: "any" },
        messages,
      });

      const toolUseBlocks = message.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        break;
      }

      const emitBlock = toolUseBlocks.find((block) => block.name === EMIT_UI_TOOL_NAME);
      const mcpBlocks = toolUseBlocks.filter((block) => block.name !== EMIT_UI_TOOL_NAME);

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of mcpBlocks) {
        try {
          const result = await callMcpTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result.text,
            is_error: result.isError,
          });
        } catch {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "No se pudo ejecutar la tool (error de conexión con el MCP).",
            is_error: true,
          });
        }
      }

      if (emitBlock) {
        const parsed = AgentUiResponseSchema.safeParse(emitBlock.input);
        if (parsed.success) {
          return finish(parsed.data);
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: emitBlock.id,
          content: `Tu respuesta no cumplió el schema del catálogo: ${parsed.error.message}. Corrígela y vuelve a llamar ${EMIT_UI_TOOL_NAME}.`,
          is_error: true,
        });
      }

      messages.push({ role: "assistant", content: message.content });
      messages.push({ role: "user", content: toolResults });
    }
  } catch (err) {
    console.error("runAgentTurn falló:", err);
  }

  return finish(
    fallbackResponse("Tuvimos un problema generando la respuesta. ¿Puedes reformular tu solicitud?")
  );
}
