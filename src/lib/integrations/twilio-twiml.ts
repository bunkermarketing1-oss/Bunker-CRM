/**
 * TwiML de voz. Sin imports a propósito: lógica pura que se prueba directo con Node.
 * Docs: https://www.twilio.com/docs/voice/twiml
 */

const VOICE = 'language="es-MX" voice="Polly.Mia"';

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function attrs(values: Record<string, string | number | boolean | null | undefined>) {
  return Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
    .join("");
}

const response = (body: string) => `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;

export function sayTwiml(text: string, hangup = true) {
  return response(`<Say ${VOICE}>${escapeXml(text)}</Say>${hangup ? "<Hangup/>" : ""}`);
}

export interface ConferenceOptions {
  name: string;
  /** El asesor abre la conferencia; el supervisor no (si llega tarde, no la revive). */
  startConferenceOnEnter: boolean;
  /** Si sale el asesor, termina para todos; si sale el supervisor, la llamada sigue. */
  endConferenceOnExit: boolean;
  muted?: boolean;
  /** CallSid del asesor: el supervisor le habla solo a él. */
  coach?: string | null;
  /**
   * Eventos de la conferencia. Incluye `announcement`: la grabación de la llamada solo
   * arranca al recibir `announcement-end` del aviso, nunca con la conferencia
   * (por eso aquí no hay `record`: grabaría antes de avisarle al lead).
   */
  statusCallback?: string | null;
}

export function conferenceTwiml(opts: ConferenceOptions) {
  const conference = `<Conference${attrs({
    startConferenceOnEnter: opts.startConferenceOnEnter,
    endConferenceOnExit: opts.endConferenceOnExit,
    muted: opts.muted || undefined,
    coach: opts.coach,
    beep: false,
    // Sin música de espera mientras el lead contesta: el asesor oye silencio, no un jingle.
    waitUrl: "",
    statusCallback: opts.statusCallback,
    statusCallbackEvent: opts.statusCallback ? "start end join leave announcement" : undefined,
  })}>${escapeXml(opts.name)}</Conference>`;
  return response(`<Dial>${conference}</Dial>`);
}

export interface DialClientsOptions {
  identities: string[];
  timeoutSeconds: number;
  /** URL que Twilio llama al terminar el <Dial> (con DialCallStatus). */
  action: string;
  /** Parámetros que el navegador recibe en `call.customParameters`. */
  parameters: Record<string, string>;
  announcement?: string | null;
  record?: boolean;
  recordingStatusCallback?: string | null;
}

/** Entrante: timbra en todos los navegadores a la vez; el primero que contesta se queda. */
export function dialClientsTwiml(opts: DialClientsOptions) {
  const params = Object.entries(opts.parameters)
    .map(([name, value]) => `<Parameter${attrs({ name, value })}/>`)
    .join("");
  const clients = opts.identities.map((identity) => `<Client><Identity>${escapeXml(identity)}</Identity>${params}</Client>`).join("");
  const announce = opts.announcement ? `<Say ${VOICE}>${escapeXml(opts.announcement)}</Say>` : "";
  const dial = `<Dial${attrs({
    timeout: opts.timeoutSeconds,
    action: opts.action,
    method: "POST",
    record: opts.record ? "record-from-answer" : undefined,
    recordingStatusCallback: opts.record ? opts.recordingStatusCallback : undefined,
  })}>${clients}</Dial>`;
  return response(announce + dial);
}

export function emptyTwiml() {
  return response("");
}
