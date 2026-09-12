"use client";

import { useEffect, useState } from "react";
import type { AgentUiResponse, ChatTurn, UiInteractionEvent } from "@/schemas/ui-catalog";
import { renderAgentComponent } from "@/ui-catalog/registry";
import { useWidgets } from "@/widgets/use-widgets";

const SUGGESTIONS = [
  "Quiero ahorrar 50,000 pesos en 8 meses",
  "Analiza mis gastos del último mes",
  "Resúmeme mi ingreso mensual",
];

export function AgentChat({ usuarioId, startPrompt }: { usuarioId: string; startPrompt?: string }) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { upsert } = useWidgets();

  useEffect(() => {
    if (startPrompt) setMessage(startPrompt);
  }, [startPrompt]);

  async function sendRequest(body: { message: string } | { event: UiInteractionEvent }) {
    if (isLoading) return;

    setIsLoading(true);
    const requestHistory = history;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuarioId,
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
        "event" in body ? { role: "event", content: body.event } : { role: "user", content: body.message };
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
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: "0 0 20px" }}>Agente financiero</h1>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "1fr auto",
          height: "calc(100vh - 160px)",
          maxHeight: 720,
        }}
      >
        <div style={{ overflowY: "auto", padding: 20, display: "grid", gap: 16, alignContent: "start" }}>
          {history.length === 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: 14,
                  padding: 16,
                  color: "var(--ink-soft)",
                  background: "var(--surface-sunken)",
                  fontSize: 14,
                }}
              >
                Pregúntale al agente por una meta de ahorro, un análisis de gastos o tu resumen de ingresos.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendMessage(s)}
                    style={{
                      background: "var(--garnet-soft)",
                      color: "var(--garnet-deep)",
                      border: "none",
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {history.map((turn, index) => {
            if (turn.role === "user") {
              return (
                <div key={`${turn.role}-${index}`} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ maxWidth: "80%", background: "var(--ink)", color: "#fff", borderRadius: 16, padding: "12px 14px", fontSize: 14 }}>
                    {typeof turn.content === "string" ? turn.content : "Mensaje"}
                  </div>
                </div>
              );
            }

            if (turn.role === "event") {
              return (
                <div key={`${turn.role}-${index}`} style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div
                    style={{
                      maxWidth: "80%",
                      background: "var(--surface-sunken)",
                      color: "var(--ink-soft)",
                      borderRadius: 16,
                      padding: "8px 12px",
                      fontSize: 12.5,
                    }}
                  >
                    Interacción: {turn.content.componentId} → {String(turn.content.value)}
                  </div>
                </div>
              );
            }

            const content = turn.content as AgentUiResponse;
            return (
              <div key={`${turn.role}-${index}`} style={{ display: "grid", gap: 10 }}>
                <div style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Agente
                </div>
                <div
                  style={{
                    background: "var(--surface-sunken)",
                    border: "1px solid var(--line)",
                    borderRadius: 16,
                    padding: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  <div style={{ color: "var(--ink)", lineHeight: 1.5, fontSize: 14.5 }}>{content.reply}</div>
                  <div style={{ display: "grid", gap: 12 }}>
                    {content.components.map((component) => renderAgentComponent(component, { onAction: handleComponentAction }))}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading ? <div style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13 }}>El agente está pensando…</div> : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(message);
          }}
          style={{ display: "flex", gap: 10, padding: 16, borderTop: "1px solid var(--line)", background: "var(--surface)" }}
        >
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ej. Quiero ahorrar 50,000 pesos en 8 meses"
            style={{
              flex: 1,
              padding: "13px 15px",
              borderRadius: 11,
              border: "1px solid var(--line)",
              fontSize: 14.5,
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: "var(--garnet)",
              color: "#fff",
              border: "none",
              borderRadius: 11,
              padding: "13px 20px",
              fontWeight: 700,
              fontSize: 14,
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}
