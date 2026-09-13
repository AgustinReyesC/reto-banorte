import { promises as fs } from "fs";
import path from "path";
import type { SavingsGoal } from "@/schemas/financial";

/**
 * Persistencia real (archivo JSON local) para la única acción del reto que
 * debe sobrevivir entre requests: crear/actualizar una meta de ahorro.
 * Suficiente para la demo; no concurrente-safe a propósito.
 */

interface DbShape {
  savingsGoals: Record<string, SavingsGoal>;
}

const DB_PATH = path.join(process.cwd(), "src", "data", "db.local.json");

async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw) as DbShape;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { savingsGoals: {} };
    }
    throw err;
  }
}

async function writeDb(db: DbShape): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function widgetIdForSavingsGoal(usuarioId: string): string {
  return `savings_goal_${usuarioId}`;
}

export async function getSavingsGoal(usuarioId: string): Promise<SavingsGoal | null> {
  const db = await readDb();
  return db.savingsGoals[usuarioId] ?? null;
}


export async function upsertSavingsGoal(
  usuarioId: string,
  data: { monto: number; meses: number; aporteMensual: number }
): Promise<SavingsGoal> {
  const db = await readDb();
  const existing = db.savingsGoals[usuarioId];
  const now = new Date().toISOString();

  const goal: SavingsGoal = {
    widgetId: widgetIdForSavingsGoal(usuarioId),
    usuarioId,
    monto: data.monto,
    meses: data.meses,
    aporteMensual: data.aporteMensual,
    acumulado: existing?.acumulado ?? 0,
    creadoEn: existing?.creadoEn ?? now,
    actualizadoEn: now,
  };

  db.savingsGoals[usuarioId] = goal;
  await writeDb(db);
  return goal;
}


