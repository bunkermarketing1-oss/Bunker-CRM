import { z } from "zod";

/** Query de GET /api/team/live. `clientId` solo lo usa Bunker; para el dueño se ignora. */
export const teamLiveQuerySchema = z.object({
  clientId: z.string().uuid("Cliente inválido.").optional(),
});
