import {
  A2UI_CATALOG_ID,
  A2UI_VERSION,
  type A2uiComponent,
  type A2uiMessage,
  type A2uiSurface,
} from "@/schemas/a2ui";
import { typeToA2uiName, uiComponentToA2uiProps } from "@/a2ui/catalog";
import type { PlacedBlock } from "@/widgets/store";

/**
 * Convierte una pantalla/widget (bloques con layout) en una surface A2UI:
 * un componente `root` de tipo Screen con los bloques como hijos y cada
 * bloque con su `layout` (extensión del catálogo propio).
 */
export function blocksToSurface(surfaceId: string, cols: number, blocks: PlacedBlock[]): A2uiSurface {
  const components: A2uiComponent[] = [
    { id: "root", component: "Screen", children: blocks.map((block) => block.id), columns: cols },
    ...blocks.map((block) => ({
      id: block.id,
      component: typeToA2uiName(block.component.type),
      layout: { x: block.x, y: block.y, w: block.w, h: block.h },
      ...uiComponentToA2uiProps(block.component),
    })),
  ];

  return { surfaceId, catalogId: A2UI_CATALOG_ID, components, dataModel: {} };
}

/** Serializa la surface al stream de mensajes A2UI v0.9.1. */
export function surfaceToMessages(surface: A2uiSurface): A2uiMessage[] {
  const messages: A2uiMessage[] = [
    {
      version: A2UI_VERSION,
      createSurface: {
        surfaceId: surface.surfaceId,
        catalogId: surface.catalogId,
        sendDataModel: true,
      },
    },
    {
      version: A2UI_VERSION,
      updateComponents: { surfaceId: surface.surfaceId, components: surface.components },
    },
  ];

  if (Object.keys(surface.dataModel).length > 0) {
    messages.push({
      version: A2UI_VERSION,
      updateDataModel: { surfaceId: surface.surfaceId, value: surface.dataModel },
    });
  }

  return messages;
}
