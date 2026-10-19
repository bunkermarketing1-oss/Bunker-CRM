// tests/meta-leads-suite.js
// Webhook de leads de Meta: solo Meta (firma válida) puede crear eventos, los reintentos no
// duplican, y un lead de Meta asignado a un cliente no lo ve otro cliente.
// Uso: TEST_BASE_URL=http://127.0.0.1:3005 node tests/meta-leads-suite.js
// Requiere la migración 20261016120000_meta_leadgen aplicada, META_APP_SECRET y
// META_WEBHOOK_VERIFY_TOKEN en .env (los mismos que usa el servidor) y un servidor corriendo.
// No llama a Meta: las páginas de prueba no están conectadas, así que los eventos quedan `ignored`.

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
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
const APP_SECRET = process.env.META_APP_SECRET;
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const PASSWORD = "bunker2026";
const STAMP = Date.now();
const WEBHOOK = "/api/integrations/meta/webhook";

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass, msg });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

const req = (p, opts = {}) => fetch(`${BASE_URL}${p}`, { redirect: "manual", ...opts });
const auth = (cookie) => ({ "Content-Type": "application/json", Cookie: `bunker_session=${cookie}` });
const sign = (body, secret = APP_SECRET) => `sha256=${crypto.createHmac("sha256", secret).update(body).digest("hex")}`;

function leadgenPayload(leadgenId, pageId) {
  return JSON.stringify({
    object: "page",
    entry: [
      {
        id: pageId,
        time: Math.floor(Date.now() / 1000),
        changes: [{ field: "leadgen", value: { leadgen_id: leadgenId, page_id: pageId, form_id: `form_${STAMP}` } }],
      },
    ],
  });
}

const postWebhook = (body, signature) =>
  req(WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(signature ? { "X-Hub-Signature-256": signature } : {}) },
    body,
  });

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

async function run() {
  console.log("\n=== BUNKER CRM — SUITE: LEADS DE META (WEBHOOK) ===\n");
  if (!APP_SECRET || !VERIFY_TOKEN) {
    console.error("Faltan META_APP_SECRET o META_WEBHOOK_VERIFY_TOKEN en .env");
    process.exit(1);
  }

  const pageId = `page_test_${STAMP}`;
  const leadgenId = `leadgen_test_${STAMP}`;
  const created = { clients: [], leads: [] };

  try {
    // 1. Meta verifica la suscripción con el token correcto y recibe el challenge tal cual
    let res = await req(`${WEBHOOK}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(VERIFY_TOKEN)}&hub.challenge=ch_${STAMP}`);
    let text = await res.text();
    record("ML-01", res.status === 200 && text === `ch_${STAMP}`, `Verificación con token correcto → HTTP ${res.status}, challenge devuelto`);

    // 2. Un token de verificación ajeno no puede suscribir el webhook
    res = await req(`${WEBHOOK}?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`);
    record("ML-02", res.status === 403, `Verificación con token incorrecto → HTTP ${res.status} (esperado 403)`);

    const body = leadgenPayload(leadgenId, pageId);

    // 3. Sin firma nadie puede inyectar leads
    res = await postWebhook(body, null);
    record("ML-03", res.status === 401, `POST sin firma → HTTP ${res.status} (esperado 401)`);

    // 4. Firma hecha con otro secreto: rechazada
    res = await postWebhook(body, sign(body, "otro-secreto"));
    record("ML-04", res.status === 401, `POST con firma inválida → HTTP ${res.status} (esperado 401)`);
    let count = await prisma.metaLeadEvent.count({ where: { leadgenId } });
    record("ML-05", count === 0, `Las peticiones rechazadas no guardan eventos (${count})`);

    // 5. Firma válida, página no conectada: 200 para que Meta no desactive el webhook, evento ignorado
    res = await postWebhook(body, sign(body));
    let event = await prisma.metaLeadEvent.findUnique({ where: { leadgenId } });
    record(
      "ML-06",
      res.status === 200 && event?.status === "ignored",
      `POST firmado de página desconocida → HTTP ${res.status}, evento ${event?.status ?? "inexistente"} (esperado ignored)`
    );

    // 6. Meta reintenta el mismo leadgen_id: no se duplica
    res = await postWebhook(body, sign(body));
    count = await prisma.metaLeadEvent.count({ where: { leadgenId } });
    record("ML-07", res.status === 200 && count === 1, `Reintento del mismo leadgen_id → ${count} evento(s) (esperado 1)`);

    // 7. El cron de respaldo exige CRON_SECRET
    res = await req("/api/cron/sync-meta-leads", { method: "POST" });
    record("ML-08", res.status === 401, `Cron sin autorización → HTTP ${res.status} (esperado 401)`);

    // 8. Un lead de Meta asignado al cliente Alpha no lo ve el cliente Beta
    const org = await prisma.organization.findFirst({ where: { slug: "bunker-agency" } });
    if (!org) throw new Error("Organización bunker-agency no encontrada");
    const alpha = await prisma.client.create({ data: { organizationId: org.id, name: `Alpha Leads ${STAMP}`, status: "active" } });
    const beta = await prisma.client.create({ data: { organizationId: org.id, name: `Beta Leads ${STAMP}`, status: "active" } });
    created.clients.push(alpha.id, beta.id);

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        clientId: alpha.id,
        name: `Lead Meta ${STAMP}`,
        source: "meta_ads",
        externalLeadId: `meta_iso_${STAMP}`,
      },
    });
    created.leads.push(lead.id);

    await provisionClientUser(org, alpha, `alpha.metaleads.${STAMP}@test.bunker`);
    await provisionClientUser(org, beta, `beta.metaleads.${STAMP}@test.bunker`);
    const alphaCookie = await login(`alpha.metaleads.${STAMP}@test.bunker`, PASSWORD);
    const betaCookie = await login(`beta.metaleads.${STAMP}@test.bunker`, PASSWORD);

    const leadIds = async (cookie) => {
      const r = await req("/api/leads", { headers: auth(cookie) });
      const json = await r.json().catch(() => ({}));
      return (json.leads || []).map((l) => l.id);
    };
    record("ML-09", (await leadIds(alphaCookie)).includes(lead.id), "Alpha ve el lead de Meta de su página");
    record("ML-10", !(await leadIds(betaCookie)).includes(lead.id), "Beta no ve el lead de Meta de Alpha");

    // 9. El mismo externalLeadId no puede existir dos veces en la organización
    let duplicateRejected = false;
    try {
      const dup = await prisma.lead.create({
        data: { organizationId: org.id, name: `Dup ${STAMP}`, source: "meta_ads", externalLeadId: `meta_iso_${STAMP}` },
      });
      created.leads.push(dup.id);
    } catch {
      duplicateRejected = true;
    }
    record("ML-11", duplicateRejected, "La base rechaza un segundo lead con el mismo externalLeadId");
  } catch (err) {
    console.error("Error fatal:", err);
    record("FATAL", false, err.message);
  } finally {
    await prisma.metaLeadEvent.deleteMany({ where: { leadgenId } });
    if (created.leads.length) await prisma.lead.deleteMany({ where: { id: { in: created.leads } } });
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
