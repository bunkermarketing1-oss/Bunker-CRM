# Plan: captura de leads de Meta Ads (piloto Carrito Naranja)

Objetivo: que cada lead de un formulario de Meta Lead Ads de un cliente llegue al CRM en
segundos, asignado al cliente correcto y sin duplicados, y que esté listo para el SMS de
calificación inmediata.

- **Revisión de avance:** miércoles 21 de octubre de 2026
- **Integración lista:** 8 de noviembre de 2026
- **Cliente piloto:** Carrito Naranja (portafolio y cuenta publicitaria conectados desde el
  business de Bunker Agency)

Leyenda: `[ ]` pendiente · `[x]` hecho y verificado · `[~]` hecho pero sin verificar contra
Meta real (se explica en la nota).

---

## Flujo

```
Formulario Meta Lead Ads
  → Webhook `leadgen` (page_id, leadgen_id, form_id, ad_id)
  → POST /api/integrations/meta/webhook   (verifica firma X-Hub-Signature-256, responde 200 rápido)
  → busca la página en ConnectedAccount (facebook_page + externalId = page_id)
  → GET /{leadgen_id} con el token de la página
  → crea Lead (source = meta_ads, clientId = el cliente asignado a la página,
     externalLeadId = leadgen_id; si ese leadgen_id ya existe, no lo duplica)
  → AuditLog + (fase 2) disparo de la automatización "SMS al recibir lead"
```

Cron de respaldo: recorre los formularios de cada página conectada y crea los leads que
falten. Sirve por si Meta no entrega un webhook o el servidor estuvo caído.

---

## Fase 0: permisos y app de Meta

- [x] Quitar de `META_SCOPES` los scopes de publicación (`pages_manage_posts`,
      `instagram_content_publish`). Se verificó que `api/posts` no llama a Meta (la
      publicación es simulada), así que ningún flujo los usaba.
- [x] Agregar `leads_retrieval`, `pages_manage_metadata` y `pages_manage_ads`.
- [ ] Configurar en la app de Meta: producto **Webhooks** → objeto *Page* → campo `leadgen`,
      URL `https://<dominio>/api/integrations/meta/webhook` y el verify token.
- [ ] Variable `META_WEBHOOK_VERIFY_TOKEN` en `.env` local y en Dokploy (ya está en
      `.env.example` y en el chequeo de Configuración).
- [ ] Enviar a Meta la revisión de la app con `leads_retrieval` (2 o 3 días hábiles).
      Mientras tanto se prueba en modo desarrollo con usuarios que tengan rol en la app.
- [ ] Bunker Agency recibe acceso al portafolio y a la cuenta publicitaria de Carrito Naranja,
      y en el Lead Access Manager de la página se le da acceso a los leads.
- [ ] **Reconectar Meta** en Integraciones después de aprobar los permisos: así se piden los
      scopes nuevos y se suscriben las páginas.

## Fase 1: esquema (migración Supabase)

- [x] `Lead`: índice único `(organizationId, externalLeadId)`.
- [x] `Lead`: columnas `externalFormId`, `externalAdId` y `externalCampaignId`.
- [x] Tabla `MetaLeadEvent` (payload crudo, estado `received/processed/failed/ignored`,
      error, intentos), con RLS activado y `REVOKE` para `anon`/`authenticated`.
- [x] Migración `supabase/migrations/20261016120000_meta_leadgen.sql`. Aborta con un mensaje
      claro si ya hay leads duplicados por `externalLeadId`.
- [ ] **Aplicar la migración en Supabase** (`pnpm db:push`). Tiene que ir **antes** de
      desplegar el código: `GET /api/integrations` ya consulta `MetaLeadEvent`.
- [x] Constantes `LEAD_SOURCE.META_ADS`, `META_LEAD_EVENT_STATUS` y `META_LEAD_MAX_ATTEMPTS`.

## Fase 2: cliente de Graph API (`src/lib/integrations/meta.ts`)

- [x] `verifyMetaSignature(rawBody, header)`: HMAC-SHA256 con `META_APP_SECRET`,
      comparado con `timingSafeEqual`.
- [~] `subscribePageToLeadgen(pageId, pageToken)`: implementada, falta probarla con Meta real.
- [~] `getMetaLead(leadgenId, pageToken)`: implementada, falta probarla con Meta real.
- [~] `listPageLeadForms` y `listFormLeads(formId, token, since)`: implementadas, falta
      probarlas con Meta real.
- [x] `mapMetaLeadFields` (`src/lib/integrations/meta-lead-fields.ts`): nombre completo o
      nombre + apellido, email y teléfono personal o de trabajo, empresa; las demás
      preguntas van a notas. El teléfono se normaliza con `src/lib/phone.ts` en el service.

## Fase 3: service y rutas

- [x] `src/services/meta-leads.service.ts`:
  - [x] `recordLeadgenEvents`: guarda los eventos y descarta los `leadgen_id` repetidos;
  - [~] `processMetaLeadEvent`: busca la página, trae el lead, lo crea con el `clientId` de
        la página, deja `AuditLog` y el estado del evento (falta probar con Meta real);
  - [~] `syncMetaLeads`: backfill + reintento de `failed` (falta probar con Meta real);
  - [~] `subscribeMetaPagesToLeadgen` y `getPagesLeadgenStatus`.
- [x] `GET /api/integrations/meta/webhook`: responde el `hub.challenge` (403 si el token no
      coincide; verificado contra el servidor local).
- [x] `POST /api/integrations/meta/webhook`: 401 sin firma o con firma inválida (verificado
      contra el servidor local); con firma válida siempre responde 200.
- [x] Middleware: no requiere cambios, porque solo protege páginas y no rutas `/api`.
- [~] Suscripción automática de las páginas en el callback OAuth (`meta/callback`).
- [x] `POST /api/cron/sync-meta-leads` (401 sin `CRON_SECRET`, verificado). La validación
      del secreto se movió a `src/lib/cron.ts` y la comparte con `sync-campaigns`.
- [ ] Programar el cron en Dokploy cada 15 minutos.

## Fase 4: interfaz (mínima)

- [x] En Integraciones, bajo cada página: "Recibiendo leads" con la fecha del último, o
      el aviso de reconectar (`src/components/integrations/PageLeadgenStatus.tsx`).
      Falta verlo en el navegador con datos reales.
- [ ] En Leads: mostrar el origen "Meta Ads" con formulario y campaña. Las páginas de
      clientes y de leads las está construyendo el usuario: **preguntar antes de tocarlas**.

## Fase 5: tests y verificación

- [x] `pnpm test:meta-lead-fields`: 7 tests del mapeo de `field_data`, todos pasan.
- [ ] `pnpm test:meta-leads` (`tests/meta-leads-suite.js`, escrito y sin correr: necesita la
      migración aplicada y `META_WEBHOOK_VERIFY_TOKEN`). Cubre:
  - [ ] el verify token correcto devuelve el challenge, y el incorrecto, 403;
  - [ ] el webhook sin firma o con firma inválida devuelve 401 y no guarda eventos;
  - [ ] una página desconocida responde 200 y el evento queda `ignored`;
  - [ ] el mismo `leadgen_id` enviado dos veces deja un solo evento;
  - [ ] el cron sin autorización devuelve 401;
  - [ ] el lead de Meta del cliente A no lo ve el cliente B;
  - [ ] la base rechaza un segundo lead con el mismo `externalLeadId`.
- [x] `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- [ ] Prueba en modo desarrollo con la **Lead Ads Testing Tool** de Meta sobre una página de
      prueba.
- [ ] Prueba real con un lead de Carrito Naranja: llega en menos de 1 minuto, con el cliente,
      la campaña y el teléfono correctos.
- [ ] Apagar el webhook, generar un lead y confirmar que el cron lo recupera.

### Decisiones tomadas

- El cliente del lead sale de la **página** asignada a ese cliente en Integraciones, no de
  la cuenta publicitaria. Si la página no tiene cliente, el lead queda sin cliente y solo
  lo ve Bunker.
- Si el lead ya existe, no se actualiza, para no pisar lo que editó el asesor.
- La calificación (`qualification`) queda en 0; la calcula la rama
  `feat/sms-lead-qualification`.
- Prisma se mantiene solo como cliente de consultas; el esquema se versiona con migraciones
  SQL de Supabase (es el uso que documenta Supabase).

## Ramas por funcionalidad

Todas salen de `dev` y se integran a `dev` por PR cuando están verificadas (`main` despliega
a producción). Este plan se trabaja en `feat/meta-leads`.

| Rama | Funcionalidad | Depende de |
|---|---|---|
| `feat/meta-leads` | Este plan: captura de leads de Meta Ads | — |
| `feat/sms-lead-qualification` | SMS de calificación al recibir lead, conectado a `AutomationRule` | `meta-leads` |
| `feat/twilio-sms-inbound-bulk` | SMS entrantes, estados de entrega y envío masivo | — |
| `feat/twilio-voice-calls` | Llamadas salientes y entrantes con Twilio Voice, control de líneas y escucha en vivo | — |
| `feat/advisor-roles-live-view` | Roles de asesor y dueño, vista en tiempo real de los asesores | — |
| `feat/ai-after-hours-reply` | IA de respuesta automática fuera del horario laboral | `twilio-sms-inbound-bulk` |
| `feat/automations-reactivation-onboarding` | Reactivación de leads estancados y onboarding al cerrar negocio | `sms-lead-qualification` |
| `feat/ads-creative-rotation` | Optimización de pautas con rotación de creativos | — |

Las ramas con dependencia se rebasan sobre `dev` cuando la rama de la que dependen ya se
integró, antes de empezar a trabajarlas.

## Bitácora

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-16 | Plan creado | |
| 2026-10-16 | Fases 0 a 4 implementadas en `feat/meta-leads` | Faltan la migración en Supabase, la configuración de Meta y las pruebas con Meta real |
