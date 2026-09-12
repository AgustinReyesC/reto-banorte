export function UnknownComponentFallback({ message }: { message?: string }) {
  return (
    <p style={{ margin: 0, color: "#334155", lineHeight: 1.6 }}>
      {message ?? "Contenido no disponible."}
    </p>
  );
}
