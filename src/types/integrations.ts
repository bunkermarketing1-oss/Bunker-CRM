import type { EnvVarStatus } from "@/types/settings";

/** Estado de Twilio leído de las variables de entorno del servidor (nunca sus valores). */
export interface TwilioEnvStatus {
  /** Account SID, Auth Token y número remitente definidos: los SMS pueden salir. */
  smsReady: boolean;
  /** Además, API Key y TwiML App definidos: se pueden hacer llamadas desde el navegador. */
  voiceReady: boolean;
  variables: EnvVarStatus[];
}

export interface TwilioWebhookUrls {
  smsInboundUrl: string;
  smsStatusUrl: string;
  voiceAppUrl: string;
  voiceInboundUrl: string;
  voiceStatusUrl: string;
}

export interface TwilioConnectionTestResult {
  connected: boolean;
  accountSid: string | null;
  accountName: string | null;
  accountStatus: string | null;
  accountType: string | null;
  phoneNumber: string | null;
  phoneFound: boolean;
  phoneCapabilities: {
    sms: boolean;
    voice: boolean;
    mms: boolean;
  } | null;
  smsReady: boolean;
  voiceReady: boolean;
  webhooks: TwilioWebhookUrls;
  error: string | null;
}

/** Cuenta conectada tal como se devuelve al navegador: sin `accessTokenEnc`. */
export interface ConnectedAccountSummary {
  id: string;
  accountName: string;
  accountType: string | null;
  externalId: string | null;
  status: string;
  clientId: string | null;
  client: { id: string; name: string } | null;
}

/** Cuenta del portafolio de la agencia que aún no tiene cliente (paso 3 del asistente). */
export interface UnassignedAccountOption {
  id: string;
  accountName: string;
  externalId: string | null;
  providerName: string;
}
