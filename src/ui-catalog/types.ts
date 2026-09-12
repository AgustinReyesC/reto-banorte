import type { UiComponent } from "@/schemas/ui-catalog";

/** Callback que el renderer entrega a cada componente para cerrar el ciclo de interacción. */
export interface RenderUiComponentOptions {
  onAction?: (componentId: string, value?: unknown) => void;
}

/** Extrae las props de un componente concreto del catálogo A2UI. */
export type ComponentOfType<T extends UiComponent["type"]> = Extract<UiComponent, { type: T }>;
