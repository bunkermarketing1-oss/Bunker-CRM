# Plan: SMS de calificación al recibir lead

Rama: `feat/sms-lead-qualification`, montada sobre `feat/meta-leads`, de la que depende.

Objetivo: en cuanto entra un lead de Meta, el CRM le manda un SMS por Twilio con un texto
que define Bunker para cada cliente (por ejemplo, para Carrito Naranja). El lead llega con
una calificación inicial calculada, y el envío queda en el historial del lead.

Leyenda: `[ ]` pendiente · `[x]` hecho y verificado · `[~]` hecho pero sin verificar contra
Twilio o Meta real.

---

## Flujo

```
Lead creado por el webhook o el cron de Meta (solo la primera vez)
  → calificación inicial (lib/lead-scoring.ts)
  → reglas activas de la organización: trigger lead_created + acción send_sms
      filtradas por cliente (la regla aplica a uno o a todos) y por fuente del lead
  → plantilla con {{nombre}}, {{cliente}}
  → Twilio → Message (outbound) + Activity (sms) en el lead
  → executionCount / lastRunAt de la regla
```

Si el SMS falla, el lead se crea igual y el error queda en `Message.errorMessage`.

## Fase 1: esquema

- [x] `AutomationRule.clientId` (opcional, se borra junto con el cliente) e índice
      `(organizationId, triggerEvent, isActive)`.
- [x] Migración `supabase/migrations/20261016150000_automation_rule_client.sql`.
- [ ] **Aplicar en Supabase**, después de `20261016120000_meta_leadgen` y antes de desplegar.
- [x] Constantes en `lib/constants/automations.ts` y `lib/constants/messaging.ts`
      (incluye `SMS_MAX_LENGTH`, antes escrito como 480 en la ruta).

## Fase 2: lib

- [x] `src/lib/integrations/twilio.ts`: `sendTwilioSms`. `api/messages/sms` ya lo usa, y
      también las constantes.
- [x] `src/lib/automations/sms-template.ts`: render, detección de variables mal escritas y
      primer nombre.
- [x] `src/lib/lead-scoring.ts`: `computeInitialQualification`; `POST /api/leads` lo usa,
      con la misma regla que tenía.
- [x] `src/lib/validations/automation.ts`: nombre, cliente, fuentes, plantilla de hasta 480
      caracteres y solo con variables conocidas.

## Fase 3: service y rutas

- [x] `src/services/automations.service.ts`: CRUD por organización con AuditLog y
      `runLeadCreatedAutomations` (Message + Activity + contador de la regla).
- [~] La ingesta de Meta califica el lead y dispara las automatizaciones solo al crearlo.
      Falta probarlo con un lead real.
- [x] `GET/POST /api/automations` y `PATCH/DELETE /api/automations/[id]`, solo admin. Sin
      sesión responden 401 (verificado contra el servidor local).

## Fase 4: interfaz

- [x] `/automations` con reglas reales: crear, editar, pausar y borrar, vista previa del
      SMS, contador de caracteres y botones para insertar variables. Falta verlo en el
      navegador: necesita las migraciones aplicadas.

## Fase 5: tests y verificación

- [x] `pnpm test:sms-template`: 6 tests, todos pasan.
- [ ] `pnpm test:automations` (`tests/automations-suite.js`, 11 casos: 401 sin sesión, 403
      para CLIENT, plantillas inválidas, cliente de otra organización, aislamiento al
      listar, editar y borrar, AuditLog). Escrita y sin correr: necesita la migración.
- [x] `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- [ ] Prueba real: crear la regla de Carrito Naranja, generar un lead con la Lead Ads
      Testing Tool y recibir el SMS en un celular.

### Decisiones tomadas

- Las reglas se disparan solo con leads creados por la ingesta de Meta. Los leads que crea
  un asesor a mano (`POST /api/leads`) no reciben SMS automático. Se puede activar después
  llamando a `runLeadCreatedAutomations` desde esa ruta.
- Si varias reglas aplican (una general y otra del cliente), el lead recibe un SMS de cada
  una. Lo normal es tener una sola regla por cliente.
- Sin teléfono válido en formato E.164 no se envía nada.
- El SMS sale a cualquier hora. El horario de envío se trabaja en
  `feat/ai-after-hours-reply`.
- Sin credenciales de Twilio, el mensaje queda guardado como `failed` y `isDemo`, y el lead
  se crea igual.

## Fuera de alcance (otras ramas)

- Respuestas del lead por SMS y estados de entrega: `feat/twilio-sms-inbound-bulk`.
- Horario de envío y respuesta con IA fuera de horario: `feat/ai-after-hours-reply`.
- Reactivación y onboarding: `feat/automations-reactivation-onboarding`.

## Bitácora

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-16 | Plan creado | |
| 2026-10-16 | Fases 1 a 4 implementadas | Faltan aplicar la migración, correr la suite y la prueba real con Twilio |
