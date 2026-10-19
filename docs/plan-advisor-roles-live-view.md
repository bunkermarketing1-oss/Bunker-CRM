# Plan: rol dueño del cliente y vista en vivo de asesores

Rama: `feat/advisor-roles-live-view`, montada sobre `integracion/crm-comercial` (`c62e42b`),
que ya trae las llamadas de Twilio (`docs/plan-twilio-voice-calls.md`).

Objetivo (reunión): "Vista en tiempo real del trabajo de asesores comerciales para el dueño" y
"Canal bidireccional para escuchar llamadas en vivo desde la plataforma". El dueño del negocio
de un cliente ve qué hace cada asesor de su empresa en este momento y puede escuchar o
susurrar en sus llamadas. Los asesores no ven nada de esto. Bunker ve a todos los clientes.

Leyenda: `[ ]` pendiente · `[x]` hecho y verificado · `[~]` hecho pero sin verificar contra
un servidor o Twilio real.

---

## Cómo funciona

```
Roles (User.role, texto; sin migración)
  ADMIN         equipo de Bunker
  CLIENT        asesor del portal de un cliente
  CLIENT_OWNER  dueño del cliente = CLIENT + supervisión de su empresa

Sesión (lib/auth.ts → getCurrentUser)
  role          canónico ADMIN | CLIENT  (el dueño sale como CLIENT)
  isClientUser  true para asesor y dueño  → clientId forzado en todo el CRM
  isClientOwner true solo si el rol es CLIENT_OWNER y tiene clientId

Vista en vivo (/team/live)
  useTeamLive ──(cada 5 s, en pausa con la pestaña oculta)──► GET /api/team/live[?clientId]
     requireSupervisor: asesor → 403
     scope: dueño → su clientId (ignora el del navegador); Bunker → todos o ?clientId=
     getTeamLiveView(scope)
        usuarios de portal del scope
        groupBy por métrica (llamadas, contestadas, tiempo, SMS, leads, tareas, última actividad)
        llamadas en curso por asesor + listLiveCalls(scope)

Escucha / susurro (mismo flujo que el admin)
  useVoiceDevice({ receiveIncoming: false }).monitor(callId, listen|whisper)
     → TwiML App → joinAsSupervisor → canMonitorCall(supervisor, call) → AuditLog
```

## Decisiones

- **El dueño es un usuario de portal con un permiso extra, no un rol nuevo de acceso.**
  `normalizeRole("CLIENT_OWNER")` devuelve `CLIENT`, así todo `requireRole`, `requireAdmin`,
  `scopeFromUser`, el middleware y cada filtro por `clientId` lo tratan como cliente sin
  tocarlos. Lo único nuevo es `isClientOwner` y `requireSupervisor`. Nada que pida ADMIN lo
  deja pasar (lo prueban `tests/roles.test.mjs` y LIVE-16/17).
- **Antes, cualquier rol desconocido se normalizaba a ADMIN.** Si se hubiera guardado
  `CLIENT_OWNER` sin tocar `normalizeRole`, el `clientId` lo habría salvado, pero por
  accidente. Ahora `CLIENT_OWNER` está en la lista de alias de cliente y la API solo acepta
  roles de `ASSIGNABLE_ROLES` (Zod).
- **`CLIENT_ADMIN` (heredado) no se promueve a dueño.** Darle escucha de llamadas a cuentas
  viejas sin que nadie lo decida sería un permiso nuevo silencioso. Bunker marca al dueño a mano.
- **Roles en `src/lib/roles.ts`**, puro y sin imports: lo usan el middleware (edge),
  `lib/auth.ts` (que los re-exporta para no tocar las rutas existentes), los services y los
  tests de Node.
- **Combinaciones válidas:** usuario con empresa → `CLIENT` o `CLIENT_OWNER`; usuario de Bunker
  → `ADMIN` (`isRoleAllowedForUser`). Pedir otra cosa responde 400.
- **Quién asigna:** solo Bunker, en la ficha del cliente (`/crm/clients/[id]`, panel "Usuarios
  del portal"), con `PUT /api/users`. El cambio queda en AuditLog como `user_role_changed` con
  el rol anterior. Puede haber más de un dueño por cliente.
- **Metadatos de Supabase:** el cambio de rol no actualiza `user_metadata.role`. El middleware
  solo lo usa para redirigir páginas internas y ya trata como cliente a cualquiera con
  `clientId`; la autorización real sale siempre de la base en `getCurrentUser`.
- **Escucha:** `canMonitorCall` permite al admin de la organización (como antes) o al dueño
  cuyo `clientId` es el de la llamada. Un asesor nunca, ni en llamadas de su empresa. El
  AuditLog `call_monitored` ahora guarda también el rol del supervisor y el cliente. **Sigue
  pendiente la revisión legal** (aviso de privacidad de cada cliente): ahora escucha también el
  dueño, no solo Bunker.
- **"Hoy"** se corta a medianoche de `America/Bogota` (`DEFAULT_TEAM_TIME_ZONE`): ni
  `Organization` ni `Client` tienen zona horaria en el esquema. Con la medianoche del servidor
  (UTC) el día terminaría a las 7 p. m. Si se agrega el campo, el service debe preferirlo.
- **Métricas** (todas de hoy, por usuario):
  - llamadas = salientes creadas; contestadas = salientes con `answeredAt`;
  - tiempo hablado = suma de `durationSec` de sus llamadas (entrantes y salientes);
  - SMS = Activities `sms` del usuario (intentos de envío; los entrantes no tienen usuario);
  - leads contactados = leads distintos con una Activity de llamada, SMS, email o reunión
    (una nota no cuenta);
  - tareas = tareas asignadas al usuario completadas hoy (`completedAt`);
  - última actividad = la más reciente entre sus Activities y sus llamadas de hoy.
- **Estado:** en llamada (tiene una `ringing`/`in_progress`), disponible (actividad en los
  últimos `ADVISOR_IDLE_MINUTES` = 30) o inactivo. Es una aproximación: el CRM no sabe si el
  asesor tiene la pestaña abierta.
- **Consultas:** una `groupBy` por métrica para todos los asesores del scope (8 consultas + la
  lista de usuarios + llamadas en curso), no una por asesor. `Activity` y `Task` no tienen
  `organizationId`: el aislamiento sale de filtrar por los ids de usuarios ya acotados por
  organización y cliente.
- **Teléfono en la vista:** se reutiliza `useVoiceDevice` (sin duplicar el Device) con
  `receiveIncoming: false`: no registra el dispositivo, así una entrante no timbra en una
  pantalla sin botón de contestar. `LiveCallsPanel` también se reutiliza.
- **Polling:** `usePolling` (nuevo, genérico) se pausa con la pestaña oculta y refresca al volver.

## Fase 1: rol

- [x] `src/lib/roles.ts`: `CLIENT_OWNER`, `normalizeRole`, `toStoredRole`,
      `isRoleAllowedForUser`, `canMonitorCall`.
- [x] `AuthenticatedUser.isClientOwner`, `/api/auth/me` y `AuthContext` lo exponen;
      `requireSupervisor`.
- [x] Middleware: `/team` protegida; el dueño cuenta como cliente para las páginas internas.
- [x] `PUT /api/users` con Zod y AuditLog `user_role_changed` (`services/users.service.ts`);
      `POST /api/users` acepta `CLIENT_OWNER` con empresa obligatoria.
- [x] Panel "Usuarios del portal" en la ficha del cliente (solo Bunker).
- [x] Revisado `prisma/provision-users.js`: solo crea usuarios de Bunker (`admin`, `sales_rep`,
      `marketing_specialist` → ADMIN). No necesita cambios.

## Fase 2: vista en vivo

- [x] `services/team-live.service.ts` (`getTeamLiveView`) y `GET /api/team/live`.
- [x] `useTeamLive` + `usePolling` (5 s, pausa con pestaña oculta).
- [x] `/team/live`: tabla de asesores, llamadas en vivo con Escuchar/Susurrar, barra de la
      sesión de escucha; filtro por cliente para Bunker.
- [x] Navegación: "Mi Equipo › Equipo en vivo" para el dueño, "Asesores en vivo" para Bunker.
- [~] Verlo en el navegador con datos reales.

## Fase 3: escucha del dueño

- [x] `joinAsSupervisor` usa `canMonitorCall`; AuditLog con rol y cliente.
- [x] `GET /api/voice/calls` devuelve `liveCalls` al dueño (solo su empresa); `/messaging/calls`
      le muestra "En vivo".
- [~] Escuchar y susurrar con Twilio real desde la sesión de un dueño.

## Fase 4: tests y verificación

- [x] `tests/roles.test.mjs` y `tests/team-live.test.mjs` (pasan con `node --test`).
- [ ] `pnpm test:live-view` (`tests/live-view-suite.js`, 20 casos): escrita, **sin correr**
      (la única base es producción y requiere servidor). Cubre: asesor → 403, dueño de A no ve
      ni escucha a B aunque mande `?clientId=B`, admin ve todo y filtra, cliente de otra
      organización → 404, dueño sin permisos de Bunker, asignación de rol solo por admin.
- [x] `pnpm typecheck` y `pnpm lint` sin errores nuevos.
- [ ] E2E con una cuenta de dueño (`E2E_*`): no hay credenciales de dueño todavía.

### Pendientes conocidos

- Zona horaria por cliente u organización (hoy constante).
- El estado "disponible" se infiere de la actividad; un heartbeat del navegador lo haría exacto.
- Las entrantes siguen sin poder escucharse (ver plan de voz).
- Revisión legal de la escucha por parte del dueño.

## Bitácora

| Fecha | Avance | Notas |
|---|---|---|
| 2026-10-19 | Plan creado e implementación de las fases 1 a 4 | Tests puros pasan; suite de API escrita sin correr; sin prueba en navegador ni con Twilio real |
