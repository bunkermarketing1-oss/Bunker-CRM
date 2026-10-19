import { z } from "zod";
import { ASSIGNABLE_ROLES } from "@/lib/roles";

/** Acción de PUT /api/users que no edita campos: genera el enlace de recuperación. */
export const USER_ACTION = { RESET_PASSWORD: "reset_password" } as const;

// Solo los roles de `lib/roles.ts`: antes cualquier texto se aceptaba y se "normalizaba" a ADMIN.
// Se acepta en minúsculas porque así lo mandaban clientes anteriores de la API.
const roleField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum(ASSIGNABLE_ROLES, { message: "Rol inválido." })
);

export const updateUserSchema = z.object({
  id: z.string().min(1, "ID de usuario es requerido."),
  isActive: z.boolean().optional(),
  role: roleField.optional(),
  action: z.literal(USER_ACTION.RESET_PASSWORD).optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const createUserRoleSchema = roleField.optional();
