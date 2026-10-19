import type { EnvVarStatus } from "@/types/settings";

/** Estado de Twilio leído de las variables de entorno del servidor (nunca sus valores). */
export interface TwilioEnvStatus {
  /** Account SID, Auth Token y número remitente definidos: los SMS pueden salir. */
  smsReady: boolean;
  /** Además, API Key y TwiML App definidos: se pueden hacer llamadas desde el navegador. */
  voiceReady: boolean;
  variables: EnvVarStatus[];
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
