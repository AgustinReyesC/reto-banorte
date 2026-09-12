import type { Transaccion, RangoFecha, CategoriaGasto } from "@/schemas/financial";
import { CATEGORIAS_GASTO } from "@/schemas/financial";

/**
 * Cálculos financieros puros. El LLM nunca produce estos números: los lee
 * de aquí a través de las tools del MCP.
 */

export function filtrarPorUsuarioYRango(
  transacciones: Transaccion[],
  usuarioId: string,
  rango: RangoFecha
): Transaccion[] {
  return transacciones.filter(
    (t) => t.usuarioId === usuarioId && t.fecha >= rango.desde && t.fecha <= rango.hasta
  );
}

/** Número de meses (mínimo 1) cubiertos por el rango, para promediar. */
export function mesesEnRango(rango: RangoFecha): number {
  const desde = new Date(rango.desde);
  const hasta = new Date(rango.hasta);
  const meses =
    (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + 1;
  return Math.max(1, meses);
}

export function calcularResumenIngresos(transacciones: Transaccion[], rango: RangoFecha) {
  const ingresos = transacciones.filter((t) => t.monto > 0);
  const totalIngresos = round2(ingresos.reduce((sum, t) => sum + t.monto, 0));
  const promedioMensual = round2(totalIngresos / mesesEnRango(rango));
  return {
    totalIngresos,
    promedioMensual,
    numTransacciones: ingresos.length,
  };
}

export function calcularDesgloseGastos(transacciones: Transaccion[]) {
  const gastos = transacciones.filter((t) => t.monto < 0);
  const totalGastos = round2(gastos.reduce((sum, t) => sum + Math.abs(t.monto), 0));

  const montosPorCategoria = new Map<CategoriaGasto, number>();
  for (const categoria of CATEGORIAS_GASTO) montosPorCategoria.set(categoria, 0);
  for (const t of gastos) {
    const categoria = t.categoria as CategoriaGasto;
    montosPorCategoria.set(categoria, (montosPorCategoria.get(categoria) ?? 0) + Math.abs(t.monto));
  }

  const categorias = CATEGORIAS_GASTO.filter((c) => (montosPorCategoria.get(c) ?? 0) > 0).map((categoria) => {
    const monto = round2(montosPorCategoria.get(categoria) ?? 0);
    return {
      categoria,
      monto,
      porcentaje: totalGastos > 0 ? round2((monto / totalGastos) * 100) : 0,
    };
  });

  return { totalGastos, categorias };
}

interface SimulacionInput {
  monto: number;
  meses: number;
  aporteMensual?: number;
}

export function simularMetaAhorro({ monto, meses, aporteMensual }: SimulacionInput) {
  const aporte = aporteMensual ?? monto / meses;
  // Epsilon evita que el redondeo de punto flotante convierta un caso exacto
  // (ej. 5000 / 6 meses) en "un mes de más" al hacer ceil.
  const mesesRequeridos = Math.ceil(monto / aporte - 1e-9);

  const horizonte = Math.max(meses, mesesRequeridos);
  const proyeccion: { mes: number; acumulado: number }[] = [];
  for (let mes = 1; mes <= horizonte; mes++) {
    proyeccion.push({ mes, acumulado: round2(Math.min(aporte * mes, monto)) });
  }

  return {
    viable: mesesRequeridos <= meses,
    aporteMensualRequerido: round2(monto / meses),
    mesesRequeridos,
    proyeccion,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
