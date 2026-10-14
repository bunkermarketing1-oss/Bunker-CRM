// tests/reports-search-suite.js
// Dashboard, reportes, búsqueda global ⌘K y configuración. Solo lectura: no crea datos.
// Lo que protege: que un usuario CLIENT nunca vea cifras ni registros de otra empresa,
// y que el reporte cuente lo mismo que la base.
// Uso: TEST_BASE_URL=http://127.0.0.1:3005 node tests/reports-search-suite.js
// Usuario CLIENT por E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD (si faltan, esos casos se saltan).

const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (t && !t.startsWith("#") && t.includes("=")) {
      const i = t.indexOf("=");
      let v = t.slice(i + 1).trim();
      if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3005";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || process.env.AUDIT_EMAIL || "admin@bunkermarketing.io";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || process.env.AUDIT_PASSWORD || "bunker2026";
const CLIENT_EMAIL = process.env.E2E_CLIENT_EMAIL;
const CLIENT_PASSWORD = process.env.E2E_CLIENT_PASSWORD;
const DAY_MS = 24 * 60 * 60 * 1000;

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass, msg });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

const req = (p, cookie) =>
  fetch(`${BASE_URL}${p}`, { redirect: "manual", headers: cookie ? { Cookie: `bunker_session=${cookie}` } : {} });

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const m = (res.headers.get("set-cookie") || "").match(/bunker_session=([^;]*)/);
  return m ? m[1] : null;
}

/** Leads creados en la ventana del reporte; margen de 1 min por el desfase entre consulta y API. */
async function countLeadsSince(where, days) {
  const since = new Date(Date.now() - days * DAY_MS + 60_000);
  return prisma.lead.count({ where: { ...where, isDeleted: false, createdAt: { gte: since } } });
}

async function run() {
  console.log("\n=== BUNKER CRM — SUITE: REPORTES & BÚSQUEDA GLOBAL ===\n");

  // Sin sesión no se filtra nada: ni cifras agregadas ni nombres de leads.
  for (const endpoint of ["/api/reports", "/api/search?q=an", "/api/dashboard", "/api/settings"]) {
    const res = await req(endpoint);
    record(`ANON${endpoint}`, res.status === 401, `${endpoint} sin sesión responde 401 (recibido ${res.status})`);
  }

  const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  record("ADMIN-LOGIN", Boolean(adminCookie), "El admin inicia sesión");
  if (!adminCookie) return;

  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, include: { memberships: true } });
  const orgId = admin.memberships[0].organizationId;

  const report = await (await req("/api/reports?days=90", adminCookie)).json();
  const orgLeads = await countLeadsSince({ organizationId: orgId }, 90);
  record("R1", report.success && report.days === 90, "El reporte responde con el período pedido");
  record("R2", report.kpis?.newLeads === orgLeads, `Leads nuevos del reporte = base (${report.kpis?.newLeads} vs ${orgLeads})`);
  const trendTotal = (report.trend || []).reduce((sum, p) => sum + p.leads, 0);
  record("R3", trendTotal === report.kpis?.newLeads, "La tendencia suma exactamente los leads nuevos (sin perder ninguno en los bordes)");

  const invalid = await (await req("/api/reports?days=7", adminCookie)).json();
  record("R4", invalid.days === 90, "Un período no permitido cae al valor por defecto en vez de fallar");

  const dashboard = await (await req("/api/dashboard", adminCookie)).json();
  const orgTotal = await prisma.lead.count({ where: { organizationId: orgId, isDeleted: false } });
  record("D1", dashboard.metrics?.totalLeads === orgTotal, `Leads del dashboard = base (${dashboard.metrics?.totalLeads} vs ${orgTotal})`);

  const settings = await (await req("/api/settings", adminCookie)).json();
  const leaksValue = JSON.stringify(settings).includes(process.env.DATABASE_URL || "__unset__");
  record("SET1", settings.success && Array.isArray(settings.environment) && !leaksValue, "Configuración responde al admin sin exponer valores de variables");

  const short = await (await req("/api/search?q=a", adminCookie)).json();
  record("S1", short.success && short.results.length === 0, "Búsquedas de 1 letra no consultan la base");

  if (!CLIENT_EMAIL || !CLIENT_PASSWORD) {
    console.log("SKIP casos CLIENT: define E2E_CLIENT_EMAIL y E2E_CLIENT_PASSWORD.");
    return;
  }

  const clientCookie = await login(CLIENT_EMAIL, CLIENT_PASSWORD);
  record("CLIENT-LOGIN", Boolean(clientCookie), "El usuario CLIENT inicia sesión");
  if (!clientCookie) return;
  const clientUser = await prisma.user.findUnique({ where: { email: CLIENT_EMAIL } });

  const settingsRes = await req("/api/settings", clientCookie);
  record("C0", settingsRes.status === 403, `Un CLIENT no puede ver la configuración (recibido ${settingsRes.status})`);

  const clientDashboard = await (await req("/api/dashboard", clientCookie)).json();
  const ownTotal = await prisma.lead.count({ where: { organizationId: orgId, clientId: clientUser.clientId, isDeleted: false } });
  record("C3", clientDashboard.metrics?.totalLeads === ownTotal && clientDashboard.integrations?.length === 0, "El dashboard del CLIENT solo cuenta su empresa y no ve integraciones");

  const clientReport = await (await req("/api/reports?days=365", clientCookie)).json();
  const ownLeads = await countLeadsSince({ organizationId: orgId, clientId: clientUser.clientId }, 365);
  record("C1", clientReport.kpis?.newLeads === ownLeads, `El reporte del CLIENT solo cuenta leads de su empresa (${clientReport.kpis?.newLeads} vs ${ownLeads})`);

  // Términos cortos y comunes para que la búsqueda de verdad devuelva registros.
  const leaked = [];
  for (const term of ["an", "ar", "co", "@"]) {
    const { results: found = [] } = await (await req(`/api/search?q=${encodeURIComponent(term)}`, clientCookie)).json();
    for (const r of found) {
      const model = r.kind === "lead" ? prisma.lead : r.kind === "client" ? prisma.client : prisma.contact;
      const row = await model.findUnique({ where: { id: r.id } });
      const ownerClientId = r.kind === "client" ? row?.id : row?.clientId;
      if (ownerClientId !== clientUser.clientId) leaked.push(`${r.kind}:${r.id}`);
    }
  }
  record("C2", leaked.length === 0, `La búsqueda del CLIENT no devuelve registros de otras empresas${leaked.length ? `: ${leaked.join(", ")}` : ""}`);
}

run()
  .catch((error) => record("CRASH", false, error instanceof Error ? error.message : String(error)))
  .finally(async () => {
    await prisma.$disconnect();
    const failed = results.filter((r) => !r.pass).length;
    console.log(`\n${results.length - failed}/${results.length} casos pasaron.`);
    process.exit(failed ? 1 : 0);
  });
