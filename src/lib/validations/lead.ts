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

// Helper to sanitize optional text (empty string -> null)
const optionalText = (maxChars: number = 255) =>
  z
    .string()
    .max(maxChars, `Máximo ${maxChars} caracteres permitidos`)
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const trimmed = val.trim();
      return trimmed === "" ? null : trimmed;
    });

// Schema for creating a lead
export const createLeadSchema = z
  .object({
    name: z
      .string({ required_error: "El nombre del prospecto es obligatorio." })
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
      .transform((val) => {
        if (!val) return null;
        const trimmed = val.trim().toLowerCase();
        return trimmed === "" ? null : trimmed;
      })
      .refine(
        (val) => {
          if (!val) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        },
        { message: "El correo electrónico no tiene un formato válido." }
      ),

    phone: z
      .string()
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        const trimmed = val.trim();
        return trimmed === "" ? null : trimmed;
      })
      .refine(
        (val) => {
          if (!val) return true;
          const check = validateAndNormalizePhone(val);
          return check.isValid;
        },
        {
          message:
            "El número telefónico no es válido. Incluya el prefijo internacional (ej. +52 55 1234 5678).",
        }
      ),

    source: z
      .enum(LEAD_SOURCES, {
        errorMap: () => ({
          message: "El origen del prospecto no es válido.",
        }),
      })
      .default("manual"),

    status: z
      .enum(LEAD_STATUSES, {
        errorMap: () => ({
          message: "El estado comercial proporcionado no es válido.",
        }),
      })
      .default("new"),

    estimatedValue: z
      .union([z.number(), z.string()])
      .optional()
      .default(0)
      .transform((val) => {
        if (typeof val === "number") return Math.max(0, val);
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      }),

    qualification: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === null) return undefined;
        const num = typeof val === "number" ? val : parseInt(val, 10);
        return isNaN(num) ? undefined : Math.min(100, Math.max(0, num));
      }),

    ownerId: z
      .string()
      .uuid("El ID de responsable debe ser un identificador válido.")
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
    forceDuplicate: z.boolean().optional().default(false),
  })
  .strict(); // Disallow unknown/tampered fields like organizationId

// Schema for updating a lead
export const updateLeadSchema = z
  .object({
    id: z.string({ required_error: "ID del prospecto es requerido." }).uuid(),
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe contener al menos 2 caracteres.")
      .max(120, "El nombre no puede exceder 120 caracteres.")
      .optional(),

    companyName: optionalText(150),

    email: z
      .string()
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        const trimmed = val.trim().toLowerCase();
        return trimmed === "" ? null : trimmed;
      })
      .refine(
        (val) => {
          if (!val) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        },
        { message: "El correo electrónico no tiene un formato válido." }
      ),

    phone: z
      .string()
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        const trimmed = val.trim();
        return trimmed === "" ? null : trimmed;
      })
      .refine(
        (val) => {
          if (!val) return true;
          const check = validateAndNormalizePhone(val);
          return check.isValid;
        },
        {
          message:
            "El número telefónico no es válido. Incluya el prefijo internacional (ej. +52 55 1234 5678).",
        }
      ),

    source: z.enum(LEAD_SOURCES).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    estimatedValue: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => {
        if (val === undefined) return undefined;
        if (typeof val === "number") return Math.max(0, val);
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      }),
    qualification: z
      .union([z.number(), z.string()])
      .optional()
      .transform((val) => {
        if (val === undefined || val === null) return undefined;
        const num = typeof val === "number" ? val : parseInt(val, 10);
        return isNaN(num) ? undefined : Math.min(100, Math.max(0, num));
      }),
    ownerId: z
      .string()
      .uuid("El ID de responsable debe ser un identificador válido.")
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
  })
  .strict();

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
