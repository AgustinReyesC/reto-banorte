import { getIncomeSummary } from "@/mcp/tools/get-income-summary";
import { getExpenseBreakdown } from "@/mcp/tools/get-expense-breakdown";
import { getTransactions } from "@/mcp/tools/get-transactions";
import { getUsuario } from "@/data/fixtures/usuarios";
import { AppShell } from "@/app/app-shell";
import type { DashboardData } from "@/app/dashboard-widgets";

const USER_ID = "u_ana";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function loadDashboardData(usuarioId: string): Promise<DashboardData> {
  const rango = { desde: isoDaysAgo(365), hasta: isoDaysAgo(0) };

  const [income, expense, transacciones] = await Promise.all([
    getIncomeSummary({ usuarioId, rango }),
    getExpenseBreakdown({ usuarioId, rango }),
    getTransactions({ usuarioId, rango: { desde: isoDaysAgo(730), hasta: isoDaysAgo(0) } }),
  ]);

  const saldo = transacciones.transacciones.reduce((sum, t) => sum + t.monto, 0);

  return {
    usuarioNombre: getUsuario(usuarioId)?.nombre ?? usuarioId,
    saldo,
    ingresoMensualPromedio: income.promedioMensual,
    gastoMensualPromedio: expense.totalGastos / 12,
  };
}

export default async function Home() {
  const dashboardData = await loadDashboardData(USER_ID);

  return <AppShell usuarioId={USER_ID} usuarioNombre={dashboardData.usuarioNombre} dashboardData={dashboardData} />;
}
