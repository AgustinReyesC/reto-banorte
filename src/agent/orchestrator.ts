import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { listMcpTools, callMcpTool } from "./mcp-client";
import { AgentScreenSchema, type AgentScreen, type ChatTurn, type UiInteractionEvent } from "@/schemas/ui-catalog";

/**
 * Loop de tool-use: Claude puede llamar cualquiera de las 6 tools del MCP
 * para autocompletar información, o "emit_ui" para responder — nunca texto
 * libre. Garantiza salida estructurada validando emit_ui contra Zod antes
 * de confiar en ella. La respuesta es una "pantalla": bloques del catálogo
 * con un tamaño de grilla, listos para organizarse y exportarse como widget.
 */

const anthropic = new Anthropic({ timeout: 30_000, maxRetries: 2 });
const MODEL = "claude-sonnet-5";
const MAX_TOOL_ITERATIONS = 6;
const MAX_QUESTIONS = 4;
const EMIT_UI_TOOL_NAME = "emit_ui";

const DIALOG_TYPES = new Set(["number_input_dialog", "choice_dialog", "confirmation_dialog"]);

function isDialogOnlyTurn(screen: AgentScreen): boolean {
  return screen.blocks.every((block) => DIALOG_TYPES.has(block.component.type));
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

Cada llamada a ${EMIT_UI_TOOL_NAME} devuelve una PANTALLA, no un mensaje de chat:
- "title": título corto de la pantalla.
- "reply": una o dos frases de contexto para el usuario.
- "scale": factor de tamaño del widget (0.5 a 2, normal = 1). Escala proporcionalmente todos los bloques.
- "exportable": true si la pantalla es un widget que puede guardarse en Inicio; false si es solo un aviso (por ejemplo, una solicitud fuera de alcance).
- "refreshable": true si el widget muestra datos que cambian (ingresos, gastos, saldos, proyecciones) y conviene actualizarlo periódicamente; false si es estático (confirmaciones, avisos, textos).
- "blocks": los componentes que forman la pantalla. Cada bloque es { id, component, w, h }: "id" único, "component" un objeto del catálogo, y "w" (1-8) / "h" (1-6) su tamaño en celdas de una cuadrícula de 8 columnas. Tú NO eliges la posición: el usuario podrá organizar los bloques y exportar la pantalla como widget. Reparte tamaños razonables y consistentes (ej. kpi_card 2x1, trend_chart 4x2, progress_tracker 4x1, summary_table 4x2, breakdown_chart 4x2, timeline 4x2). Evita bloques angostos y muy altos (ej. 1x5): desperdician espacio y se ven mal. Los gráficos y tablas deben ser anchos (3-4 columnas) y de 2 filas.

Componentes del catálogo (usa solo estos):
- Diálogos: number_input_dialog {id,label,placeholder?,min?,max?,defaultValue?}, choice_dialog {id,label,options:[{value,label}]}, confirmation_dialog {id,message,confirmLabel,cancelLabel}.
- Display: kpi_card {label,value,helpText?}, progress_tracker {label,current,target,unit?}, scenario_comparison {scenarios:[{label,aporteMensual,mesesRequeridos,viable}]}, breakdown_chart {title?,unit?,segments:[{label,value,percentage?}]}, trend_chart {title?,unit?,points:[{label,value}]}, summary_table {title?,columns:[...],rows:[[...]]}, slider {id,label,min,max,step?,defaultValue?,unit?}, timeline {title?,items:[{label,detail?}]}, alert_card {title,message,tone?:info|success|warning|danger}, cta_button {id,label,action,payload?}.
- Fallback: text_block {text}, list_block {items}.

Tamaño del widget:
- Si pide "hazlo más chico / más compacto / resúmelo / solo lo esencial": resume la pantalla a sus características esenciales. Conserva solo 1 a 3 bloques imprescindibles (típicamente el progress_tracker y los kpi_cards clave) y elimina el detalle secundario (tablas largas, timelines, gráficas, textos de relleno). Puedes bajar un poco "scale" (ej. 0.85) para que quede más compacto.
- Si pide "hazlo más grande / con más detalle / muéstrame todo": vuelve a agregar los bloques de detalle (proyección, desglose, timeline, tabla) además de los esenciales, y sube "scale" (ej. 1.2).
- El tamaño siempre se ajusta con "scale" (0.5 a 2, normal = 1), que multiplica w y h de todos los bloques por el mismo factor para conservar la relación de aspecto. Nunca deformes un bloque cambiando "w" y "h" por separado ni con factores distintos.

Adaptación al tamaño del contenedor: si el mensaje pide adaptar el widget a un tamaño (por ejemplo "adáptalo a 4 columnas por 3 filas"), reemite la MISMA información y datos, pero reorganizada para caber en ese tamaño. El ancho máximo es 8 columnas y el alto indicado incluye una fila de encabezado, así que los bloques deben ocupar a lo más "columnas" de ancho y "filas - 1" de alto (máximo 6). Si el espacio es chico, prioriza lo esencial y usa bloques angostos (1-2 columnas); si es grande, aprovecha para mostrar más detalle. No inventes ni quites datos importantes y no pidas confirmación.

Caso principal: metas de ahorro. Antes de preguntarle algo al usuario, intenta obtener la información que te falte llamando a las tools del MCP disponibles (ingresos, gastos, meta de ahorro existente). Solo pregúntale al usuario lo que de verdad no puedas inferir de esas tools.

Alcance: solo atiendes temas financieros del usuario (ingresos, gastos, ahorro, metas). Si la solicitud está fuera de alcance, devuelve una pantalla de aviso con un único text_block que lo explique, "exportable": false y sin inventar datos. Marca "exportable": false también para pantallas que solo piden un dato o avisan de un error. Reserva "exportable": true para pantallas que sí son un widget con información financiera real.

Actualización de widgets: si el mensaje pide actualizar/refrescar los datos ("actualiza los datos de este widget"), vuelve a llamar las tools del MCP necesarias con el rango vigente y reemite la MISMA pantalla (mismo "title", mismos bloques y mismo diseño) con los valores actualizados. No cambies la estructura ni pidas confirmación.

Ya le has hecho ${questionsAsked} pregunta(s) al usuario en esta conversación (máximo ${MAX_QUESTIONS}).${
    limitReached
      ? ` YA ALCANZASTE EL LÍMITE: no puedes pedir más información. Usa los valores que ya tengas (con supuestos razonables si falta algo) y da una solución final ahora mismo.`
      : ""
  }

Cuando necesites un dato del usuario, devuelve una pantalla con un solo bloque de diálogo. Cuando tengas monto, meses y aporte mensual, usa simulate_savings_goal para mostrar la proyección en una pantalla (progress_tracker, trend_chart, scenario_comparison) antes de confirmar nada. Solo llama create_savings_goal después de que el usuario confirme explícitamente vía confirmation_dialog. Cuando el flujo se cierre con una acción real, arma una pantalla final completa de la meta: progress_tracker con acumulado vs monto objetivo, kpi_cards (aporte mensual, plazo en meses, faltante) y un summary_table o timeline con la proyección.`;
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
      "Devuelve una pantalla al usuario. Es la ÚNICA forma válida de terminar tu turno: nunca respondas con texto libre.",
    input_schema: z.toJSONSchema(AgentScreenSchema) as Anthropic.Tool.InputSchema,
  };

  return [...mcpAsAnthropicTools, emitUiTool];
}

function fallbackResponse(reply: string): AgentScreen {
  return {
    title: "No se pudo generar la pantalla",
    reply,
    scale: 1,
    exportable: false,
    refreshable: false,
    blocks: [{ id: "fallback", component: { type: "text_block", text: reply }, w: 4, h: 1 }],
  };
}

/** Convierte una interacción de UI en contexto legible para el modelo. */
function describeEvent(event: UiInteractionEvent): string {
  return `[evento] El usuario interactuó con el componente "${event.componentId}" y devolvió: ${JSON.stringify(event.value)}`;
}

function toAnthropicMessage(turn: ChatTurn): Anthropic.MessageParam {
  if (turn.role === "assistant") {
    return { role: "assistant", content: JSON.stringify(turn.content) };
  }
  if (turn.role === "event") {
    return { role: "user", content: describeEvent(turn.content) };
  }
  return { role: "user", content: turn.content };
}

export interface AgentTurnResult {
  response: AgentScreen;
  history: ChatTurn[];
}

export async function runAgentTurn(params: {
  usuarioId: string;
  history: ChatTurn[];
  message?: string;
  event?: UiInteractionEvent;
}): Promise<AgentTurnResult> {
  const { usuarioId, history, message, event } = params;

  const currentTurn: ChatTurn = event
    ? { role: "event", content: event }
    : { role: "user", content: message ?? "" };

  const finish = (response: AgentScreen): AgentTurnResult => ({
    response,
    history: [...history, currentTurn, { role: "assistant", content: response }],
  });

  try {
    const questionsAsked = history.filter(
      (turn) => turn.role === "assistant" && isDialogOnlyTurn(turn.content)
    ).length;

    const currentUserContent = event ? describeEvent(event) : message ?? "";

    const tools = await buildTools();

    const messages: Anthropic.MessageParam[] = [
      ...history.map(toAnthropicMessage),
      { role: "user", content: currentUserContent },
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
        const parsed = AgentScreenSchema.safeParse(emitBlock.input);
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
