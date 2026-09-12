"use client";

import { useCallback, useEffect, useState } from "react";
import { loadWidgets, saveWidgets, upsertWidget, type SavedWidget, type WidgetPayload } from "@/widgets/store";

export function useWidgets() {
  const [widgets, setWidgets] = useState<SavedWidget[]>([]);

  useEffect(() => {
    setWidgets(loadWidgets());
  }, []);

  const upsert = useCallback((incoming: WidgetPayload) => {
    setWidgets((current) => {
      const next = upsertWidget(current, incoming);
      saveWidgets(next);
      return next;
    });
  }, []);

  const toggle = useCallback((widgetId: string) => {
    setWidgets((current) => {
      const next = current.map((widget) =>
        widget.widgetId === widgetId ? { ...widget, expanded: !widget.expanded } : widget
      );
      saveWidgets(next);
      return next;
    });
  }, []);

  return { widgets, upsert, toggle };
}
