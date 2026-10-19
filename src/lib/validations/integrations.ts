import { z } from "zod";
import {
  ACCOUNT_TYPE,
  ACCOUNT_TYPES_BY_PROVIDER,
  AD_PROVIDERS,
  INTEGRATION_PROVIDER,
  type AccountType,
} from "@/lib/constants/integrations";

const ACCOUNT_TYPES = Object.values(ACCOUNT_TYPE) as [AccountType, ...AccountType[]];

export const connectAccountSchema = z
  .object({
    provider: z.enum(AD_PROVIDERS, { error: "Proveedor de pauta no válido." }).default(INTEGRATION_PROVIDER.META),
    accountType: z.enum(ACCOUNT_TYPES, { error: "Tipo de cuenta no válido." }).default(ACCOUNT_TYPE.META_AD_ACCOUNT),
    accountName: z
      .string({ error: "El nombre de la cuenta es requerido (ej. Workshop Carrito Naranja)." })
      .trim()
      .min(1, "El nombre de la cuenta es requerido (ej. Workshop Carrito Naranja).")
      .max(150, "El nombre de la cuenta no puede exceder 150 caracteres."),
    externalId: z
      .string({ error: "El ID o identificador de la cuenta es requerido (ej. 5194920503935574)." })
      .trim()
      .min(1, "El ID o identificador de la cuenta es requerido (ej. 5194920503935574).")
      .max(100, "El ID de la cuenta no puede exceder 100 caracteres."),
    /**
     * undefined = no cambia la asignación de una cuenta ya registrada; null = la deja en el
     * portafolio de la agencia de forma explícita. Así re-registrar una cuenta no la desasigna sin querer.
     */
    clientId: z.string().uuid("Cliente inválido.").nullable().optional(),
    accessToken: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((val) => val || null),
  })
  .refine((data) => ACCOUNT_TYPES_BY_PROVIDER[data.provider].includes(data.accountType), {
    message: "El tipo de cuenta no corresponde al proveedor seleccionado.",
    path: ["accountType"],
  });

export type ConnectAccountInput = z.infer<typeof connectAccountSchema>;
