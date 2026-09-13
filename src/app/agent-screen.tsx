"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentScreen, ChatTurn, UiInteractionEvent } from "@/schemas/ui-catalog";
import { ScreenCanvas } from "@/app/screen-canvas";
import { useWidgets } from "@/widgets/use-widgets";
import type { PlacedBlock } from "@/widgets/store";
import { screenToBlocks, trimBlocks, SCREEN_COLS } from "@/widgets/screen-utils";

const COLS = SCREEN_COLS;
const COL_WIDTH = 112;

const SUGGESTIONS = [
  "Quiero ahorrar 50,000 pesos en 8 meses",
  "Analiza mis gastos del último mes",
  "Resúmeme mi ingreso mensual",
];

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `screen-${Date.now()}`;
}

function Spinner({ size = 14, light = false }: { size?: number; light?: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${light ? "rgba(255,255,255,0.4)" : "var(--line)"}`,
        borderTopColor: light ? "#fff" : "var(--garnet)",
        animation: "agent-spin 0.8s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

export function AgentScreenView({
  usuarioId,
  startPrompt,
  onExported,
  onPromptHandled,
}: {
  usuarioId: string;
  startPrompt?: string;
  onExported?: () => void;
  onPromptHandled?: () => void;
}) {
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [screen, setScreen] = useState<AgentScreen | null>(null);
  const [blocks, setBlocks] = useState<PlacedBlock[]>([]);
  const [screenId, setScreenId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [exported, setExported] = useState(false);
  const { upsert } = useWidgets();
  const hasHandledPrompt = useRef(false);

  useEffect(() => {
    if (startPrompt && !hasHandledPrompt.current) {
      hasHandledPrompt.current = true;
      void sendRequest({ message: startPrompt });
      onPromptHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPrompt]);

  function applyScreen(next: AgentScreen) {
    setScreen(next);
    setBlocks(screenToBlocks(next));
    setScreenId(newId());
    setEditMode(false);
    setExported(false);
  }

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

      const data = (await response.json()) as { response?: AgentScreen; history?: ChatTurn[]; error?: string };

      if (!response.ok || !data.response || !data.history) {
        throw new Error(data.error ?? "No se pudo procesar tu solicitud.");
      }

      setHistory(data.history);
      applyScreen(data.response);
    } catch (error) {
      console.error(error);
      applyScreen({
        title: "No se pudo generar la pantalla",
        reply: "No pude generar la respuesta. Intenta otra vez con otra solicitud.",
        scale: 1,
        exportable: false,
        refreshable: false,
        blocks: [
          {
            id: "error",
            component: { type: "text_block", text: "No pude generar la respuesta. Intenta otra vez con otra solicitud." },
            w: 4,
            h: 1,
          },
        ],
      });
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

  function exportWidget() {
    if (!screen || !screen.exportable) return;
    // El widget ocupa solo el área que realmente usa su contenido y guarda el
    // contexto (usuario + historial) para poder ser interactivo y refrescarse.
    const { cols, blocks: normalized } = trimBlocks(blocks);
    upsert({
      widgetId: screenId,
      title: screen.title,
      cols,
      blocks: normalized,
      usuarioId,
      history,
      refreshable: screen.refreshable,
    });
    setExported(true);
    onExported?.();
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, margin: "0 0 20px" }}>Agente financiero</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(message);
        }}
        style={{ display: "flex", gap: 10, marginBottom: 16 }}
      >
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Describe qué pantalla necesitas. Ej. Quiero ahorrar 50,000 pesos en 8 meses"
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
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            background: "var(--garnet)",
            color: "#fff",
            border: "none",
            borderRadius: 11,
            padding: "13px 20px",
            fontWeight: 700,
            fontSize: 14,
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.85 : 1,
          }}
        >
          {isLoading ? <Spinner light /> : null}
          {isLoading ? "Generando…" : "Generar"}
        </button>
      </form>

      {isLoading && !screen ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "1px dashed var(--line)",
            borderRadius: 14,
            padding: 24,
            color: "var(--ink-soft)",
            background: "var(--surface-sunken)",
            fontSize: 14,
          }}
        >
          <Spinner size={18} />
          El agente está generando tu pantalla…
        </div>
      ) : !screen ? (
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
            Pídele al agente una pantalla: una meta de ahorro, un análisis de gastos o tu resumen de ingresos. Luego podrás organizarla y exportarla como widget.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion)}
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
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 18,
            padding: 20,
            display: "grid",
            gap: 16,
          }}
        >
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, margin: "0 0 6px" }}>{screen.title}</h2>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.5 }}>{screen.reply}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => sendMessage("Hazlo más chico")}
                disabled={isLoading}
                style={{
                  background: "var(--surface)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                − Más chico
              </button>
              <button
                type="button"
                onClick={() => sendMessage("Hazlo más grande")}
                disabled={isLoading}
                style={{
                  background: "var(--surface)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "9px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                + Más grande
              </button>
              <button
                type="button"
                onClick={() => setEditMode((value) => !value)}
                style={{
                  background: editMode ? "var(--garnet)" : "var(--surface)",
                  color: editMode ? "#fff" : "var(--ink)",
                  border: `1px solid ${editMode ? "var(--garnet)" : "var(--line)"}`,
                  borderRadius: 10,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {editMode ? "Listo" : "Organizar"}
              </button>
              <button
                type="button"
                onClick={exportWidget}
                disabled={!screen.exportable || exported}
                title={!screen.exportable ? "Esta respuesta no se puede exportar como widget" : undefined}
                style={{
                  background: exported
                    ? "var(--gain-soft)"
                    : screen.exportable
                      ? "var(--garnet)"
                      : "var(--surface-sunken)",
                  color: exported ? "var(--gain)" : screen.exportable ? "#fff" : "var(--ink-faint)",
                  border: screen.exportable ? "none" : "1px solid var(--line)",
                  borderRadius: 10,
                  padding: "9px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !screen.exportable || exported ? "not-allowed" : "pointer",
                  opacity: !screen.exportable ? 0.75 : 1,
                }}
              >
                {exported ? "Exportado al Inicio" : screen.exportable ? "Exportar al Inicio" : "No exportable"}
              </button>
            </div>
          </header>

          {editMode ? (
            <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13 }}>
              Arrastra cada bloque para moverlo y usa la esquina inferior derecha para redimensionarlo.
            </p>
          ) : null}

          {isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "var(--ink-soft)",
                fontSize: 13.5,
                background: "var(--surface-sunken)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: "10px 14px",
              }}
            >
              <Spinner />
              Generando una nueva pantalla…
            </div>
          ) : null}

          <div style={{ opacity: isLoading ? 0.5 : 1, transition: "opacity 150ms ease", pointerEvents: isLoading ? "none" : "auto", overflowX: "auto" }}>
            <ScreenCanvas
              blocks={blocks}
              cols={COLS}
              colWidth={COL_WIDTH}
              editable={editMode}
              onChange={setBlocks}
              onAction={handleComponentAction}
            />
          </div>
        </section>
      )}
    </div>
  );
}
