import { createInterface } from "node:readline/promises";
import type { ChatTurn, ChatResponse, UiComponent } from "@/schemas/ui-catalog";

/**
 * CLI para probar el agente sin necesidad de la UI real todavía.
 * Requiere que `npm run dev` esté corriendo en otra terminal.
 * Uso: npx tsx scripts/chat-cli.mts [usuarioId]
 */

const CHAT_URL = "http://localhost:3000/api/chat";
const usuarioId = process.argv[2] ?? "u_ana";

function printComponent(c: UiComponent): void {
  switch (c.type) {
    case "kpi_card":
      console.log(`  [KPI] ${c.label}: ${c.value}${c.helpText ? ` (${c.helpText})` : ""}`);
      break;
    case "progress_tracker":
      console.log(`  [PROGRESO] ${c.label}: ${c.current}/${c.target}${c.unit ? ` ${c.unit}` : ""}`);
      break;
    case "scenario_comparison":
      console.log(`  [ESCENARIOS]`);
      for (const s of c.scenarios) {
        console.log(
          `    - ${s.label}: $${s.aporteMensual}/mes x ${s.mesesRequeridos} meses (viable: ${s.viable})`
        );
      }
      break;
    case "cta_button":
      console.log(`  [BOTÓN:${c.id}] ${c.label} -> ${c.action}`);
      break;
    case "number_input_dialog":
      console.log(`  [PREGUNTA:${c.id}] ${c.label}${c.defaultValue !== undefined ? ` (default: ${c.defaultValue})` : ""}`);
      break;
    case "choice_dialog":
      console.log(`  [OPCIONES:${c.id}] ${c.label} -> [${c.options.map((o) => o.label).join(" | ")}]`);
      break;
    case "confirmation_dialog":
      console.log(`  [CONFIRMAR:${c.id}] ${c.message} (${c.confirmLabel} / ${c.cancelLabel})`);
      break;
    case "text_block":
      console.log(`  [TEXTO] ${c.text}`);
      break;
    case "list_block":
      console.log(`  [LISTA] ${c.items.join(", ")}`);
      break;
  }
}

async function main() {
  console.log(`Chateando como "${usuarioId}". Escribe "salir" para terminar.\n`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let history: ChatTurn[] = [];

  while (true) {
    let message: string;
    try {
      message = await rl.question("tú> ");
    } catch {
      break; // stdin se cerró (EOF) antes de escribir "salir"
    }
    if (message.trim().toLowerCase() === "salir") break;

    const res = await fetch(CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId, history, message }),
    });

    if (!res.ok) {
      console.log(`[error ${res.status}]`, await res.text());
      continue;
    }

    const data = (await res.json()) as ChatResponse;
    history = data.history;

    console.log(`\nagente> [${data.response.title}] ${data.response.reply} (scale ${data.response.scale})`);
    data.response.blocks.forEach((block) => printComponent(block.component));
    console.log();
  }

  rl.close();
}

main();
