import type { Usuario } from "@/schemas/financial";

export const USUARIOS: Usuario[] = [
  { id: "u_ana", nombre: "Ana García" },
  { id: "u_carlos", nombre: "Carlos Mendoza" },
];

export function getUsuario(usuarioId: string): Usuario | undefined {
  return USUARIOS.find((u) => u.id === usuarioId);
}
