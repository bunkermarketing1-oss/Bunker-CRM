# Plan: respuesta automática con IA fuera de horario

Rama: `feat/ai-after-hours-reply`, montada sobre `integracion/crm-comercial` (`2aaf817`), que
ya trae los SMS entrantes, las bajas globales (`SmsOptOut`) y el SMS automático al crear el lead.

Objetivo (reunión): "IA de respuesta automática en horas de ausencia, con toda la info
cargada". Piloto: Carrito Naranja, leads de Meta que responden por SMS (Twilio). Fuera del
horario de atención del cliente, la IA contesta al lead usando solo la información que Bunker
cargó para ese cliente; dentro del horario contestan los asesores.

Leyenda: `[ ]` pendiente · `[x]` hecho y verificado · `[~]` hecho pero sin verificar contra
OpenAI, Twilio o la base real.

---

## Flujo

```
Lead responde un SMS
  → POST /api/integrations/twilio/sms (firma verificada)
  → recordInboundSms: guarda el Message inbound, aplica BAJA/ALTA (sin cambios)
  → tryAiReply (nunca lanza; el entrante ya quedó guardado)
      no contesta si: reintento de Twilio · respuesta ambigua (sin cliente) · sin lead ·
      palabra BAJA/ALTA/STOP/START · número dado de baja · SMS vacío · asistente apagado ·
      dentro del horario (zona horaria del cliente) · tope por conversación alcanzado
  → contexto: base de conocimiento + indicaciones + últimos 10 SMS de la conversación
  → OpenAI Chat Completions (timeout 8 s)
      ok    → respuesta limpia, ≤ 320 caracteres          (Message.generatedBy = "ai")
      falla → mensaje de traspaso fijo del cliente          (Message.generatedBy = "ai_handoff")
  → Message outbound (pending) → sendTwilioSms → estado/SID → Activity en el lead
  → TwiML vacío (o la confirmación de BAJA/ALTA, como antes)
```

## Fase 1: esquema

- [x] Tabla `ClientAiAssistant` (una por cliente, se borra con él): `isEnabled`, `timezone`
      (IANA, por defecto `America/Bogota`), `businessHoursJson` (franja por día o null =
      cerrado), `knowledgeBase` (hasta 8000), `instructions` (tono, hasta 1000),
      `handoffMessage` (hasta 320), `maxRepliesPerDay` (1 a 20, por defecto 3), `updatedById`.
- [x] `Message.generatedBy` (null = asesor o automatización; `ai`; `ai_handoff`).
- [x] Migración `supabase/migrations/20261019140000_client_ai_assistant.sql` (generada con
      `prisma migrate diff` entre esquemas, sin conectar a ninguna base), con RLS y `REVOKE`
      para `anon`/`authenticated`.
- [ ] **Aplicar en Supabase**, después de `20261019120000_sms_opt_out.sql` y antes de desplegar.

## Fase 2: lib

- [x] `lib/constants/ai-assistant.ts`: modelo por defecto, timeout, largo máximo, mensajes de
      contexto, topes, horario por defecto, motivos de omisión, acción de AuditLog.
- [x] `MESSAGE_GENERATED_BY` en `lib/constants/messaging.ts`.
- [x] `lib/ai-assistant/business-hours.ts`: hora local con `Intl` (sin dependencias),
      respeta horario de verano; inicio incluido, fin excluido.
- [x] `lib/ai-assistant/prompt.ts`: prompt de sistema, turnos de la conversación, tapado de
      correos y teléfonos, limpieza y recorte de la respuesta.
- [x] `lib/ai-assistant/reply-guards.ts`: cuándo no se contesta, en orden.
- [x] `lib/integrations/openai.ts`: Chat Completions con `fetch` y `AbortSignal.timeout`;
      nunca lanza. Lee `AI_API_KEY` y `AI_MODEL`.
- [x] `lib/validations/ai-assistant.ts` (Zod): zona IANA válida, HH:MM, cierre > apertura,
      largos, tope; no se puede activar sin base de conocimiento.

## Fase 3: services y rutas

- [x] `services/ai-assistant.service.ts`: leer (con valores por defecto) y guardar por
      organización, con AuditLog `client_ai_assistant_updated` (campos cambiados, sin copiar
      los textos).
- [~] `services/ai-reply.service.ts`: `replyOutOfHoursWithAi`. Compila y su lógica pura
      está probada; falta probarlo con OpenAI, Twilio y la base reales.
- [~] `recordInboundSms` llama al asistente después de BAJA/ALTA (`tryAiReply`).
- [x] `GET/PUT /api/clients/[id]/ai-assistant`, solo admin (`requireAdmin`), 404 si el
      cliente no es de la organización. Devuelve si `AI_API_KEY` está configurada y el modelo,
      nunca la clave.

## Fase 4: interfaz

- [~] Ficha del cliente → pestaña "Asistente IA" (solo admin):
      `components/clients/ClientAiAssistantPanel.tsx` + `AiAssistantForm.tsx` +
      `BusinessHoursEditor.tsx`, hook `useClientAiAssistant`. Aviso si falta `AI_API_KEY`.
      Falta verlo en el navegador (necesita la migración aplicada).
- [~] `/messaging/sms`: etiqueta "IA" (o "IA · traspaso") en los SMS del asistente, solo
      para admin. Falta verlo en el navegador.
- [x] `/settings`: `AI_API_KEY` y `AI_MODEL` en el chequeo de variables (grupo mensajería).

## Fase 5: tests y verificación

- [x] `pnpm test:ai-assistant` (`tests/ai-assistant.test.mjs`, 26 tests): horario en la zona
      del cliente (Bogotá vs. Ciudad de México, medianoche, horario de verano, bordes),
      prompt (reglas, privacidad, precios con separadores), limpieza de la respuesta y
      cada motivo para no contestar.
- [x] `node --test tests/*.test.mjs`, `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- [ ] Suite de API con permisos (401/403 CLIENT/404 otra organización) para
      `/api/clients/[id]/ai-assistant`: no se escribió una que pegue al servidor porque la
      única base es producción.
- [ ] Prueba real: configurar Carrito Naranja, responder un SMS fuera de horario desde un
      celular y verlo marcado "IA" en el historial y como actividad en el lead.

## Qué hay que configurar

1. Aplicar `20261019140000_client_ai_assistant.sql` en Supabase.
2. Variables en Dokploy: `AI_API_KEY` (clave de OpenAI) y, opcional, `AI_MODEL` (por defecto
   `gpt-4.1-mini`; conviene un modelo sin razonamiento para que responda en menos de 8 s).
3. Ficha de Carrito Naranja → "Asistente IA": zona horaria, horario, base de conocimiento
   (servicios, precios, FAQ, ubicación, políticas), tono, tope y mensaje de traspaso; activar.
4. El webhook de Twilio ya debe estar apuntando a `/api/integrations/twilio/sms` (plan de
   SMS entrantes).

### Decisiones tomadas

- **Proveedor OpenAI** (decisión del usuario), por REST con `fetch`, sin SDK ni dependencias
  nuevas. Chat Completions con `max_completion_tokens` y sin `temperature` (los modelos de
  razonamiento la rechazan y el modelo es configurable).
- **Si OpenAI falla, tarda más de 8 s, devuelve vacío o falta `AI_API_KEY`, se envía el
  mensaje de traspaso** del cliente (texto fijo, sin IA) en vez de nada: el lead sabe que lo
  leímos y que un asesor le escribirá. Se marca `ai_handoff` y cuenta para el tope.
- **Webhook síncrono**: la respuesta se genera y se envía antes de devolver el TwiML. Con
  8 s de OpenAI más el envío por Twilio queda dentro de los 15 s que espera Twilio. Si aun
  así se pasara y Twilio reintentara, el reintento llega como duplicado (`providerMsgId`
  único) y no se contesta dos veces. No se usa "dispara y olvida" porque en una ruta de
  Next 14 no hay garantía de que termine.
- **Nunca inventa**: el prompt limita la respuesta a la base de conocimiento, prohíbe
  inventar precios, disponibilidad o plazos y hacer compromisos, exige español y 320
  caracteres (`AI_REPLY_MAX_LENGTH`, menor que el `SMS_MAX_LENGTH` general de 480), y ante
  la duda indica que un asesor escribirá en horario de atención. La respuesta además se
  limpia (una línea, sin markdown) y se recorta en frase o palabra completa.
- **Privacidad**: a OpenAI solo viajan el primer nombre del lead, los textos de la
  conversación y la configuración del cliente. Correos y teléfonos que el lead escriba se
  tapan (`[correo]`, `[teléfono]`; 8 o más dígitos, sin contar puntos ni comas para no tapar
  precios). Nunca se envían el teléfono, el correo ni otros campos del lead.
- **Respuestas ambiguas** (número compartido por varios clientes, guardadas sin cliente por
  `resolveReplyTarget`), números desconocidos y contactos sin lead: no se contestan.
- **Tope por conversación** (número + cliente) en una ventana móvil de 24 h, no por día
  calendario: no depende de la zona horaria. Dos SMS simultáneos pueden pasarlo juntos; es
  una protección de costo, no un límite exacto.
- **Franjas sin cruzar medianoche** (cierre > apertura). Un día sin franja está cerrado y la
  IA contesta todo el día. Un horario guardado que no se puede leer desactiva el asistente.
- **No se puede activar sin base de conocimiento** (Zod y también en el service).
- La conversación de contexto excluye los salientes fallidos (nunca le llegaron al lead).
- El SMS automático de `lead_created` sigue con plantilla, sin cambios.
- Configuración y etiqueta "IA" solo para admin: la base de conocimiento la carga Bunker.

### Pendiente / fuera de alcance

- No contestar si un asesor le escribió al lead hace pocos minutos fuera de horario.
- Días festivos y excepciones de horario.
- Medir costo y calidad de las respuestas (hoy solo quedan en el historial y la actividad).

## Bitácora

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-19 | Plan creado; fases 1 a 4 implementadas | Migración `20261019140000_client_ai_assistant.sql` **sin aplicar**. `pnpm test:ai-assistant` (26), `node --test tests/*.test.mjs`, `pnpm typecheck` y `pnpm lint` pasan. Sin probar contra OpenAI, Twilio ni la base (es producción) |
