# Plan: reactivación de estancados y onboarding automático

Rama: `feat/automations-reactivation-onboarding`, montada sobre `integracion/crm-comercial`
(`c62e42b`).

Objetivos de la reunión: **reactivación de prospectos estancados** y **onboarding automático
al cerrar negocio**. El motor ya existía (`services/opportunity-automations.service.ts`), pero
solo corría con reglas que nadie podía crear: no había pantalla, y el barrido de estancados
solo se lanzaba a mano. Esta rama agrega la pantalla, el cron y una definición más exacta de
"estancado".

Leyenda: `[ ]` pendiente · `[x]` hecho y verificado · `[~]` hecho pero sin verificar contra la
base o el navegador.

---

## Flujo

```
Oportunidad pasa a ganada (PUT /api/pipeline)
  → reglas activas deal_won + create_tasks del cliente (o generales si el cliente no tiene)
  → checklist de tareas "[Onboarding] …" con vencimiento a N días

Oportunidad cambia de etapa (PUT /api/pipeline)
  → reglas activas stage_changed + create_tasks cuya etapa coincide (sin tildes ni mayúsculas)
  → una tarea "<título>: <oportunidad>" con vencimiento a N horas

Cron diario POST /api/cron/stale-leads (o botón "Revisar estancados ahora")
  → organizaciones con reglas activas stale_leads_check + create_tasks
  → por regla: leads abiertos sin Activity/Message/Call en N días y sin cambios en N días,
      sin una tarea de reactivación pendiente (hasta 100 por regla y barrido)
  → tarea "Reactivación de prospecto estancado: <lead>" con el mensaje sugerido en la descripción
  → executionCount / lastRunAt de la regla + AuditLog del barrido
```

Ninguna de las tres reglas envía mensajes al lead.

## Fase 1: dominio y lógica pura

- [x] Constantes en `lib/constants/automations.ts`: `TASK_AUTOMATION_KIND` (tipo de regla ↔
      trigger), límites (`TASK_AUTOMATION_LIMITS`), valores por defecto
      (`TASK_AUTOMATION_DEFAULTS`, antes escritos dentro del service) y `AUTOMATION_AUDIT_ACTION`.
- [x] `src/types/task-automations.ts`: configuración por tipo, `TaskAutomationSummary`
      (unión discriminada por `kind`), borrador del formulario y respuesta de la API.
- [x] `src/lib/automations/task-rules.ts`: leer y escribir la configuración (compatible con el
      JSON que ya usaba el motor), coincidencia de etapa, prioridad cliente/general, fecha de
      corte y días sin contacto.
- [x] `src/lib/validations/task-automation.ts`: Zod con unión por `kind`. Onboarding: 1 a 10
      tareas de hasta 120 caracteres y 0 a 90 días. Seguimiento: etapa, título y 1 a 720 horas.
      Estancados: 1 a 180 días y mensaje sugerido opcional de hasta 480 caracteres.

## Fase 2: service y rutas

- [~] `src/services/task-automations.service.ts`: listar, crear, editar (fusiona con lo
      guardado), pausar y borrar por organización, `clientBelongsToOrg`, `select` explícito y
      AuditLog en crear, editar y borrar. Archivo aparte de `automations.service.ts` para no
      chocar con la rama que edita `runLeadCreatedAutomations`.
- [~] `GET/POST /api/automations/tasks` y `PATCH/DELETE /api/automations/tasks/[id]`, solo
      admin (`requireAdmin`). El GET devuelve también las etapas del pipeline de la organización.
- [~] `opportunity-automations.service.ts`: usa la lib, respeta `dueInDays` y `taskTitle`, filtra
      por `actionType: create_tasks` y aplica la regla del cliente por encima de la general.
- [~] Nueva definición de estancado (ver decisiones) en una sola consulta con filtros `none`.
- [~] `POST /api/cron/stale-leads` con `CRON_SECRET` (`lib/cron.ts`); una organización que falla
      no detiene a las demás. Se mantiene `POST /api/automations/run-stale-check`.

## Fase 3: interfaz

- [~] `/automations`: debajo de los SMS, bloque "Tareas automáticas" con una sección por tipo
      (`TaskAutomationsSection`): tarjetas, pausar, editar, borrar y formulario por tipo
      (`TaskAutomationForm` + `TaskAutomationFields`). La etapa se elige de las etapas del
      pipeline; si una regla vieja apunta a una etapa renombrada, se conserva al editar.
- [~] Panel "Revisar estancados ahora" con el resultado (tareas creadas y leads, hasta 10).

## Fase 4: tests y verificación

- [x] `pnpm test:task-rules` (`tests/task-rules.test.mjs`, 12 tests): JSON roto, valores por
      defecto, ida y vuelta de la configuración, etapa sin tildes, prioridad cliente/general,
      corte y días sin contacto, mensaje sugerido. Todos pasan.
- [x] `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- [ ] Caso en `tests/automations-suite.js` para `/api/automations/tasks` (401, 403 para CLIENT,
      cliente de otra organización, aislamiento al editar y borrar) y 401 del cron sin
      `CRON_SECRET`. No se escribió ni se corrió: la suite crea datos y la única base es producción.
- [ ] Probar en el navegador: crear las tres reglas, cerrar una oportunidad de prueba, mover
      una etapa y correr el barrido manual.
- [ ] Configurar el cron en Dokploy (abajo) y revisar el primer barrido en `AuditLog`.

## Cron en Dokploy

Una vez al día, en horario laboral para que las tareas aparezcan al empezar el día:

```
# 13:00 UTC = 8:00 en Bogotá / Lima / Ciudad de México (horario sin DST)
0 13 * * *  curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/stale-leads
```

Usa el mismo `CRON_SECRET` que `sync-meta-leads` y `sync-campaigns`. Correrlo más seguido no
duplica tareas (se salta el lead con una tarea de reactivación pendiente), pero no aporta: el
umbral se mide en días.

### Decisiones tomadas

- **Qué es "estancado".** Antes bastaba `lead.updatedAt` viejo, pero registrar una llamada, un
  SMS o una actividad no toca la fila del lead, así que un lead trabajado a diario podía salir
  como estancado. Ahora un lead abierto (`new`, `contacted`, `qualified`) está estancado si en
  N días **no tiene** Activity (por `performedAt` ni `createdAt`), Message (entrante o saliente)
  ni Call, **y** su `updatedAt` también es anterior a N días (editar estado o notas cuenta como
  trabajo). Va en una sola consulta con `none` sobre cada relación; los `take: 1` solo calculan
  hace cuántos días fue el último contacto para la descripción.
- **Cliente sobre general.** Si un cliente tiene su propia regla de un tipo, esa reemplaza a la
  general para sus registros (mismo criterio que el SMS de bienvenida). Sin esto, un negocio
  ganado tendría dos checklists, y en estancados la regla general (p. ej. 14 días) alcanzaría
  a los leads de un cliente que configuró 30. Antes, todas las reglas que aplicaban se sumaban.
- **Reactivación sin SMS automático.** La regla crea una tarea con un mensaje sugerido; el
  asesor decide si lo envía. Un lead que lleva semanas sin contacto puede haber pedido BAJA,
  haber dado su número para otra cosa o no querer más mensajes: un SMS automático sin revisar
  el consentimiento y el opt-out arriesga reportes de spam y el bloqueo del número de Twilio.
  Se puede evaluar en otra iteración, siempre pasando por `isPhoneOptedOut` y con horario.
- **Tipo de regla.** No hay columna nueva: el tipo se deduce del trigger con acción
  `create_tasks`, así que no hace falta migración y las reglas que ya existieran se ven en la
  pantalla. Al editar, el `kind` no se puede cambiar.
- **Formato del JSON compatible.** Se mantienen `tasks`, `stageNameMatch`, `hoursDue` e
  `inactiveDays` y se agregan `dueInDays`, `taskTitle` y `suggestedMessage`; si faltan, se usan
  los valores de antes (1 día, "Llamada de seguimiento", 14 días).
- **Barrido por cron.** Corre con `userId: null`; las tareas van al dueño del lead y, si no
  tiene, quedan sin asignar. El AuditLog marca `trigger: "cron"` o `"manual"`.
- **Tope de 100 leads por regla y barrido** (`STALE_LEADS_BATCH_SIZE`), del más viejo al más
  nuevo: una organización con miles de leads viejos avanza la cola día a día en lugar de
  crear miles de tareas de golpe.

## Fuera de alcance

- SMS automático de reactivación (ver decisión arriba).
- Otras acciones (asignar asesor, avisar por Slack) y triggers nuevos.
- Plantillas de tareas por industria o importadas.

## Bitácora

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-19 | Plan creado; fases 1 a 3 implementadas | Unit tests, typecheck y lint verdes. Falta probar en navegador contra la base, la suite de API y configurar el cron en Dokploy |
