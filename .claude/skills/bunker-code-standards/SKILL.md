---
name: bunker-code-standards
description: Use BEFORE writing or modifying any code in Bunker CRM — new or changed API routes, pages, components, React hooks, services, types/interfaces, constants, Zod validations, Prisma queries, or tests (API suites and Playwright E2E). Enforces the project's layered architecture (types → constants → lib → services → routes → hooks → components → pages), no magic strings, no new `any`, multi-tenant scoping and the definition of done. Full rules live in AGENTS.md.
---

# Bunker CRM — estándares de código

Reglas completas y su porqué: [`AGENTS.md`](../../../AGENTS.md). Esta skill es la checklist
y las plantillas para aplicarlas sin pensar.

## Checklist (antes de escribir)

1. **¿En qué capa va?** Tipos → `src/types/`, valores de dominio → `src/lib/constants/`,
   lógica pura → `src/lib/`, Prisma/negocio → `src/services/`, HTTP → `src/app/api/**/route.ts`,
   estado/fetch del cliente → `src/hooks/`, UI → `src/components/<feature>/`, composición → `page.tsx`.
2. **¿Ya existe?** Busca antes de crear: `rg "export (const|function) " src/lib src/services src/hooks`.
   Reutiliza `requireAuth`/`requireAdmin`, `clientBelongsToOrg`, `encryptSecret`, constantes.
3. **¿Hay un texto que se compara en código?** Va a una constante. Nunca `"active"`, `"meta"`, `"ADMIN"` sueltos.
4. **¿Datos de un cliente?** `organizationId` de la sesión; si `user.isClientUser`, forzar `user.clientId`.
5. **¿Devuelve filas con secretos?** `select` explícito.
6. **¿Tipos?** Sin `any` nuevo; `catch (error)` + `error instanceof Error`.
7. **¿Test?** Endpoint con datos de cliente → caso de aislamiento en `tests/`. Flujo de usuario → `e2e/`.

## Plantillas

### Tipo compartido — `src/types/campaigns.ts`
```ts
import type { CampaignStatus } from "@/lib/constants/integrations";

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  spent: number;
}

export interface CampaignsResponse {
  success: true;
  campaigns: CampaignSummary[];
}
```

### Constantes — `src/lib/constants/<dominio>.ts`
```ts
export const LEAD_STATUS = { NEW: "new", QUALIFIED: "qualified", LOST: "lost" } as const;
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS];
```

### Service — `src/services/<dominio>.service.ts`
```ts
import { prisma } from "@/lib/prisma";
import { CAMPAIGN_STATUS } from "@/lib/constants/integrations";

/** Scope ya resuelto por la ruta: el service nunca lee la sesión ni el request. */
export interface TenantScope {
  organizationId: string;
  clientId: string | null; // forzado para usuarios CLIENT
}

export async function listActiveCampaigns(scope: TenantScope) {
  return prisma.campaign.findMany({
    where: {
      organizationId: scope.organizationId,
      status: CAMPAIGN_STATUS.ACTIVE,
      ...(scope.clientId ? { connectedAccount: { clientId: scope.clientId } } : {}),
    },
    select: { id: true, name: true, status: true, spent: true },
  });
}
```

### API route — `src/app/api/<recurso>/route.ts` (delgada)
```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listActiveCampaigns } from "@/services/campaigns.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    const campaigns = await listActiveCampaigns({
      organizationId: user!.organizationId,
      clientId: user!.isClientUser ? user!.clientId : null,
    });
    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar campañas." }, { status: 500 });
  }
}
```
Body con datos → `schema.safeParse(body)` de `src/lib/validations/` → 400 con el primer error.

### Hook — `src/hooks/useCampaigns.ts`
```ts
"use client";
import { useCallback, useEffect, useState } from "react";
import type { CampaignSummary } from "@/types/campaigns";

export function useCampaigns(days: number) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns?days=${days}`);
      const json = await res.json();
      if (json.success) setCampaigns(json.campaigns);
      else setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { campaigns, loading, error, refresh };
}
```

### Componente — `src/components/<feature>/CampaignTable.tsx`
Recibe datos por props (tipados con `src/types/`), no hace `fetch`, no conoce la sesión.
Si pasa de ~150 líneas o mezcla dos responsabilidades, divídelo.

### E2E — `e2e/<flujo>.spec.ts`
```ts
import { expect, test } from "@playwright/test";
import { CLIENT, login, requireCredentials } from "./support/auth";

test("a client only sees their own campaigns", async ({ page }) => {
  requireCredentials(CLIENT, "CLIENT");
  await login(page, CLIENT);
  await page.goto("/campaigns");
  await expect(page.getByRole("heading", { name: /tus campañas/i })).toBeVisible();
});
```
Selectores por rol/texto visible (`getByRole`, `getByText`), nunca por clases de Tailwind.
Solo lectura: la base es producción.

## Definición de terminado

```bash
pnpm typecheck && pnpm lint      # sin errores nuevos
pnpm test:e2e                    # si tocaste páginas, login o roles
pnpm test:<módulo>               # si tocaste endpoints (servidor corriendo)
```
Cambio de esquema → migración en `supabase/migrations/` (`pnpm db:migration:new`), nunca `db push`.
Reporta lo que no pudiste verificar.
