"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Ajusta su contenido a la celda: ocupa todo el ancho disponible y, si el
 * contenido se desborda (por ejemplo, una cantidad larga), se reduce de forma
 * uniforme para que quepa completo, sin scroll ni recortes. Queda centrado.
 */
export function FitToCell({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const content = contentRef.current;
    if (!outer || !content) return;

    function update() {
      if (!outer || !content) return;
      const cellWidth = outer.clientWidth;
      const cellHeight = outer.clientHeight;
      const naturalWidth = content.scrollWidth;
      const naturalHeight = content.scrollHeight;
      if (cellWidth === 0 || cellHeight === 0 || naturalWidth === 0 || naturalHeight === 0) return;
      setScale(Math.min(1, cellWidth / naturalWidth, cellHeight / naturalHeight));
    }

    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(content);

    // Las fuentes pueden cargar después del primer layout y cambiar el ancho.
    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(update).catch(() => undefined);
    }

    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={outerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={innerRef}
        style={{
          width: "100%",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <div ref={contentRef}>{children}</div>
      </div>
    </div>
  );
}
