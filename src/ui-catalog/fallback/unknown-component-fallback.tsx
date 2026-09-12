export function UnknownComponentFallback({ message }: { message?: string }) {
  return (
    <p style={{ margin: 0, color: "var(--ink-soft)", lineHeight: 1.6 }}>
      {message ?? "Contenido no disponible."}
    </p>
  );
}
