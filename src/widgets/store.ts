import { z } from "zod";
import {
  UiComponentSchema,
  ChatTurnSchema,
  type UiComponent,
  type ChatTurn,
} from "@/schemas/ui-catalog";

/**
 * Un widget guardado es una pantalla organizada: sus bloques ya tienen
 * posición (x, y) y tamaño (w, h) dentro de una grilla de `cols` columnas.
 * Además conserva el contexto (usuario e historial) para poder ser
 * interactivo y actualizarse solo desde Inicio.
 */
export interface PlacedBlock {
  id: string;
  component: UiComponent;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetPayload {
  widgetId: string;
  title: string;
  cols: number;
  blocks: PlacedBlock[];
  usuarioId: string;
  history: ChatTurn[];
  refreshable: boolean;
}

export type SavedWidget = WidgetPayload;

const STORAGE_KEY = "banorte-widgets";

const PlacedBlockSchema = z.object({
  id: z.string(),
  component: UiComponentSchema,
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

const SavedWidgetSchema = z.object({
  widgetId: z.string(),
  title: z.string(),
  cols: z.number().int().positive(),
  blocks: z.array(PlacedBlockSchema).min(1),
  usuarioId: z.string().default("u_ana"),
  history: z.array(ChatTurnSchema).default([]),
  refreshable: z.boolean().default(true),
});

const SavedWidgetListSchema = z.array(SavedWidgetSchema);

export function loadWidgets(): SavedWidget[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = SavedWidgetListSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return parsed.data;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return [];
}

export function saveWidgets(widgets: SavedWidget[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

/** Upsert por widget_id: actualiza el existente sin duplicar. */
export function upsertWidget(widgets: SavedWidget[], incoming: WidgetPayload): SavedWidget[] {
  const index = widgets.findIndex((widget) => widget.widgetId === incoming.widgetId);
  if (index === -1) return [...widgets, incoming];
  return widgets.map((widget, i) => (i === index ? incoming : widget));
}

export function removeWidget(widgets: SavedWidget[], widgetId: string): SavedWidget[] {
  return widgets.filter((widget) => widget.widgetId !== widgetId);
}
