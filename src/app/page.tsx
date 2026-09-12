"use client";

import { useState } from "react";
import type { AgentUiResponse, ChatTurn, UiInteractionEvent } from "@/schemas/ui-catalog";
import { renderAgentComponent } from "@/ui-catalog/registry";
import { WidgetZone } from "@/widgets/widget-zone";
import { useWidgets } from "@/widgets/use-widgets";

const USER_ID = "u_ana";

export default function Home() {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { widgets, upsert, toggle } = useWidgets();

  async function sendRequest(body: { message: string } | { event: UiInteractionEvent }) {
    if (isLoading) return;

    setIsLoading(true);
    const requestHistory = history;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId: USER_ID,
          history: requestHistory,
          ...body,
        }),
      });

      const data = (await response.json()) as { response?: AgentUiResponse; history?: ChatTurn[]; error?: string };

      if (!response.ok || !data.response || !data.history) {
        throw new Error(data.error ?? "No se pudo procesar tu solicitud.");
      }

      setHistory(data.history);
      if (data.response.widget) {
        upsert(data.response.widget);
      }
    } catch (error) {
      console.error(error);
      const failedTurn: ChatTurn =
        "event" in body
          ? { role: "event", content: body.event }
          : { role: "user", content: body.message };
      setHistory((current) => [
        ...current,
        failedTurn,
        {
          role: "assistant",
          content: {
            reply: "No pude generar la respuesta. Intenta otra vez con otra solicitud.",
            components: [{ type: "text_block", text: "No pude generar la respuesta. Intenta otra vez con otra solicitud." }],
          },
        },
      ]);
    } finally {
      setIsLoading(false);
      setMessage("");
    }
  }

  function sendMessage(nextMessage: string) {
    const trimmed = nextMessage.trim();
    if (!trimmed) return;
    void sendRequest({ message: trimmed });
  }

  function handleComponentAction(componentId: string, value: unknown) {
    void sendRequest({ event: { componentId, value } });
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #edf5ff 100%)",
        color: "#0f172a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 20px 48px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ letterSpacing: 1.2, textTransform: "uppercase", color: "#475569", fontSize: 12, fontWeight: 700 }}>
              Banorte × Tec de Monterrey
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: 40 }}>UI financiera generativa</h1>
          </div>
          <div style={{ padding: "10px 14px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>
            Usuario: Ana García
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 20, alignItems: "start" }}>
          <section style={{ background: "rgba(255,255,255,0.8)", border: "1px solid #dfe7f5", borderRadius: 22, boxShadow: "0 16px 40px rgba(15, 23, 42, 0.05)", overflow: "hidden" }}>
            <div style={{ padding: 20, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <strong style={{ fontSize: 18 }}>Chat de análisis financiero</strong>
            </div>

            <div style={{ height: 520, overflowY: "auto", padding: 20, display: "grid", gap: 16 }}>
              {history.length === 0 ? (
                <div style={{ border: "1px dashed #cbd5e1", borderRadius: 16, padding: 16, color: "#475569", background: "#f8fafc" }}>
                  Pregúntale al agente por una meta de ahorro, un análisis de gastos o tu resumen de ingresos.
                </div>
              ) : null}

              {history.map((turn, index) => {
                if (turn.role === "user") {
                  return (
                    <div key={`${turn.role}-${index}`} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ maxWidth: "80%", background: "#0f172a", color: "white", borderRadius: 18, padding: "12px 14px" }}>
                        {typeof turn.content === "string" ? turn.content : "Mensaje"}
                      </div>
                    </div>
                  );
                }

                if (turn.role === "event") {
                  return (
                    <div key={`${turn.role}-${index}`} style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ maxWidth: "80%", background: "#e2e8f0", color: "#334155", borderRadius: 18, padding: "8px 12px", fontSize: 13 }}>
                        Interacción: {turn.content.componentId} → {String(turn.content.value)}
                      </div>
                    </div>
                  );
                }

                const content = turn.content as AgentUiResponse;
                return (
                  <div key={`${turn.role}-${index}`} style={{ display: "grid", gap: 12 }}>
                    <div style={{ fontWeight: 600, color: "#475569" }}>Agente</div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
                      <div style={{ color: "#334155", lineHeight: 1.5 }}>{content.reply}</div>
                      <div style={{ display: "grid", gap: 12 }}>
                        {content.components.map((component) =>
                          renderAgentComponent(component, { onAction: handleComponentAction })
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", color: "#475569" }}>El agente está pensando…</div>
              ) : null}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(message);
              }}
              style={{ display: "flex", gap: 12, padding: 20, borderTop: "1px solid #e2e8f0", background: "#ffffff" }}
            >
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ej. Quiero ahorrar 50,000 pesos en 8 meses"
                style={{ flex: 1, padding: "14px 16px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 15 }}
              />
              <button
                type="submit"
                disabled={isLoading}
                style={{ background: "#0f172a", color: "white", border: "none", borderRadius: 12, padding: "14px 20px", fontWeight: 700, cursor: isLoading ? "not-allowed" : "pointer" }}
              >
                Enviar
              </button>
            </form>
          </section>

          <aside style={{ display: "grid", gap: 16 }}>
            <WidgetZone widgets={widgets} onToggle={toggle} />

            <div style={{ background: "white", border: "1px solid #dfe7f5", borderRadius: 18, padding: 18 }}>
              <h3 style={{ margin: 0, marginBottom: 12 }}>Acciones guía</h3>
              <div style={{ display: "grid", gap: 10, color: "#334155" }}>
                <button type="button" onClick={() => void sendMessage("Quiero ahorrar 50,000 pesos en 8 meses")} style={{ textAlign: "left", background: "#f8fafc", border: "1px solid #dfe7f5", padding: "10px 12px", borderRadius: 10, cursor: "pointer" }}>
                  Meta de ahorro 50k / 8 meses
                </button>
                <button type="button" onClick={() => void sendMessage("Analiza mis gastos del último mes")} style={{ textAlign: "left", background: "#f8fafc", border: "1px solid #dfe7f5", padding: "10px 12px", borderRadius: 10, cursor: "pointer" }}>
                  Revisar gastos
                </button>
                <button type="button" onClick={() => void sendMessage("Resúmeme mi ingreso mensual")} style={{ textAlign: "left", background: "#f8fafc", border: "1px solid #dfe7f5", padding: "10px 12px", borderRadius: 10, cursor: "pointer" }}>
                  Resumen de ingresos
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
