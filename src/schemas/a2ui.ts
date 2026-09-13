import { z } from "zod";

/**
 * Subconjunto del protocolo A2UI v0.9.1 (Agent-to-User Interface).
 *
 * A2UI modela la UI como una lista plana de componentes (adjacency list) que
 * se referencian por `id`, más un data model separado. El servidor (agente)
 * envía mensajes `createSurface`, `updateComponents`, `updateDataModel` y
 * `deleteSurface`; el cliente los renderiza con su propio catálogo.
 *
 * Aquí usamos un catálogo propio (ver src/a2ui/catalog.ts) para mapear los
 * tipos del catálogo de Banorte (kpi_card, progress_tracker, ...) a
 * componentes A2UI.
 */

export const A2UI_VERSION = "v0.9.1";
export const A2UI_CATALOG_ID = "https://reto-banorte.example/a2ui/v0.9.1/catalog.json";

/** Posición/tamaño del componente dentro del lienzo de la pantalla (extensión del catálogo). */
export const A2uiLayoutSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});
export type A2uiLayout = z.infer<typeof A2uiLayoutSchema>;

/** Un componente A2UI: `{ id, component, ...props, children? }`. */
export const A2uiComponentSchema = z
  .object({
    id: z.string(),
    component: z.string(),
    children: z.array(z.string()).optional(),
    layout: A2uiLayoutSchema.optional(),
  })
  .passthrough();
export type A2uiComponent = z.infer<typeof A2uiComponentSchema>;

/** Una surface resuelta: los componentes y su data model. */
export const A2uiSurfaceSchema = z.object({
  surfaceId: z.string(),
  catalogId: z.string(),
  components: z.array(A2uiComponentSchema),
  dataModel: z.record(z.string(), z.unknown()).default({}),
});
export type A2uiSurface = z.infer<typeof A2uiSurfaceSchema>;

// --- Mensajes server → client (envelope) ---

export const CreateSurfaceSchema = z.object({
  surfaceId: z.string(),
  catalogId: z.string(),
  theme: z.record(z.string(), z.unknown()).optional(),
  sendDataModel: z.boolean().optional(),
});

export const UpdateComponentsSchema = z.object({
  surfaceId: z.string(),
  components: z.array(A2uiComponentSchema),
});

export const UpdateDataModelSchema = z.object({
  surfaceId: z.string(),
  path: z.string().optional(),
  value: z.unknown().optional(),
});

export const DeleteSurfaceSchema = z.object({
  surfaceId: z.string(),
});

export const A2uiMessageSchema = z.object({
  version: z.literal(A2UI_VERSION),
  createSurface: CreateSurfaceSchema.optional(),
  updateComponents: UpdateComponentsSchema.optional(),
  updateDataModel: UpdateDataModelSchema.optional(),
  deleteSurface: DeleteSurfaceSchema.optional(),
});
export type A2uiMessage = z.infer<typeof A2uiMessageSchema>;
