import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Banorte UI Generativa",
  description: "Chat de análisis financiero con UI generada por agente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
