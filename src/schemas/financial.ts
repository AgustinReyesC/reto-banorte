import { z } from "zod";

/**
 * Tipos de dominio financiero compartidos entre mcp/, agent/ y ui-catalog/.
 * Fechas siempre como string ISO "YYYY-MM-DD" para que crucen JSON sin ambigüedad.
 */

export const UsuarioSchema = z.object({
  id: z.string(),
  nombre: z.string(),
});
export type Usuario = z.infer<typeof UsuarioSchema>;

export const RangoFechaSchema = z.object({
  desde: z.string().date(),
  hasta: z.string().date(),
});
export type RangoFecha = z.infer<typeof RangoFechaSchema>;

export const CATEGORIAS_GASTO = [
  "vivienda",
  "comida",
  "transporte",
  "entretenimiento",
  "servicios",
  "salud",
  "compras",
  "otros",
] as const;
export const CategoriaGastoSchema = z.enum(CATEGORIAS_GASTO);
export type CategoriaGasto = z.infer<typeof CategoriaGastoSchema>;

/** monto > 0 = ingreso, monto < 0 = gasto */
export const TransaccionSchema = z.object({
  id: z.string(),
  usuarioId: z.string(),
  fecha: z.string().date(),
  monto: z.number(),
  categoria: CategoriaGastoSchema.or(z.literal("ingreso")),
  descripcion: z.string(),
});
export type Transaccion = z.infer<typeof TransaccionSchema>;

export const SavingsGoalSchema = z.object({
  widgetId: z.string(),
  usuarioId: z.string(),
  monto: z.number().positive(),
  meses: z.number().int().positive(),
  aporteMensual: z.number().positive(),
  acumulado: z.number().nonnegative(),
  creadoEn: z.string().datetime(),
  actualizadoEn: z.string().datetime(),
});
export type SavingsGoal = z.infer<typeof SavingsGoalSchema>;
