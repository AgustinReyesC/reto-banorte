import type { Transaccion, CategoriaGasto } from "@/schemas/financial";
import { CATEGORIAS_GASTO } from "@/schemas/financial";
import { USUARIOS } from "./usuarios";

/**
 * Generador determinista de transacciones sintéticas (PRNG con seed por usuario)
 * para que la demo sea reproducible entre corridas del dev server.
 */

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const GASTOS_POR_CATEGORIA: Record<CategoriaGasto, { min: number; max: number; countMin: number; countMax: number }> = {
  vivienda: { min: 3500, max: 4500, countMin: 1, countMax: 1 },
  comida: { min: 150, max: 900, countMin: 4, countMax: 8 },
  transporte: { min: 80, max: 400, countMin: 3, countMax: 6 },
  entretenimiento: { min: 100, max: 800, countMin: 1, countMax: 4 },
  servicios: { min: 200, max: 900, countMin: 2, countMax: 3 },
  salud: { min: 100, max: 1500, countMin: 0, countMax: 2 },
  compras: { min: 200, max: 2000, countMin: 1, countMax: 3 },
  otros: { min: 50, max: 500, countMin: 0, countMax: 2 },
};

const SALARIO_BASE_POR_USUARIO: Record<string, number> = {
  u_ana: 18000,
  u_carlos: 25000,
};

function generarTransaccionesUsuario(usuarioId: string, mesesHistoria: number, referencia: Date): Transaccion[] {
  const rng = mulberry32(hashSeed(usuarioId));
  const transacciones: Transaccion[] = [];
  const salarioBase = SALARIO_BASE_POR_USUARIO[usuarioId] ?? 15000;
  let contador = 0;

  for (let m = mesesHistoria - 1; m >= 0; m--) {
    const mesRef = new Date(referencia.getFullYear(), referencia.getMonth() - m, 1);
    const anio = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const diasEnMes = new Date(anio, mes + 1, 0).getDate();

    // Nómina quincenal
    for (const dia of [5, 20]) {
      if (dia > diasEnMes) continue;
      const monto = Math.round(salarioBase / 2 + randomInt(rng, -300, 300));
      transacciones.push({
        id: `${usuarioId}_tx_${contador++}`,
        usuarioId,
        fecha: toIsoDate(new Date(anio, mes, dia)),
        monto,
        categoria: "ingreso",
        descripcion: "Nómina",
      });
    }

    // Gastos por categoría
    for (const categoria of CATEGORIAS_GASTO) {
      const cfg = GASTOS_POR_CATEGORIA[categoria];
      const count = randomInt(rng, cfg.countMin, cfg.countMax);
      for (let i = 0; i < count; i++) {
        const monto = -randomInt(rng, cfg.min, cfg.max);
        const dia = randomInt(rng, 1, diasEnMes);
        transacciones.push({
          id: `${usuarioId}_tx_${contador++}`,
          usuarioId,
          fecha: toIsoDate(new Date(anio, mes, dia)),
          monto,
          categoria,
          descripcion: `${categoria} #${i + 1}`,
        });
      }
    }
  }

  return transacciones.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

const MESES_HISTORIA = 12;
const REFERENCIA = new Date();

export const TRANSACCIONES: Transaccion[] = USUARIOS.flatMap((u) =>
  generarTransaccionesUsuario(u.id, MESES_HISTORIA, REFERENCIA)
);
