"use client";

import { useState } from "react";
import { Dashboard } from "@/app/dashboard";
import { AgentScreenView } from "@/app/agent-screen";
import type { DashboardData } from "@/app/dashboard-widgets";

type Tab = "inicio" | "agente";

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "M3 11 12 4l9 7 M5 10v10h14V10" },
  { id: "agente", label: "Agente financiero", icon: "M21 11.5a8.4 8.4 0 0 1-8.8 8.5 8.6 8.6 0 0 1-3.6-.8L4 20l1-4.4A8.4 8.4 0 0 1 12.5 3a8.4 8.4 0 0 1 8.5 8.5Z" },
];

export function AppShell({ usuarioId, usuarioNombre, dashboardData }: { usuarioId: string; usuarioNombre: string; dashboardData: DashboardData }) {
  const [tab, setTab] = useState<Tab>("inicio");
  const [startPrompt, setStartPrompt] = useState<string | undefined>(undefined);

  function goToAgentWithPrompt(prompt: string) {
    setStartPrompt(prompt);
    setTab("agente");
  }

  const initials = usuarioNombre
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          background: "linear-gradient(180deg, var(--garnet-deep) 0%, #4a0416 100%)",
          color: "#fff",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.14)",
              border: "1px solid rgba(255,255,255,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>Buenas tardes</div>
            <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{usuarioNombre}</div>
          </div>
        </div>

        <nav style={{ display: "grid", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  borderRadius: 11,
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 14,
                  fontWeight: 600,
                  background: active ? "rgba(255,255,255,0.14)" : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.7)",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "28px clamp(20px, 4vw, 48px)", background: "var(--paper)" }}>
        {tab === "inicio" ? (
          <Dashboard
            usuarioId={usuarioId}
            dashboardData={dashboardData}
            onStartGoal={() => goToAgentWithPrompt("Quiero crear una meta de ahorro")}
          />
        ) : (
          <AgentScreenView
            usuarioId={usuarioId}
            startPrompt={startPrompt}
            onPromptHandled={() => setStartPrompt(undefined)}
            onExported={() => setTab("inicio")}
          />
        )}
      </main>
    </div>
  );
}
