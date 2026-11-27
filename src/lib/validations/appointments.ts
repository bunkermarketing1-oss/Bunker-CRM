import { z } from "zod";
import { APPOINTMENT_LOCATION, APPOINTMENT_STATUS } from "@/lib/constants/appointments";

const locationValues = [
  APPOINTMENT_LOCATION.IN_STORE,
  APPOINTMENT_LOCATION.PHONE_CALL,
  APPOINTMENT_LOCATION.VIDEO_CALL,
] as const;

const statusValues = [
  APPOINTMENT_STATUS.SCHEDULED,
  APPOINTMENT_STATUS.CONFIRMED,
  APPOINTMENT_STATUS.COMPLETED,
  APPOINTMENT_STATUS.CANCELLED,
  APPOINTMENT_STATUS.NO_SHOW,
] as const;

export const createAppointmentSchema = z.object({
  clientId: z.string().uuid("ID de cliente inválido.").optional().nullable(),
  leadId: z.string().uuid("ID de prospecto inválido.").optional().nullable(),
  userId: z.string().uuid("ID de asesor inválido.").optional().nullable(),
  title: z.string().trim().min(2, "El título de la cita debe tener al menos 2 caracteres."),
  description: z.string().trim().max(1000).optional().nullable(),
  scheduledAt: z.string().datetime({ message: "Fecha y hora en formato ISO inválido." }),
  durationMinutes: z.number().int().min(10).max(480).default(45),
  locationType: z.enum(locationValues).default(APPOINTMENT_LOCATION.IN_STORE),
  locationAddress: z.string().trim().max(500).optional().nullable(),
  customerName: z.string().trim().min(2).optional().nullable(),
  customerPhone: z.string().trim().min(6).optional().nullable(),
  customerEmail: z.string().trim().email("Correo inválido.").optional().nullable().or(z.literal("")),
  customerNotes: z.string().trim().max(1000).optional().nullable(),
  internalNotes: z.string().trim().max(2000).optional().nullable(),
  sendConfirmationSms: z.boolean().default(false),
});

export const updateAppointmentSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().min(10).max(480).optional(),
  status: z.enum(statusValues).optional(),
  locationType: z.enum(locationValues).optional(),
  locationAddress: z.string().trim().max(500).optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  internalNotes: z.string().trim().max(2000).optional().nullable(),
});

export const publicBookingSchema = z.object({
  customerName: z.string().trim().min(2, "Tu nombre debe tener al menos 2 caracteres."),
  customerPhone: z.string().trim().min(7, "El número telefónico es obligatorio."),
  customerEmail: z.string().trim().email("Formato de correo electrónico no válido.").optional().or(z.literal("")),
  scheduledAt: z.string().datetime({ message: "Por favor selecciona una fecha y horario válido." }),
  customerNotes: z.string().trim().max(500).optional().nullable(),
  locationType: z.enum(locationValues).default(APPOINTMENT_LOCATION.IN_STORE),
  advisorId: z.string().uuid().optional().nullable(),
});
