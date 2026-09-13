"use client";

import type { A2uiSurface } from "@/schemas/a2ui";
import { a2uiComponentToUiComponent } from "@/a2ui/catalog";
import { FitToCell } from "@/a2ui/fit-to-cell";
import { renderUiComponent } from "@/ui-catalog/registry";
import { UnknownComponentFallback } from "@/ui-catalog/fallback/unknown-component-fallback";

/**
 * Renderer A2UI: recibe una surface (lista plana de componentes + data model),
 * reconstruye el árbol desde el componente `root` y lo pinta con el catálogo
 * de UI de Banorte. Los hijos se colocan en una grilla según su `layout`.
 */
export function A2uiSurfaceView({
  surface,
  rowHeight = 108,
  colWidth = "fill",
  gap = 16,
  onAction,
}: {
  surface: A2uiSurface;
  rowHeight?: number | "fill";
  colWidth?: number | "fill";
  gap?: number;
  onAction?: (componentId: string, value?: unknown) => void;
}) {
  const root = surface.components.find((component) => component.id === "root");
  if (!root) {
    return <UnknownComponentFallback message="Surface A2UI sin componente root." />;
  }

  const columns = typeof root.columns === "number" ? root.columns : 8;
  const byId = new Map(surface.components.map((component) => [component.id, component]));
  const children = (root.children ?? [])
    .map((id) => byId.get(id))
    .filter((component): component is NonNullable<typeof component> => Boolean(component));

  const rows = children.reduce((max, child) => {
    const layout = child.layout;
    return layout ? Math.max(max, layout.y + layout.h) : max;
  }, 0);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          colWidth === "fill" ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(${columns}, ${colWidth}px)`,
        gridTemplateRows: rowHeight === "fill" ? `repeat(${rows}, minmax(0, 1fr))` : undefined,
        gridAutoRows: rowHeight === "fill" ? undefined : rowHeight,
        gap,
        width: colWidth === "fill" ? undefined : columns * colWidth + (columns - 1) * gap,
        height: rowHeight === "fill" ? "100%" : undefined,
        alignContent: "start",
      }}
    >
      {children.map((child) => {
        const layout = child.layout ?? { x: 0, y: 0, w: 2, h: 1 };
        const uiComponent = a2uiComponentToUiComponent(child, surface.dataModel);
        return (
          <div
            key={child.id}
            style={{
              gridColumn: `${layout.x + 1} / span ${layout.w}`,
              gridRow: `${layout.y + 1} / span ${layout.h}`,
              minWidth: 0,
              minHeight: 0,
              containerType: "inline-size",
            }}
          >
            <FitToCell>
              {uiComponent ? (
                renderUiComponent(uiComponent, {
                  onAction: (componentId, value) => onAction?.(componentId, value),
                })
              ) : (
                <UnknownComponentFallback />
              )}
            </FitToCell>
          </div>
        );
      })}
    </div>
  );
}
