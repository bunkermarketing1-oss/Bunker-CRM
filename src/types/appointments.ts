import type { AppointmentStatus, AppointmentLocation } from "@/lib/constants/appointments";

export interface AppointmentDto {
  id: string;
  organizationId: string;
  clientId: string | null;
  clientName?: string | null;
  leadId: string | null;
  leadName?: string | null;
  leadPhone?: string | null;
  userId: string | null;
  userName?: string | null;
  title: string;
  description: string | null;
  scheduledAt: string; // ISO date
  durationMinutes: number;
  status: AppointmentStatus;
  locationType: AppointmentLocation;
  locationAddress: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  reminder24hSent: boolean;
  reminder2hSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentInput {
  clientId?: string | null;
  leadId?: string | null;
  userId?: string | null;
  title: string;
  description?: string;
  scheduledAt: string; // ISO string
  durationMinutes?: number;
  locationType?: AppointmentLocation;
  locationAddress?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerNotes?: string;
  internalNotes?: string;
  sendConfirmationSms?: boolean;
}

export interface UpdateAppointmentInput {
  title?: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  status?: AppointmentStatus;
  locationType?: AppointmentLocation;
  locationAddress?: string;
  userId?: string | null;
  internalNotes?: string;
}

export interface PublicBookingInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  scheduledAt: string; // ISO string
  customerNotes?: string;
  locationType?: AppointmentLocation;
}

export interface PublicBookingClientInfo {
  id: string;
  name: string;
  companyName: string | null;
  logoUrl: string | null;
  bookingSlug: string;
  bookingTitle: string;
  bookingNotice: string | null;
  bookingDurationMin: number;
  phone: string | null;
  existingBookings: { scheduledAt: string; durationMinutes: number }[];
}

export interface AppointmentsResponse {
  success: boolean;
  appointments: AppointmentDto[];
  stats: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
}
