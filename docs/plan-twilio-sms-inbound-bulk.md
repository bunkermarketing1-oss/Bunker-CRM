# Plan: SMS entrantes, estados de entrega y envío masivo

Rama: `feat/twilio-sms-inbound-bulk`, montada sobre `feat/sms-lead-qualification` (reusa
`lib/integrations/twilio.ts` y las constantes de mensajería).

Objetivo: que la conversación por SMS con el lead quede completa en el CRM (lo que se
envió, si llegó, y lo que respondió el lead), que el lead pueda darse de baja, y que Bunker
pueda mandar campañas de SMS a un grupo de leads.

Leyenda: `[ ]` pendiente · `[x]` hecho y verificado · `[~]` hecho pero sin verificar contra
Twilio real.

---

## Flujo

```
Lead responde el SMS
  → Twilio → POST /api/integrations/twilio/sms   (firma X-Twilio-Signature)
  → busca a quién se le escribió desde ese número en los últimos 7 días (Message outbound)
     o, si no, los leads con ese teléfono; si son de varios clientes, no se asocia a ninguno
  → Message inbound (providerMsgId único) + Activity en el lead
  → "BAJA", "STOP", "ALTO" o "CANCELAR" → SmsOptOut (global por número) + Lead.smsOptOutAt
  → "START", "UNSTOP", "ALTA" o "SUSCRIBIR" → quita la baja

Twilio informa el estado de cada envío
  → POST /api/integrations/twilio/status → Message.status / deliveredAt / errorMessage

Envío masivo (solo admin)
  → filtros (cliente, estado, fuente) → vista previa del número de destinatarios
  → plantilla con variables → un SMS por lead (omite sin teléfono, dados de baja y
     duplicados) → resumen
```

## Fase 1: esquema

- [x] `Lead.smsOptOutAt`. La baja aplica al número: si la misma persona entra como lead
      nuevo, tampoco se le escribe.
- [x] Índices `Message(providerMsgId)` y `Message(recipient, createdAt)`.
- [x] Migración `20261016180000_sms_inbound_optout.sql`, **aplicada en Supabase**
      (comprobado: la columna y los dos índices existen).

## Fase 2: lib

- [x] `verifyTwilioSignature` (`lib/integrations/twilio-webhook.ts`): validada contra los
      dos ejemplos oficiales de Twilio.
- [x] `sendTwilioSms` manda `StatusCallback`, solo si `NEXT_PUBLIC_APP_URL` es https.
- [x] `isOptOutMessage` (BAJA, ALTO, CANCELAR, PARAR y las de Twilio en inglés),
      `isOptOutHandledByTwilio`, `twimlResponse` y `mapTwilioStatus`.

## Fase 3: service y rutas

- [x] `src/services/sms.service.ts`: entrantes, estados (nunca retroceden), bajas, vista
      previa y envío masivo.
- [x] `POST /api/integrations/twilio/sms`: 403 sin firma. A las bajas en español responde
      con la confirmación; las de Twilio las confirma Twilio.
- [x] `POST /api/integrations/twilio/status`: 403 sin firma.
- [x] `POST /api/messages/sms/bulk`: solo admin, con `dryRun`, tope de 200 destinatarios,
      un SMS por número y AuditLog.
- [x] **Aislamiento:** `GET /api/messages/sms` pasa por `scopeFromUser`; un CLIENT ya no
      ve los SMS de otros clientes.
- [x] Las bajas se respetan en el SMS manual (409), en las automatizaciones y en el
      masivo.

## Fase 4: interfaz

- [x] Historial de `/messaging/sms`: los entrantes salen como "RECIBIDO", con flecha y el
      nombre del lead.
- [x] Panel de envío masivo, solo admin (`components/messaging/BulkSmsPanel.tsx`):
      filtros, "Ver destinatarios" con lo que se omite y por qué, y confirmación. Si cambia
      un filtro o el texto, hay que volver a calcular. Falta verlo en el navegador.

## Fase 5: tests y verificación

- [x] `pnpm test:twilio-webhook`: 8 tests, todos pasan.
- [ ] `pnpm test:sms-inbound` (`tests/sms-inbound-suite.js`, 19 casos, incluidos los del
      SMS manual por rol). Escrita; falta
      correrla: el `pnpm dev` que está corriendo tiene un cliente de Prisma anterior a las
      migraciones y hay que reiniciarlo. Los casos que llegarían a Twilio solo se ejecutan
      si su condición previa ya pasó, para no mandar SMS reales.
- [x] `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- [ ] En la consola de Twilio: número → Messaging → "A message comes in" →
      `https://<dominio>/api/integrations/twilio/sms` (POST).
- [ ] Prueba real: responder el SMS automático desde un celular y verlo en el CRM.

### Decisiones tomadas

- Una respuesta se asigna al último SMS que le mandamos a ese número; si nunca le
  escribimos, al lead más reciente con ese teléfono (refinado el 2026-10-19 con ventana de
  7 días y la regla de ambigüedad, ver abajo). Un número desconocido no se guarda,
  porque el número de Twilio es compartido y no hay organización a la cual asignarlo.
- En los entrantes, `Message.recipient` guarda el número del lead, igual que en los
  salientes, para que la conversación con un número comparta el mismo valor.
- El masivo es síncrono y tiene un tope de 200 SMS. Para más volumen habría que pasarlo a
  una cola.
- **(2026-10-19, revisión)** La baja vive en `SmsOptOut`, una fila por número E.164, sin
  organización: el número de Twilio es compartido, así que "no te enviaremos más mensajes"
  tiene que valer para todos los clientes, contactos y números escritos a mano.
  `isPhoneOptedOut(phone)` es la única consulta (SMS manual, masivo y automatizaciones) y
  también mira `Lead.smsOptOutAt` como respaldo. `Lead.smsOptOutAt` se sigue escribiendo
  (en todos los leads con ese número, de cualquier organización) solo para mostrarlo; un
  lead creado después de la baja no lo tiene, pero igual queda bloqueado por `SmsOptOut`.
  Un número desconocido que responde BAJA también queda de baja (sin AuditLog, que exige
  organización).
- Alta: START y UNSTOP (las confirma Twilio), ALTA y SUSCRIBIR (las confirmamos nosotros y
  solo si había una baja que quitar). YES/SÍ no reactivan: son respuestas normales a una
  pregunta del asesor. Si el número había respondido STOP, Twilio lo sigue bloqueando hasta
  que mande START; la confirmación de ALTA lo dice.
- Respuestas entrantes: se toman los SMS que le enviamos a ese número en los últimos 7 días
  (`SMS_REPLY_WINDOW_DAYS`) o, si no hay, los leads con ese teléfono. Si todos son del mismo
  cliente se asocia al más reciente. Si hay más de un cliente u organización, la respuesta
  se guarda en la organización del más reciente **sin cliente, lead ni contacto** (solo la
  ve un admin) y se deja un AuditLog `sms_inbound_ambiguous`: preferimos no asociarla a
  mostrársela al cliente equivocado.
- Masivo idempotente: el navegador genera una clave de lote (`batchId`) por vista previa.
  Cada destinatario se registra en `Message` (estado `pending`, con `bulkBatchId`) **antes**
  de llamar a Twilio, y un índice único `(organizationId, bulkBatchId, recipient)` impide
  que dos ejecuciones del mismo lote le escriban dos veces al mismo número. Una clave ya
  usada responde 409. Además se omite a quien recibió el mismo texto en las últimas 24 h
  (`BULK_SMS_RESEND_WINDOW_HOURS`), por si el navegador recalcula y reenvía. Un error con un
  destinatario no corta el lote, y el AuditLog del lote se escribe siempre (`finally`).
- Estados: `delivered` y `failed` son finales y ninguno pisa al otro. Si el callback de
  estado llega antes de que el SID quede guardado se pierde: Twilio no reintenta los status
  callbacks. Para achicar esa ventana el SMS manual y el masivo crean el `Message` antes de
  llamar a Twilio y solo actualizan el SID al volver. Las automatizaciones siguen guardando
  después de enviar (fuera de esta revisión).
- El SMS manual siempre envía y guarda el número en E.164 (`validateAndNormalizePhone`); si
  no se puede normalizar responde 400. El body se valida con `manualSmsSchema` y la
  respuesta devuelve solo los campos del mensaje y `{ id, name }` de cliente y lead.
- `POST /api/messages/sms` (corregido a pedido): un CLIENT solo escribe a leads o
  contactos de su empresa y al número guardado del lead, sin importar el que mande el
  navegador. Para todos, `leadId`, `clientId` y `contactId` deben ser de la organización;
  si no se indica `clientId`, se hereda del lead para que el SMS aparezca en el portal.

## Bitácora

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-16 | Plan creado | |
| 2026-10-16 | Fases 1 a 4 implementadas, migración aplicada | Falta correr la suite (reiniciar `pnpm dev`) y configurar Twilio |
| 2026-10-19 | Correcciones de revisión: baja global (`SmsOptOut`), ALTA/START, masivo idempotente, respuestas ambiguas, estados finales, E.164 y Zod en el SMS manual, `providerMsgId` único | Migración `20261019120000_sms_opt_out.sql` **sin aplicar**. `pnpm test:sms-rules` y `pnpm test:twilio-webhook` pasan; la suite de API no se corrió (pega a producción) |
