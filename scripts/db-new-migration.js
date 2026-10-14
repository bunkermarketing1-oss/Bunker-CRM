#!/usr/bin/env node
// Genera una migración de Supabase a partir de los cambios en prisma/schema.prisma.
//
// Uso:  pnpm db:migration:new <nombre_en_snake_case>
//
// Compara la base LOCAL de Supabase (`pnpm db:start`, ya con todas las migraciones
// aplicadas) contra prisma/schema.prisma y escribe la diferencia en
// supabase/migrations/<YYYYMMDDHHMMSS>_<nombre>.sql. A cada tabla nueva le añade
// RLS activado y revoca el acceso de anon/authenticated (estándar del proyecto).

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const name = process.argv[2];
if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error("Uso: pnpm db:migration:new <nombre_en_snake_case>");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const localDbUrl = process.env.SUPABASE_LOCAL_DB_URL || "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

let sql;
try {
  sql = execFileSync(
    "prisma",
    ["migrate", "diff", "--from-url", localDbUrl, "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
    { cwd: root, encoding: "utf-8", env: { ...process.env, DATABASE_URL: localDbUrl }, stdio: ["ignore", "pipe", "inherit"] }
  );
} catch {
  console.error("\nNo se pudo comparar con la base local. ¿Está corriendo? -> pnpm db:start");
  process.exit(1);
}

if (!sql.trim() || /^-- This is an empty migration\.?\s*$/m.test(sql.trim())) {
  console.log("Sin cambios: la base local ya coincide con prisma/schema.prisma.");
  process.exit(0);
}

const newTables = Array.from(sql.matchAll(/CREATE TABLE "([^"]+)"/g)).map((m) => m[1]);
const rls = newTables.length
  ? "\n-- Tablas nuevas: RLS activado y sin acceso desde la Data API (la app usa Prisma como postgres).\n" +
    newTables
      .map((t) => `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;\nREVOKE ALL ON TABLE "${t}" FROM anon, authenticated;`)
      .join("\n") +
    "\n"
  : "";

const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const file = path.join(migrationsDir, `${ts}_${name}.sql`);
const header =
  `-- =============================================================================\n` +
  `-- ${name}\n` +
  `-- Generado con scripts/db-new-migration.js (prisma migrate diff contra Supabase local).\n` +
  `-- Revisar antes de commitear: renombres de columnas aparecen como DROP + ADD.\n` +
  `-- =============================================================================\n\n`;

fs.mkdirSync(migrationsDir, { recursive: true });
fs.writeFileSync(file, header + sql.trimEnd() + "\n" + rls);

console.log(`Migración creada: ${path.relative(root, file)}`);
if (sql.includes("DROP ")) {
  console.warn("ATENCIÓN: la migración contiene DROP. Revisa que no se pierdan datos.");
}
console.log("Siguiente paso: pnpm db:migration:up  (aplicarla en local y probar)");
