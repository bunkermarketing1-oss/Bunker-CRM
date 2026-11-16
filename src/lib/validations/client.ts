import { z } from "zod";
import { AD_ACCOUNT_TYPES, type AccountType } from "@/lib/constants/integrations";

const MAX_AMOUNT_USD = 1_000_000_000;
const REVENUE_MESSAGE = "El valor contratado debe ser un número mayor o igual a 0 (USD).";
const DEAL_VALUE_MESSAGE = "El valor de la oportunidad inicial debe ser un número mayor o igual a 0 (USD).";

/** Monto en USD: vacío = 0; rechaza texto, negativos o valores absurdos en vez de convertirlos a 0. */
const amountField = (message: string) =>
  z.union([z.number(), z.string()]).transform((val, ctx) => {
    const parsed = typeof val === "number" ? val : val.trim() === "" ? 0 : Number(val.replace(/,/g, "").trim());
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_AMOUNT_USD) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return parsed;
  });

/** Texto opcional: vacío o solo espacios se guarda como null. */
const optionalText = (maxChars: number) =>
  z
    .string()
    .max(maxChars, `Máximo ${maxChars} caracteres permitidos`)
    .nullable()
    .optional()
    .transform((val) => val?.trim() || null);

/** Identificador opcional que llega como "" desde los selects del formulario. */
const optionalId = z
  .string()
  .nullable()
  .optional()
  .transform((val) => val?.trim() || undefined);

const primaryContactSchema = z.object({
  firstName: z.string().max(100, "Máximo 100 caracteres permitidos").default(""),
  lastName: optionalText(100),
  email: optionalText(150),
  phone: optionalText(40),
  jobTitle: optionalText(100),
});

const initialDealSchema = z.object({
  enabled: z.boolean().default(false),
  title: optionalText(200),
  /** Sin valor la oportunidad se abre en 0: no inventamos un monto que el comercial no indicó. */
  value: amountField(DEAL_VALUE_MESSAGE).optional(),
});

export const createClientSchema = z
  .object({
    name: z
      .string({ error: "El nombre del cliente es obligatorio." })
      .trim()
      .min(1, "El nombre del cliente es obligatorio.")
      .max(150, "El nombre del cliente no puede exceder 150 caracteres."),
    companyName: optionalText(150),
    email: optionalText(150),
    phone: optionalText(40),
    website: optionalText(255),
    industry: optionalText(100),
    logoUrl: optionalText(500000),
    revenue: amountField(REVENUE_MESSAGE).optional(),
    smsConsent: z.boolean().optional().default(true),
    notes: optionalText(2000),
    ownerId: optionalId,
    // Un contacto sin nombre se descarta: el formulario simple de clientes no lo pide.
    primaryContact: primaryContactSchema
      .nullable()
      .optional()
      .transform((val) => (val && val.firstName.trim() ? { ...val, firstName: val.firstName.trim() } : null)),
    connectedAccountId: z
      .string()
      .nullable()
      .optional()
      .transform((val) => val?.trim() || undefined)
      .pipe(z.string().uuid("La cuenta seleccionada no es válida.").optional()),
    adAccountExternalId: optionalId,
    /** Tipo de la cuenta escrita a mano; sin él se busca entre las cuentas publicitarias (Meta/TikTok). */
    adAccountType: z
      .enum(AD_ACCOUNT_TYPES as [AccountType, ...AccountType[]], { error: "Tipo de cuenta publicitaria no válido." })
      .optional(),
    initialDeal: initialDealSchema.nullable().optional(),
  })
  .refine((data) => !(data.connectedAccountId && data.adAccountExternalId), {
    message: "Selecciona una cuenta del portafolio o escribe su ID, no ambas.",
    path: ["adAccountExternalId"],
  });

export type CreateClientInput = z.infer<typeof createClientSchema>;
