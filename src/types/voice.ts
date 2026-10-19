import type { CallDirection, CallStatus } from "@/lib/constants/voice";

export interface CallSummary {
  id: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber: string;
  toNumber: string;
  durationSec: number | null;
  hasRecording: boolean;
  leadId: string | null;
  leadName: string | null;
  userId: string | null;
  userName: string | null;
  lineLabel: string | null;
  createdAt: string;
  answeredAt: string | null;
  endedAt: string | null;
}

export interface CallsResponse {
  success: true;
  calls: CallSummary[];
  /** Solo para admin y dueño del cliente: salientes en curso que se pueden escuchar. */
  liveCalls: CallSummary[];
}

export interface PhoneLineSummary {
  id: string;
  phoneNumber: string;
  label: string;
  clientId: string | null;
  clientName: string | null;
  recordCalls: boolean;
  isActive: boolean;
}

export interface VoiceTokenResponse {
  success: true;
  token: string;
  identity: string;
  ttlSeconds: number;
}
