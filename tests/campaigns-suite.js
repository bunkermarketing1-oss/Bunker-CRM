// tests/campaigns-suite.js
// Campañas & Métricas por cliente: el ADMIN asigna cuentas publicitarias a clientes
// y cada usuario CLIENT ve únicamente las campañas de sus cuentas asignadas.
// Uso: TEST_BASE_URL=http://127.0.0.1:3005 node tests/campaigns-suite.js
// Requiere el esquema aplicado (pnpm db:push) y un servidor corriendo.

const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

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
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3005";
const ADMIN_EMAIL = process.env.AUDIT_EMAIL || "admin@bunkermarketing.io";
const ADMIN_PASSWORD = process.env.AUDIT_PASSWORD || "bunker2026";
const PASSWORD = "bunker2026";
const STAMP = Date.now();

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass, msg });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

const req = (p, opts = {}) => fetch(`${BASE_URL}${p}`, { redirect: "manual", ...opts });
const auth = (cookie) => ({ "Content-Type": "application/json", Cookie: `bunker_session=${cookie}` });

async function login(email, password) {
  const res = await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const m = (res.headers.get("set-cookie") || "").match(/bunker_session=([^;]*)/);
  return m ? m[1] : null;
}

async function provisionClientUser(org, client, email) {
  const { data: list } = await supabaseAdmin.auth.admin.listUsers();
  let sbUser = list?.users?.find((u) => u.email === email);
  const metadata = { name: `Portal ${client.name}`, role: "CLIENT", clientId: client.id };
  if (sbUser) {
    await supabaseAdmin.auth.admin.updateUserById(sbUser.id, { password: PASSWORD, user_metadata: metadata, email_confirm: true });
  } else {
    const { data } = await supabaseAdmin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: metadata });
    sbUser = data?.user;
  }
  return prisma.user.upsert({
    where: { email },
    update: { role: "CLIENT", clientId: client.id, supabaseAuthId: sbUser?.id, isActive: true },
    create: {
      email,
      name: `Portal ${client.name}`,
      passwordHash: "supabase-managed",
      role: "CLIENT",
      clientId: client.id,
      supabaseAuthId: sbUser?.id,
      memberships: { create: { organizationId: org.id, role: "member" } },
    },
  });
}

async function run() {
  console.log("\n=== BUNKER CRM — SUITE: CAMPAÑAS & MÉTRICAS POR CLIENTE ===\n");
  const created = { clients: [], accounts: [], integration: null };

  try {
    const org = await prisma.organization.findFirst({ where: { slug: "bunker-agency" } });
    if (!org) throw new Error("Organización bunker-agency no encontrada");

    const alpha = await prisma.client.create({ data: { organizationId: org.id, name: `Alpha Ads ${STAMP}`, status: "active" } });
    const beta = await prisma.client.create({ data: { organizationId: org.id, name: `Beta Ads ${STAMP}`, status: "active" } });
    created.clients.push(alpha.id, beta.id);

    // Integración aislada para la prueba (no toca la integración real de Meta)
    const integration = await prisma.integration.create({
      data: { organizationId: org.id, provider: "meta_test", name: `Meta Test ${STAMP}`, status: "connected" },
    });
    created.integration = integration.id;

    const mkAccount = (name, ext) =>
      prisma.connectedAccount.create({
        data: { organizationId: org.id, integrationId: integration.id, accountName: name, accountType: "meta_ad_account", externalId: ext },
      });
    const accAlpha = await mkAccount(`Ads Alpha ${STAMP}`, `act_a_${STAMP}`);
    const accBeta = await mkAccount(`Ads Beta ${STAMP}`, `act_b_${STAMP}`);
    created.accounts.push(accAlpha.id, accBeta.id);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const mkCampaign = async (account, name, spend) => {
      const c = await prisma.campaign.create({
        data: {
          organizationId: org.id,
          connectedAccountId: account.id,
          externalId: `cmp_${name}_${STAMP}`,
          name,
          platform: "meta_ads",
          currency: "USD",
          status: "active",
        },
      });
      await prisma.campaignMetric.create({
        data: { campaignId: c.id, date: today, spend, impressions: 1000, clicks: 50, conversions: 5 },
      });
      return c;
    };
    const cmpAlpha = await mkCampaign(accAlpha, `Campaña Alpha ${STAMP}`, 100);
    const cmpBeta = await mkCampaign(accBeta, `Campaña Beta ${STAMP}`, 250);

    await provisionClientUser(org, alpha, `portal-alpha-${STAMP}@test.bunker`);
    await provisionClientUser(org, beta, `portal-beta-${STAMP}@test.bunker`);

    const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const alphaCookie = await login(`portal-alpha-${STAMP}@test.bunker`, PASSWORD);
    const betaCookie = await login(`portal-beta-${STAMP}@test.bunker`, PASSWORD);
    if (!adminCookie || !alphaCookie || !betaCookie) throw new Error("No se pudo iniciar sesión con los usuarios de prueba");

    const getCampaigns = async (cookie, qs = "") => {
      const res = await req(`/api/campaigns?days=7${qs}`, { headers: auth(cookie) });
      return { status: res.status, json: await res.json().catch(() => ({})) };
    };
    const ids = (json) => (json.campaigns || []).map((c) => c.id);

    // 1. Sin asignación, el cliente no ve nada
    let r = await getCampaigns(alphaCookie);
    record("CMP-01", r.status === 200 && !ids(r.json).includes(cmpAlpha.id) && !ids(r.json).includes(cmpBeta.id),
      "Cliente sin cuentas asignadas no ve campañas");

    // 2. CLIENT no puede asignar cuentas
    let res = await req(`/api/integrations/accounts/${accAlpha.id}`, {
      method: "PATCH", headers: auth(alphaCookie), body: JSON.stringify({ clientId: alpha.id }),
    });
    record("CMP-02", res.status === 403, `CLIENT intentando asignar cuenta → HTTP ${res.status} (esperado 403)`);

    // 3. ADMIN asigna cada cuenta a su cliente
    const assign = async (accountId, clientId) =>
      req(`/api/integrations/accounts/${accountId}`, { method: "PATCH", headers: auth(adminCookie), body: JSON.stringify({ clientId }) });
    const [ra, rb] = await Promise.all([assign(accAlpha.id, alpha.id), assign(accBeta.id, beta.id)]);
    record("CMP-03", ra.status === 200 && rb.status === 200, `ADMIN asigna cuentas a clientes → HTTP ${ra.status}/${rb.status}`);

    // 4. Cliente Alpha ve solo lo suyo, con totales correctos
    r = await getCampaigns(alphaCookie);
    record("CMP-04",
      ids(r.json).includes(cmpAlpha.id) && !ids(r.json).includes(cmpBeta.id) && r.json.totals?.spend === 100,
      `Alpha ve solo su campaña (gasto total ${r.json.totals?.spend}, esperado 100)`);

    // 5. Cliente no puede ver otro cliente pasando ?clientId=
    r = await getCampaigns(alphaCookie, `&clientId=${beta.id}`);
    record("CMP-05", !ids(r.json).includes(cmpBeta.id), "Alpha con ?clientId=<beta> sigue sin ver campañas de Beta");

    // 6. Cliente Beta ve solo lo suyo
    r = await getCampaigns(betaCookie);
    record("CMP-06", ids(r.json).includes(cmpBeta.id) && !ids(r.json).includes(cmpAlpha.id), "Beta ve solo su campaña");

    // 7. ADMIN ve ambas y puede filtrar por cliente
    const all = await getCampaigns(adminCookie);
    const onlyBeta = await getCampaigns(adminCookie, `&clientId=${beta.id}`);
    record("CMP-07",
      ids(all.json).includes(cmpAlpha.id) && ids(all.json).includes(cmpBeta.id) &&
        ids(onlyBeta.json).includes(cmpBeta.id) && !ids(onlyBeta.json).includes(cmpAlpha.id),
      "ADMIN ve todas las campañas y el filtro por cliente funciona");

    // 8. Los tokens nunca salen al navegador
    res = await req("/api/integrations", { headers: auth(adminCookie) });
    const body = await res.text();
    record("CMP-08", res.status === 200 && !body.includes("accessTokenEnc"), "GET /api/integrations no expone accessTokenEnc");

    // 9. Desasignar revoca el acceso del cliente
    await assign(accAlpha.id, null);
    r = await getCampaigns(alphaCookie);
    record("CMP-09", !ids(r.json).includes(cmpAlpha.id), "Al desasignar la cuenta, Alpha deja de ver la campaña");

    // 10. CLIENT no puede entrar a /api/integrations
    res = await req("/api/integrations", { headers: auth(betaCookie) });
    record("CMP-10", res.status === 403, `CLIENT en /api/integrations → HTTP ${res.status} (esperado 403)`);
  } catch (err) {
    console.error("Error fatal:", err);
    record("FATAL", false, err.message);
  } finally {
    // Limpieza (campañas y métricas caen por cascada/SetNull; se borran explícitamente)
    if (created.accounts.length) {
      await prisma.campaign.deleteMany({ where: { connectedAccountId: { in: created.accounts } } });
    }
    if (created.integration) await prisma.integration.delete({ where: { id: created.integration } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: { endsWith: `${STAMP}@test.bunker` } } });
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    for (const u of list?.users || []) {
      if (u.email?.endsWith(`${STAMP}@test.bunker`)) await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
    if (created.clients.length) await prisma.client.deleteMany({ where: { id: { in: created.clients } } });

    const passed = results.filter((r) => r.pass).length;
    console.log(`\nRESUMEN: ${passed} / ${results.length} PASADAS\n`);
    await prisma.$disconnect();
    process.exit(passed === results.length ? 0 : 1);
  }
}

run();
