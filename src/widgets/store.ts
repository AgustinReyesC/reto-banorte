import { z } from "zod";
import { UiComponentSchema, type UiComponent } from "@/schemas/ui-catalog";

export interface WidgetPayload {
  widgetId: string;
  summary: UiComponent;
  detail?: UiComponent[];
}

export interface SavedWidget extends WidgetPayload {
  expanded: boolean;
}

const STORAGE_KEY = "banorte-widgets";
const LEGACY_STORAGE_KEY = "banorte-widget";

const SavedWidgetSchema = z.object({
  widgetId: z.string(),
  summary: UiComponentSchema,
  detail: z.array(UiComponentSchema).optional(),
  expanded: z.boolean().catch(false),
});

const SavedWidgetListSchema = z.array(SavedWidgetSchema);

export function loadWidgets(): SavedWidget[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = SavedWidgetListSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  return migrateLegacyWidget();
}

export function saveWidgets(widgets: SavedWidget[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
}

/** Upsert por widget_id: actualiza el existente sin duplicar; conserva su estado expandido. */
export function upsertWidget(widgets: SavedWidget[], incoming: WidgetPayload): SavedWidget[] {
  const index = widgets.findIndex((widget) => widget.widgetId === incoming.widgetId);
  const expanded = index >= 0 ? (widgets[index]?.expanded ?? false) : false;
  const next: SavedWidget = {
    widgetId: incoming.widgetId,
    summary: incoming.summary,
    detail: incoming.detail,
    expanded,
  };

  if (index === -1) return [...widgets, next];
  return widgets.map((widget, i) => (i === index ? next : widget));
}

function migrateLegacyWidget(): SavedWidget[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return [];

  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  try {
    const parsed = SavedWidgetSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    const migrated = [parsed.data];
    saveWidgets(migrated);
    return migrated;
  } catch {
    return [];
  }
}
