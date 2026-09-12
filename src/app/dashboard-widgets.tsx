"use client";

/**
 * Widgets base "de cualquier banco" (tarjeta, acciones rápidas): son chrome
 * de la app, no parte del catálogo A2UI — el agente nunca los invoca, así
 * que viven aquí y no en src/ui-catalog/.
 */

export interface DashboardData {
  usuarioNombre: string;
  saldo: number;
  ingresoMensualPromedio: number;
  gastoMensualPromedio: number;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

export function CardDetailsTile({ holderName }: { holderName: string }) {
  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center" }}>
      <div
        style={{
          height: "100%",
          maxWidth: "100%",
          aspectRatio: "1.586 / 1",
          borderRadius: 16,
          background: "linear-gradient(135deg, var(--garnet-deep) 0%, var(--garnet) 55%, var(--garnet-deep) 100%)",
          color: "#fff",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          overflow: "hidden",
        }}
      >
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          right: -60,
          bottom: -80,
        }}
      />
      <div
        aria-hidden
        style={{
          width: 34,
          height: 25,
          borderRadius: 5,
          background: "linear-gradient(155deg, #f2d489, #c9a24f)",
        }}
      />
      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, letterSpacing: "0.12em", fontVariantNumeric: "tabular-nums" }}>
        •••• •••• •••• 4821
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 11 }}>
        <div>
          <p style={{ opacity: 0.7, margin: "0 0 2px", fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Titular</p>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, fontSize: 12, margin: 0 }}>{holderName}</p>
        </div>
        <div>
          <p style={{ opacity: 0.7, margin: "0 0 2px", fontSize: 9.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Vigencia</p>
          <p style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, fontSize: 12, margin: 0 }}>09/29</p>
        </div>
      </div>
      </div>
    </div>
  );
}

export function BalanceTile({ saldo, capacidadAhorro }: { saldo: number; capacidadAhorro: number }) {
  return (
    <div style={{ display: "grid", gap: 8, height: "100%", alignContent: "space-between" }}>
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>Saldo disponible</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            color: "var(--ink)",
          }}
        >
          {formatCurrency(saldo)}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>Cuenta eje · movimientos de los últimos 12 meses</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--gain)", fontWeight: 600 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 17 7" />
          <path d="M8 7h9v9" />
        </svg>
        {formatCurrency(capacidadAhorro)}
        <span style={{ color: "var(--ink-faint)", fontWeight: 400 }}>capacidad de ahorro / mes</span>
      </div>
    </div>
  );
}

const QUICK_ACTIONS: { label: string; enabled: boolean; icon: string }[] = [
  { label: "Transferir", enabled: false, icon: "M7 10 3 6l4-4 M3 6h12a5 5 0 0 1 5 5v1 M17 14l4 4-4 4 M21 18H9a5 5 0 0 1-5-5v-1" },
  { label: "Pagar", enabled: false, icon: "M3 5h18v14H3z M3 10h18 M7 15h4" },
  { label: "Depositar", enabled: false, icon: "M12 3v12 M7 10l5 5 5-5 M5 21h14" },
];

export function QuickActionsTile({ onStartGoal }: { onStartGoal: () => void }) {
  return (
    <div style={{ display: "grid", gap: 12, height: "100%", alignContent: "space-between" }}>
      <div style={{ color: "var(--ink-soft)", fontSize: 13 }}>Acciones rápidas</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            disabled={!action.enabled}
            title={action.enabled ? undefined : "Próximamente"}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 7,
              background: "none",
              border: "none",
              color: "var(--ink)",
              cursor: action.enabled ? "pointer" : "not-allowed",
              padding: "4px 0",
              opacity: action.enabled ? 1 : 0.5,
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 13,
                background: "var(--garnet-soft)",
                color: "var(--garnet)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={action.icon} />
              </svg>
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>{action.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onStartGoal}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 7,
            background: "none",
            border: "none",
            color: "var(--ink)",
            cursor: "pointer",
            padding: "4px 0",
          }}
        >
          <span
            style={{
              width: 42,
              height: 42,
              borderRadius: 13,
              background: "var(--garnet-soft)",
              color: "var(--garnet)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8.5" />
              <circle cx="12" cy="12" r="4.2" />
            </svg>
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-soft)" }}>Metas</span>
        </button>
      </div>
    </div>
  );
}
