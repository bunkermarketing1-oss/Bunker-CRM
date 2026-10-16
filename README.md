# Bunker Agency — CRM Híbrido con Automatización e IA

Plataforma CRM avanzada para **Bunker Agency** diseñada para la gestión comercial, calificación de prospectos, automatización de marketing y asistencia impulsada por Inteligencia Artificial.

## 🚀 Despliegue en Producción
- **Panel Dokploy:** http://179.236.72.72:3000/
- **Dominio de Aplicación:** https://crm.179.236.72.72.sslip.io
- **CI/CD:** Despliegue automático en cada push a la rama `main`.

## 🗄️ Base de datos (Supabase + migraciones)

La base es **PostgreSQL de Supabase**. La fuente de verdad del esquema son las migraciones SQL en
[`supabase/migrations/`](supabase/migrations) (formato del CLI de Supabase: `YYYYMMDDHHMMSS_nombre.sql`).
Prisma se usa solo como ORM: `prisma/schema.prisma` debe coincidir siempre con las migraciones.
**No usar `prisma db push` ni `prisma migrate`.**

Reglas:
- Todo cambio de tablas, columnas o índices va en una migración nueva; nunca se edita una migración ya aplicada.
- Toda tabla nueva lleva `ENABLE ROW LEVEL SECURITY` y `REVOKE ALL ... FROM anon, authenticated`
  (la app accede vía Prisma como `postgres`; la Data API de Supabase queda cerrada). El generador lo añade solo.

Flujo para cambiar el esquema:

```bash
pnpm db:start                         # Supabase local (Docker), aplica todas las migraciones
# 1. editar prisma/schema.prisma
pnpm db:migration:new nombre_cambio   # genera supabase/migrations/<ts>_nombre_cambio.sql
# 2. revisar el SQL generado
pnpm db:migration:up                  # aplicarla en local; DATABASE_URL local para probar la app
pnpm db:push                          # aplicar en el proyecto remoto (requiere `supabase link`)
```

Otros comandos: `pnpm db:reset` (recrea la base local desde cero), `pnpm db:status` (migraciones
aplicadas en local y remoto), `pnpm db:stop`.

Primera vez contra el proyecto remoto:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref exhwropgwwaeybzfeyei
# La base de producción ya tenía las tablas de la migración base (creadas con prisma db push):
pnpm exec supabase migration repair --status applied 20261013180000
pnpm db:push                          # aplica las migraciones pendientes
```
