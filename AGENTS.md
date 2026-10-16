# Reglas del proyecto Bunker CRM

Guía obligatoria para cualquier agente de IA o desarrollador que modifique este
repositorio. Prevalece sobre el estilo que traigas por defecto. La checklist práctica con
plantillas está en la skill [`bunker-code-standards`](.claude/skills/bunker-code-standards/SKILL.md).

Stack: Next.js 14 (App Router) · TypeScript · Prisma (ORM) · Supabase (Postgres + Auth) ·
Tailwind · pnpm 11 · Node 22 · deploy en Dokploy (Nixpacks).

---

## 1. Capas: dónde va cada cosa

| Capa | Ubicación | Responsabilidad | No debe |
|---|---|---|---|
| **types** | `src/types/` | Interfaces y DTOs compartidos entre API y UI (`CampaignsResponse`, …) | Tener lógica |
| **constants** | `src/lib/constants/` | Valores de dominio (`INTEGRATION_PROVIDER`, `CAMPAIGN_STATUS`, …) | Duplicarse en otro sitio |
| **lib** | `src/lib/` | Funciones **puras**, validaciones Zod (`lib/validations/`), clientes de APIs externas (`lib/integrations/`) | Conocer `NextRequest`/React |
| **services** | `src/services/` | Lógica de negocio y consultas Prisma, siempre filtradas por `organizationId`/`clientId` | Recibir `NextRequest` ni devolver `NextResponse` |
| **API routes** | `src/app/api/**/route.ts` | Autenticar → validar → llamar al service → responder | Tener lógica de negocio o consultas largas |
| **hooks** | `src/hooks/` | `use*`: fetch, estado y efectos del cliente | Renderizar JSX |
| **components** | `src/components/<feature>/` | UI reutilizable y presentacional | Llamar `fetch` o Prisma directamente |
| **pages** | `src/app/**/page.tsx` | Componer hooks + components | Superar ~250 líneas: divide en componentes |

- **Código nuevo sigue esta estructura.** Gran parte del código actual tiene Prisma dentro de las
  rutas y `fetch` dentro de las páginas: es deuda. Si modificas a fondo un archivo así, extrae
  la parte que tocas al service/hook correspondiente; no reescribas lo que no te pidieron.
- **Un componente no llama a `fetch` ni a Prisma.** Usa un hook; el hook llama a la API.
- **Si la lógica se puede calcular sin React ni base de datos, va a `lib/`.**

## 2. Prohibido: magic strings, `any` y secretos expuestos

**Magic strings.** Los estados, roles, proveedores y tipos se guardan como texto en la base.
Cada uno vive **una sola vez** en `src/lib/constants/` (o `ROLES` en `src/lib/auth.ts`):

```ts
// mal
if (integration.provider === "meta" && account.status === "active") { … }

// bien
import { ACCOUNT_STATUS, INTEGRATION_PROVIDER } from "@/lib/constants/integrations";
if (integration.provider === INTEGRATION_PROVIDER.META && account.status === ACCOUNT_STATUS.ACTIVE) { … }
```

Lo mismo para rutas repetidas, nombres de cookies, límites numéricos y textos de error que se
comparan en código. Los textos que solo se muestran en pantalla pueden quedarse en el JSX.

**`any`.** Hay ~130 heredados (ESLint los marca como *warning*): son deuda, no el estándar.
**No sumes más.** Para errores:

```ts
// mal
catch (error: any) { return json({ error: error.message }); }

// bien
catch (error) {
  const message = error instanceof Error ? error.message : "Error desconocido";
}
```

**Secretos.** Nunca devuelvas una fila completa que tenga tokens o hashes: usa `select`
explícito (ver `accessTokenEnc` en `ConnectedAccount`). Los tokens de terceros se guardan
cifrados con `src/lib/crypto.ts`. Nada sensible lleva prefijo `NEXT_PUBLIC_`.

## 3. Seguridad multi-tenant (no negociable)

- `organizationId` **siempre** sale de la sesión (`requireAuth`/`requireAdmin`), nunca del body ni de la URL.
- Un usuario `CLIENT` solo ve datos de su `clientId`: el filtro se fuerza **en el servidor**,
  ignorando cualquier `clientId` que mande el navegador.
- Endpoints internos de Bunker usan `requireAdmin`. Validar en el middleware no basta.
- Todo cambio sensible (asignaciones, conexiones, borrados) deja `AuditLog`.

## 4. Validación y respuestas de API

- Entrada validada con **Zod** (`src/lib/validations/`) antes de tocar la base.
- Forma de respuesta uniforme: `{ success: true, ...data }` o `{ success: false, error }` con el
  status HTTP correcto (400 validación, 401 sin sesión, 403 sin permiso, 404 fuera de su org).
- Mensajes de error al usuario en español; nunca expongas el error interno de Prisma.

## 5. Base de datos

- La base es **Supabase Postgres**. El esquema se versiona en `supabase/migrations/`
  (ver README › Base de datos). **Nunca** `prisma db push` ni cambios manuales en el panel.
- Cambio de esquema: editar `prisma/schema.prisma` → `pnpm db:migration:new <nombre>` → revisar SQL.
  Toda tabla nueva lleva RLS activado y `REVOKE` para `anon`/`authenticated` (el generador lo añade).
- No edites una migración ya aplicada; crea otra.
- **Hoy la única base es producción.** Los scripts de `tests/*.js` crean y borran datos de prueba
  ahí; los E2E son de solo lectura. No escribas tests que modifiquen datos reales.

## 6. Tests

No buscamos cobertura total. Buscamos cubrir **lo que cuesta clientes si falla**: permisos,
aislamiento entre clientes, login, integraciones.

- **API** (`tests/*-suite.js`, `pnpm test:<módulo>`): contratos y permisos de endpoints contra un
  servidor corriendo. Todo endpoint nuevo con datos de cliente lleva su caso de aislamiento.
- **E2E** (Playwright, `e2e/`, `pnpm test:e2e`): flujos de usuario por rol. Credenciales por
  `E2E_*` en `.env`; la primera vez: `pnpm test:e2e:install`.
- Nombres de test describen **comportamiento y su porqué**, no implementación.
- Bug arreglado = test que lo reproduce, antes o junto al arreglo.

## 7. Estilo

- **Identificadores en inglés** (variables, funciones, archivos). **UI y comentarios en español**,
  como el código existente.
- Componentes en `PascalCase.tsx`, hooks `useAlgo.ts`, services `algo.service.ts`, tipos en `src/types/algo.ts`.
- Comentarios explican **por qué**, nunca **qué**. Documenta decisiones no obvias y valores de APIs externas.
- Funciones cortas y con un solo propósito; `early return` en vez de `if` anidados.
- Sin código muerto, `console.log` de depuración ni TODOs sin contexto.

## 8. Trampas específicas de este proyecto

- **No corras `pnpm build` con `pnpm dev` abierto**: comparten `.next/` y el dev queda roto
  (`Cannot find module './1590.js'`). Para verificar tipos usa `pnpm typecheck`.
- **Node 22 obligatorio** (`.nvmrc`): pnpm 11 y `@supabase/supabase-js` fallan en Node 18/20.
- **pnpm 11 bloquea scripts de instalación**: una dependencia nueva con `postinstall` se aprueba en
  `pnpm-workspace.yaml` (`allowBuilds`), si no el deploy falla.
- **Dokploy usa Nixpacks** con `nixpacks.toml`; no commitees `tsconfig.tsbuildinfo` (rompe la caché del build).
- **Push a `main` despliega a producción.** Se trabaja en `dev` y se integra cuando está verificado.
- El MCP de Supabase usa la URL sin parámetros (`.mcp.json`); con `?project_ref=` falla el OAuth.

## 9. Antes de dar algo por terminado

```bash
pnpm typecheck       # obligatorio
pnpm lint            # sin errores nuevos (los warnings heredados no cuentan)
pnpm test:e2e        # si tocaste login, navegación, roles o páginas
pnpm test:<módulo>   # si tocaste endpoints de ese módulo (requiere servidor)
```

El pre-commit (husky + lint-staged) bloquea archivos `.env`, corre `eslint --fix` y `tsc` sobre
lo que está en *stage*. **No uses `--no-verify`.**

## 10. Alcance y honestidad

- Haz lo que se pidió. Ni menos, ni de más.
- Si encuentras un bug fuera del encargo, **dilo, no lo arregles en silencio**.
- Si algo no se pudo verificar (requiere navegador, credenciales, Meta/TikTok reales),
  **dilo explícitamente**. No presentes como confirmado lo que solo compila.
