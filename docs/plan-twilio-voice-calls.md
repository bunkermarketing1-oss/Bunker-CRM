# Plan: llamadas desde la plataforma, control de líneas y escucha en vivo

Rama: `feat/twilio-voice-calls`, montada sobre `feat/twilio-sms-inbound-bulk` (reusa la
firma de webhooks y el cliente de Twilio).

Objetivo: que el asesor llame al lead desde el CRM con un clic (sin marcar desde su
celular), que cada cliente tenga su propia línea, que todas las llamadas queden
registradas en el lead, y que Bunker pueda escuchar una llamada en vivo o hablarle solo
al asesor.

Leyenda: `[ ]` pendiente · `[x]` hecho y verificado · `[~]` hecho pero sin verificar contra
Twilio real.

---

## Cómo funciona

Toda llamada saliente es una **conferencia de Twilio** con dos participantes, el asesor y
el lead. Así un supervisor puede entrar después como tercer participante: muteado para
escuchar, o en modo *coach* para que solo lo oiga el asesor. Es el mecanismo que Twilio
documenta para la escucha en vivo.

```
Asesor (navegador, Twilio Voice SDK)
  1. GET  /api/voice/token           → Access Token (identidad u_<userId>)
  2. POST /api/voice/calls {leadId}  → valida el scope, elige la línea y crea Call
  3. device.connect({ callId })      → Twilio llama al TwiML App:
     POST /api/integrations/twilio/voice   (firma)
        → agrega al lead a la conferencia (REST Participants, from = línea del cliente)
        → TwiML: <Dial><Conference>call_<id></Conference></Dial> para el asesor
  4. Callbacks de estado → Call.status / duración / grabación → Activity en el lead

Supervisor (admin)
  device.connect({ monitorCallId, mode: listen | whisper })
     → TwiML: <Conference muted> (escuchar) o <Conference coach=asesor> (susurrar)

Entrante al número de una línea
  POST /api/integrations/twilio/voice/inbound
     → busca la línea y el lead por número → Call inbound
     → <Dial> a los navegadores de los asesores de ese cliente (timbran todos)
     → nadie contesta: mensaje de voz de cortesía
```

## Decisiones (por defecto, se pueden cambiar)

- **Líneas:** cada número de Twilio se registra como `PhoneLine` y se asigna a un cliente.
  Una llamada sale por la línea del cliente del lead; si no tiene, por
  `TWILIO_PHONE_NUMBER`. Los números se compran en la consola de Twilio; el CRM solo los
  registra.
- **Quién llama:** cualquier usuario, a leads dentro de su scope (un CLIENT solo a los de
  su empresa). El número sale del lead (`normalizedPhone`, nunca el `phone` crudo ni el
  navegador); si el lead no tiene E.164 validado, 400.
- **Antifraude (toll fraud):** un CLIENT puede crear leads con cualquier número, así que
  antes de registrar la saliente se exige (`lib/voice-policy.ts`): país en
  `VOICE_ALLOWED_COUNTRIES` (por defecto `MX,CO,US`) y tipo de número móvil o fijo según
  libphonenumber (se bloquean premium, costo compartido, UAN, VoIP, gratuitos, satelitales y
  no geográficos). Tope de 30 salientes por usuario por hora y 300 por cliente en 24 h
  (`VOICE_MAX_CALLS_*`, contadas en `Call`; es un freno, no una cuota atómica).
  **En Twilio hay que limitar Voice > Settings > Geo Permissions a los mismos países y
  apagar los destinos de alto riesgo**: es la barrera que no depende del código.
- **Escucha en vivo:** solo admin, en esta rama, con AuditLog. El rol "dueño" del cliente
  llega con `feat/advisor-roles-live-view`. **Pendiente de revisión legal** (LFPDPPP y
  aviso de privacidad de cada cliente) antes de usarla en producción: el código no decide
  si la escucha o el susurro requieren aviso o consentimiento adicional.
- **Grabación:** apagada por defecto, se activa por línea. Si se activa, se avisa antes de
  grabar. Saliente: la conferencia no graba sola; al entrar el lead se reproduce el aviso a
  la conferencia y solo con `announcement-end` se graba la pierna del lead (dos canales). Si
  el aviso falla o no se pudo pedir, la llamada sigue sin grabarse. Entrante: `<Say>` del
  aviso antes del `<Dial record-from-answer>`. El texto del aviso también debe pasar por la
  revisión legal.
- **Robustez:** el `connect` del asesor y el `claim` de una entrante son `updateMany`
  condicionados (un `callId` marca una sola vez; solo se toma una entrante que sigue
  timbrando). Los estados intermedios solo avanzan (`CALL_STATUS_RANK`). Si el lead da
  ocupado, no contesta o falla, se cuelga la pierna del asesor para que no quede solo en la
  conferencia. Con varias líneas activas por cliente gana la más antigua. Una entrante a la
  línea de un cliente solo se liga a leads de ese cliente.
- **Entrantes:** timbran en los navegadores de los asesores del cliente de la línea. La
  escucha en vivo de entrantes queda para una segunda iteración: necesita poner al que
  llama en conferencia y repartir la llamada entre asesores.

## Fase 1: esquema

- [x] `PhoneLine` y `Call`, con índices para "en vivo", historial y búsqueda por CallSid.
- [x] Migración `20261016200000_voice_calls.sql`, **aplicada en Supabase**, con RLS y
      `REVOKE` en las dos tablas.
- [x] Constantes en `lib/constants/voice.ts`; variables nuevas en `.env.example` y en el
      chequeo de Configuración.

## Fase 2: lib

- [x] `createVoiceAccessToken` (`lib/integrations/twilio-voice-token.ts`), sin SDK de
      servidor.
- [x] TwiML (`lib/integrations/twilio-twiml.ts`): conferencia del asesor y del supervisor
      (muteado o coach), entrante a varios navegadores, `Say` con escape de XML.
- [x] REST en `twilio.ts`: `addConferenceParticipant`, `completeTwilioCall`,
      `announceToConference`.

## Fase 3: service y rutas

- [x] `src/services/calls.service.ts`: token, líneas, saliente (scope, línea y número del
      lead), conexión del asesor (un `callId` sirve una sola vez y solo para quien lo
      creó), supervisor (solo admin de la organización, con AuditLog), entrantes, toma de
      la llamada, colgar y callbacks (una sola Activity por llamada).
- [~] Flujo con Twilio real (marcar, conferencia, grabación, aviso): sin probar; necesita
      la API Key y el TwiML App.
- [x] Rutas autenticadas: `/api/voice/token`, `/api/voice/calls`,
      `/api/voice/calls/[id]/hangup`, `/api/voice/calls/[id]/claim`, `/api/voice/lines`
      y `/api/voice/lines/[id]`. Sin sesión, el token responde 401.
- [x] Webhooks `/api/integrations/twilio/voice`, `/voice/inbound`, `/voice/status` y
      `/voice/announce`: los cuatro responden 403 sin firma (verificado en el servidor
      local).

## Fase 4: interfaz

- [x] `/messaging/calls`: teléfono (elegir lead → llamar, mute, colgar, contestar o
      rechazar entrantes, cronómetro) e historial que se refresca cada 5 s.
- [x] "En vivo" con Escuchar y Susurrar (solo admin).
- [x] Gestión de líneas (solo admin): agregar, asignar cliente, grabar, activar.
- [x] Navegación: "Llamar" para clientes y "Llamadas & Líneas" para admin.
- [ ] Verlo en el navegador. Necesita HTTPS o localhost y permiso de micrófono.

## Fase 5: tests y verificación

- [x] `pnpm test:twilio-voice`: 9 tests, todos pasan.
- [x] `pnpm test:voice-policy`: destinos permitidos/bloqueados y orden de estados.
- [ ] `pnpm test:calls` (`tests/calls-suite.js`, 18 casos). Escrita; falta correrla:
      hay que reiniciar `pnpm dev`. Ningún caso le marca a un número real.
- [x] `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- [ ] En Twilio: Geo Permissions de voz limitados a `VOICE_ALLOWED_COUNTRIES`.
- [ ] En Twilio: API Key, TwiML App (Voice URL →
      `https://<dominio>/api/integrations/twilio/voice`) y en cada número "A call comes
      in" → `/api/integrations/twilio/voice/inbound`.
- [ ] Prueba real: llamar a un celular, escuchar y susurrar desde otra sesión admin, y
      recibir una entrante.

### Pendientes conocidos

- Las entrantes solo timbran si el asesor tiene abierta `/messaging/calls`. Para que
  timbren en cualquier pantalla, el teléfono tiene que vivir en el `AppShell`.
- La grabación se guarda (`recordingSid`/`recordingUrl`) pero todavía no hay reproductor:
  la URL de Twilio requiere autenticación y necesita una ruta proxy.
- La escucha en vivo de entrantes queda para una segunda iteración (ver Decisiones).

## Bitácora

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-16 | Plan creado | |
| 2026-10-16 | Fases 1 a 4 implementadas, migración aplicada | Falta correr la suite, configurar Twilio Voice y la prueba real |
| 2026-10-19 | Correcciones de revisión (`fix/voice-calls`) | Antifraude (países, tipo de número, topes), solo `normalizedPhone`, cuelga al asesor si el lead no entra, entrantes aisladas por cliente, `claim`/`connect` atómicos, grabación tras el aviso, estados sin retroceso. `tests/voice-policy.test.mjs` pasa; casos CALL-19 a CALL-22 escritos en la suite, sin correr. Flujo con Twilio real sin probar |
