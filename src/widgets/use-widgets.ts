"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadWidgets,
  saveWidgets,
  upsertWidget,
  removeWidget,
  type SavedWidget,
  type WidgetPayload,
} from "@/widgets/store";

export function useWidgets() {
  const [widgets, setWidgets] = useState<SavedWidget[]>([]);

  useEffect(() => {
    setWidgets(loadWidgets());
  }, []);

  // Persistimos de forma síncrona (leyendo localStorage) en vez de dentro del
  // updater de estado: si el componente que exporta se desmonta en el mismo
  // batch (p. ej. al cambiar de pestaña), React descarta el updater y el
  // widget nunca se guardaría.
  const upsert = useCallback((incoming: WidgetPayload) => {
    const next = upsertWidget(loadWidgets(), incoming);
    saveWidgets(next);
    setWidgets(next);
  }, []);

  const remove = useCallback((widgetId: string) => {
    const next = removeWidget(loadWidgets(), widgetId);
    saveWidgets(next);
    setWidgets(next);
  }, []);

  return { widgets, upsert, remove };
}
