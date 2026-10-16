import { PrismaClient } from "@prisma/client";

/**
 * El pooler de Supabase en modo sesión admite 15 clientes en total, y Prisma abre por defecto
 * núcleos×2+1 conexiones por proceso: una máquina de 8 núcleos ya agota el pooler sola, y la app
 * de producción se queda sin conexiones (EMAXCONNSESSION). Si la URL no fija connection_limit,
 * se limita aquí; para cambiarlo, añade ?connection_limit=N a DATABASE_URL.
 */
const DEFAULT_CONNECTION_LIMIT = 5;

function withConnectionLimit(databaseUrl: string | undefined): string | undefined {
  if (!databaseUrl || databaseUrl.includes("connection_limit=")) return databaseUrl;
  const separator = databaseUrl.includes("?") ? "&" : "?";
  return `${databaseUrl}${separator}connection_limit=${DEFAULT_CONNECTION_LIMIT}`;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = withConnectionLimit(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
