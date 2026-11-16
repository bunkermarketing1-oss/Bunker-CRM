import { z } from "zod";
import { validateAndNormalizePhone } from "@/lib/phone";

export const LEAD_SOURCES = [
  "facebook_ads",
  "instagram_ads",
  "meta_ads",
  "google_ads",
  "tiktok_ads",
  "whatsapp",
  "website",
  "referral",
  "sales_outreach",
  "import",
  "manual",
  "other",
] as const;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "lost",
  "converted",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

const MAX_BUDGET_USD = 1_000_000_000;

// ---------------------------------------------------------------------------
// Shared normalizers
// ---------------------------------------------------------------------------
const normalizeText = (val: string | null | undefined) => {
  if (!val) return null;
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
};

const normalizeEmail = (val: string | null | undefined) => {
  if (!val) return null;
  const trimmed = val.trim().toLowerCase();
  return trimmed === "" ? null : trimmed;
};

const isValidEmail = (val: string | null) => {
  if (!val) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
};

const isValidPhone = (val: string | null) => {
  if (!val) return true;
  return validateAndNormalizePhone(val).isValid;
};

const EMAIL_MESSAGE = "El correo electrónico no tiene un formato válido.";
const PHONE_MESSAGE =
  "El número telefónico no es válido. Incluya el prefijo internacional (ej. +52 55 1234 5678).";

// Monetary amount in USD. Rejects non numeric / negative / absurd values instead of
// silently coercing them to 0.
const budgetField = z.union([z.number(), z.string()]).transform((val, ctx) => {
  const parsed =
    typeof val === "number"
      ? val
      : val.trim() === ""
      ? 0
      : Number(val.replace(/,/g, "").trim());

  if (!Number.isFinite(parsed) || parsed < 0) {
    ctx.addIssue({
      code: "custom",
      message: "El presupuesto debe ser un número mayor o igual a 0 (USD).",
    });
    return z.NEVER;
  }
  if (parsed > MAX_BUDGET_USD) {
    ctx.addIssue({
      code: "custom",
      message: "El presupuesto excede el máximo permitido.",
    });
    return z.NEVER;
  }
  return parsed;
});

const qualificationField = z
  .union([z.number(), z.string()])
  .optional()
  .transform((val) => {
    if (val === undefined || val === null) return undefined;
    const num = typeof val === "number" ? val : parseInt(val, 10);
    return isNaN(num) ? undefined : Math.min(100, Math.max(0, num));
  });

// ---------------------------------------------------------------------------
// CREATE: an omitted optional field becomes null (it is a brand new record)
// ---------------------------------------------------------------------------
const optionalText = (maxChars: number = 255) =>
  z
    .string()
    .max(maxChars, `Máximo ${maxChars} caracteres permitidos`)
    .optional()
    .nullable()
    .transform(normalizeText);

// ---------------------------------------------------------------------------
// UPDATE: an omitted field must stay `undefined` so it is NOT overwritten.
// IMPORTANT: `.optional()` must be the LAST modifier, otherwise the transform runs for
// `undefined` and turns it into `null`, wiping the stored value on partial updates.
// ---------------------------------------------------------------------------
const optionalTextUpdate = (maxChars: number = 255) =>
  z
    .string()
    .max(maxChars, `Máximo ${maxChars} caracteres permitidos`)
    .nullable()
    .transform(normalizeText)
    .optional();

// Schema for creating a lead
export const createLeadSchema = z
  .object({
    name: z
      .string({ error: "El nombre del prospecto es obligatorio." })
      .trim()
      .min(2, "El nombre debe contener al menos 2 caracteres.")
      .max(120, "El nombre no puede exceder 120 caracteres.")
      .refine((val) => val.replace(/\s+/g, "").length >= 2, {
        message: "El nombre no puede estar compuesto únicamente por espacios.",
      }),

    companyName: optionalText(150),

    email: z
      .string()
      .optional()
      .nullable()
      .transform(normalizeEmail)
      .refine(isValidEmail, { message: EMAIL_MESSAGE }),

    phone: z
      .string()
      .optional()
      .nullable()
      .transform(normalizeText)
      .refine(isValidPhone, { message: PHONE_MESSAGE }),

    source: z
      .enum(LEAD_SOURCES, { error: "El origen del prospecto no es válido." })
      .default("manual"),

    status: z
      .enum(LEAD_STATUSES, { error: "El estado comercial proporcionado no es válido." })
      .default("new"),

    estimatedValue: budgetField.optional().default(0),

    qualification: qualificationField,

    ownerId: z
      .string()
      .uuid("El ID de responsable debe ser un identificador válido.")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val : null)),

    clientId: z
      .string()
      .uuid("El ID de empresa/marca debe ser un identificador válido.")
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val : null)),

    notes: optionalText(2000),
    campaign: optionalText(150),
    externalLeadId: optionalText(150),
    utmSource: optionalText(100),
    utmMedium: optionalText(100),
    utmCampaign: optionalText(100),
    aiSummary: optionalText(1000),
    smsConsent: z.boolean().optional().default(true),
    smsConsentSource: optionalText(50),
    forceDuplicate: z.boolean().optional().default(false),
  })
  .strict(); // Disallow unknown/tampered fields like organizationId

// Schema for updating a lead (partial updates preserve omitted fields)
export const updateLeadSchema = z
  .object({
    id: z.string({ error: "ID del prospecto es requerido." }).uuid(),
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe contener al menos 2 caracteres.")
      .max(120, "El nombre no puede exceder 120 caracteres.")
      .optional(),

    companyName: optionalTextUpdate(150),

    email: z
      .string()
      .nullable()
      .transform(normalizeEmail)
      .refine(isValidEmail, { message: EMAIL_MESSAGE })
      .optional(),

    phone: z
      .string()
      .nullable()
      .transform(normalizeText)
      .refine(isValidPhone, { message: PHONE_MESSAGE })
      .optional(),

    source: z
      .enum(LEAD_SOURCES, { error: "El origen del prospecto no es válido." })
      .optional(),
    status: z
      .enum(LEAD_STATUSES, { error: "El estado comercial proporcionado no es válido." })
      .optional(),
    estimatedValue: budgetField.optional(),
    qualification: qualificationField,
    ownerId: z
      .string()
      .uuid("El ID de responsable debe ser un identificador válido.")
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val : null))
      .optional(),
    clientId: z
      .string()
      .uuid("El ID de empresa/marca debe ser un identificador válido.")
      .nullable()
      .transform((val) => (val && val.trim() !== "" ? val : null))
      .optional(),
    notes: optionalTextUpdate(2000),
    campaign: optionalTextUpdate(150),
    externalLeadId: optionalTextUpdate(150),
    utmSource: optionalTextUpdate(100),
    utmMedium: optionalTextUpdate(100),
    utmCampaign: optionalTextUpdate(100),
    aiSummary: optionalTextUpdate(1000),
    smsConsent: z.boolean().optional(),
    smsConsentSource: optionalTextUpdate(50),
  })
  .strict();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
