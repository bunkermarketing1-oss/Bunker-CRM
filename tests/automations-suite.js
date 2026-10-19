// tests/automations-suite.js
// Automatizaciones "lead nuevo → SMS": solo el ADMIN las gestiona, una organización no
// puede ver ni tocar las reglas de otra, y las plantillas inválidas se rechazan.
// Uso: TEST_BASE_URL=http://127.0.0.1:3005 node tests/automations-suite.js
// Requiere la migración 20261016150000_automation_rule_client aplicada y un servidor corriendo.
// No envía SMS: ninguna regla de prueba llega a ejecutarse.

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
const json = async (res) => res.json().catch(() => ({}));

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
  const { data } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: `Portal ${client.name}`, role: "CLIENT", clientId: client.id },
  });
  return prisma.user.create({
    data: {
      email,
      name: `Portal ${client.name}`,
      passwordHash: "supabase-managed",
      role: "CLIENT",
      clientId: client.id,
      supabaseAuthId: data?.user?.id,
      memberships: { create: { organizationId: org.id, role: "member" } },
    },
  });
}

const VALID_RULE = {
  name: `SMS prueba ${STAMP}`,
  sources: ["meta_ads"],
  template: "Hola {{nombre}}, gracias por tu interés en {{cliente}}.",
  isActive: false, // pausada: nunca se ejecuta aunque llegue un lead real durante la prueba
};

async function run() {
  console.log("\n=== BUNKER CRM — SUITE: AUTOMATIZACIONES SMS ===\n");
  const created = { clients: [], orgs: [], rules: [] };

  try {
    const org = await prisma.organization.findFirst({ where: { slug: "bunker-agency" } });
    if (!org) throw new Error("Organización bunker-agency no encontrada");

    // Otra organización con su cliente y su regla, para probar el aislamiento
    const otherOrg = await prisma.organization.create({ data: { name: `Otra agencia ${STAMP}`, slug: `otra-${STAMP}` } });
    created.orgs.push(otherOrg.id);
    const otherClient = await prisma.client.create({ data: { organizationId: otherOrg.id, name: `Cliente ajeno ${STAMP}`, status: "active" } });
    const otherRule = await prisma.automationRule.create({
      data: {
        organizationId: otherOrg.id,
        name: `Regla ajena ${STAMP}`,
        triggerEvent: "lead_created",
        actionType: "send_sms",
        actionPayload: JSON.stringify({ template: "Hola" }),
        isActive: false,
      },
    });

    const ownClient = await prisma.client.create({ data: { organizationId: org.id, name: `Cliente SMS ${STAMP}`, status: "active" } });
    created.clients.push(ownClient.id);
    await provisionClientUser(org, ownClient, `client.automations.${STAMP}@test.bunker`);

    const adminCookie = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    const clientCookie = await login(`client.automations.${STAMP}@test.bunker`, PASSWORD);
    if (!adminCookie || !clientCookie) throw new Error("No se pudo iniciar sesión (admin o cliente)");

    // 1. Sin sesión no hay acceso
    let res = await req("/api/automations");
    record("AUT-01", res.status === 401, `GET sin sesión → HTTP ${res.status} (esperado 401)`);

    // 2. Un usuario CLIENT no puede ver ni crear automatizaciones (son de Bunker)
    res = await req("/api/automations", { headers: auth(clientCookie) });
    const clientGet = res.status;
    res = await req("/api/automations", { method: "POST", headers: auth(clientCookie), body: JSON.stringify(VALID_RULE) });
    record("AUT-02", clientGet === 403 && res.status === 403, `CLIENT → GET ${clientGet}, POST ${res.status} (esperado 403)`);

    // 3. Plantillas inválidas se rechazan antes de guardar
    res = await req("/api/automations", { method: "POST", headers: auth(adminCookie), body: JSON.stringify({ ...VALID_RULE, template: "  " }) });
    const emptyStatus = res.status;
    res = await req("/api/automations", {
      method: "POST",
      headers: auth(adminCookie),
      body: JSON.stringify({ ...VALID_RULE, template: "Hola {{nombr}}" }),
    });
    const typo = await json(res);
    record(
      "AUT-03",
      emptyStatus === 400 && res.status === 400 && /nombr/.test(typo.error || ""),
      `Plantilla vacía → ${emptyStatus}; variable mal escrita → ${res.status} "${typo.error}"`
    );

    res = await req("/api/automations", {
      method: "POST",
      headers: auth(adminCookie),
      body: JSON.stringify({ ...VALID_RULE, template: "x".repeat(481) }),
    });
    record("AUT-04", res.status === 400, `Plantilla de 481 caracteres → HTTP ${res.status} (esperado 400)`);

    // 4. No se puede asignar la regla a un cliente de otra organización
    res = await req("/api/automations", {
      method: "POST",
      headers: auth(adminCookie),
      body: JSON.stringify({ ...VALID_RULE, clientId: otherClient.id }),
    });
    record("AUT-05", res.status === 400, `Regla con cliente de otra organización → HTTP ${res.status} (esperado 400)`);

    // 5. Crear una regla válida para el cliente propio
    res = await req("/api/automations", {
      method: "POST",
      headers: auth(adminCookie),
      body: JSON.stringify({ ...VALID_RULE, clientId: ownClient.id }),
    });
    const createdRule = (await json(res)).automation;
    if (createdRule) created.rules.push(createdRule.id);
    record(
      "AUT-06",
      res.status === 201 && createdRule?.clientName === ownClient.name && createdRule?.sources?.[0] === "meta_ads",
      `Regla válida → HTTP ${res.status}, cliente "${createdRule?.clientName}"`
    );

    const audit = createdRule
      ? await prisma.auditLog.findFirst({ where: { action: "automation_created", entityId: createdRule.id } })
      : null;
    record("AUT-07", Boolean(audit), "Crear la regla deja AuditLog");

    // 6. El listado trae la regla propia y nunca la de otra organización
    res = await req("/api/automations", { headers: auth(adminCookie) });
    const ids = ((await json(res)).automations || []).map((a) => a.id);
    record("AUT-08", ids.includes(createdRule?.id) && !ids.includes(otherRule.id), "GET lista la regla propia y no la ajena");

    // 7. Editar o borrar una regla de otra organización responde 404 y no la toca
    res = await req(`/api/automations/${otherRule.id}`, { method: "PATCH", headers: auth(adminCookie), body: JSON.stringify({ isActive: true }) });
    const patchOther = res.status;
    res = await req(`/api/automations/${otherRule.id}`, { method: "DELETE", headers: auth(adminCookie) });
    const stillThere = await prisma.automationRule.findUnique({ where: { id: otherRule.id } });
    record(
      "AUT-09",
      patchOther === 404 && res.status === 404 && stillThere && !stillThere.isActive,
      `Regla ajena → PATCH ${patchOther}, DELETE ${res.status} (esperado 404), sigue intacta`
    );

    // 8. Editar la regla propia
    res = await req(`/api/automations/${createdRule.id}`, {
      method: "PATCH",
      headers: auth(adminCookie),
      body: JSON.stringify({ template: "Hola {{nombre}}, ¿te llamamos hoy?" }),
    });
    const patched = (await json(res)).automation;
    record(
      "AUT-10",
      res.status === 200 && patched?.template === "Hola {{nombre}}, ¿te llamamos hoy?" && patched?.isActive === false,
      `PATCH propio → HTTP ${res.status}; cambia la plantilla y conserva el resto`
    );

    // 9. Borrar la regla propia
    res = await req(`/api/automations/${createdRule.id}`, { method: "DELETE", headers: auth(adminCookie) });
    const gone = !(await prisma.automationRule.findUnique({ where: { id: createdRule.id } }));
    record("AUT-11", res.status === 200 && gone, `DELETE propio → HTTP ${res.status}, eliminada: ${gone}`);
  } catch (err) {
    console.error("Error fatal:", err);
    record("FATAL", false, err.message);
  } finally {
    if (created.rules.length) await prisma.automationRule.deleteMany({ where: { id: { in: created.rules } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: `${STAMP}@test.bunker` } } });
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    for (const u of list?.users || []) {
      if (u.email?.endsWith(`${STAMP}@test.bunker`)) await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
    if (created.clients.length) await prisma.client.deleteMany({ where: { id: { in: created.clients } } });
    // La organización de prueba se lleva por cascada su cliente y su regla.
    if (created.orgs.length) await prisma.organization.deleteMany({ where: { id: { in: created.orgs } } });

    const passed = results.filter((r) => r.pass).length;
    console.log(`\nRESUMEN: ${passed} / ${results.length} PASADAS\n`);
    await prisma.$disconnect();
    process.exit(passed === results.length ? 0 : 1);
  }
}

run();
