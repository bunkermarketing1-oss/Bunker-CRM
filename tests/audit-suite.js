// tests/audit-suite.js
// Fase de auditoría: sondas de seguridad/coherencia. PASS = comportamiento seguro.
// - No imprime contraseñas, tokens ni variables de entorno.
// - Crea una organización temporal y elimina únicamente los registros que ella misma crea.
// Uso: BASE_URL=http://127.0.0.1:3005 node tests/audit-suite.js
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
const ts = require("typescript");

// Loads a TypeScript source file (pure functions only) so it can be unit-tested without a bundler.
function loadTs(file) {
  const src = fs.readFileSync(file, "utf8");
  const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", out)(mod, mod.exports, require);
  return mod.exports;
}
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3005";
const ADMIN_EMAIL = process.env.AUDIT_EMAIL || "admin@bunkermarketing.io";
const ADMIN_PASSWORD = process.env.AUDIT_PASSWORD || "bunker2026";

const results = [];
function record(id, pass, msg) {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"} [${id}] ${msg}`);
}

async function req(p, opts = {}) {
  return fetch(`${BASE_URL}${p}`, { redirect: "manual", ...opts });
}
function cookieOf(res, name) {
  const sc = res.headers.get("set-cookie") || "";
  const m = sc.match(new RegExp(`${name}=([^;]*)`));
  return m ? m[1] : null;
}
const jh = (cookie) => ({ "Content-Type": "application/json", ...(cookie ? { Cookie: `bunker_session=${cookie}` } : {}) });

const STAMP = Date.now();
const created = { leads: [], clients: [], opps: [], contacts: [] };
let tmpOrg = null;

async function main() {
  console.log(`\n== AUDIT SUITE == target: ${BASE_URL}\n`);

  // ---------- CSV formula injection (pure unit tests, no server needed) ----------
  const { csvCell, buildCsv } = loadTs(path.join(__dirname, "../src/lib/csv.ts"));
  const injected = [`=HYPERLINK("http://evil","x")`, `+cmd|' /C calc'!A0`, `@SUM(1+1)`, `-2+3`, `\t=1+1`];
  record("CSV-INJECT", injected.every((v) => csvCell(v).startsWith(`"'`)), "Celdas que empiezan con = + - @ TAB se neutralizan con comilla simple");
  record("CSV-QUOTES", csvCell('Dijo "hola"') === '"Dijo ""hola"""', "Las comillas dobles se escapan correctamente");
  record("CSV-PHONE", csvCell("+52 55 1234 5678") === '"+52 55 1234 5678"', "Un teléfono internacional legítimo no se altera");
  record("CSV-HASH", buildCsv(["a"], [["Torre #5"]]).includes("Torre #5"), "El texto con # se conserva (el CSV ya no se genera con data: URI)");

  // ---------- Login & cookie attributes ----------
  const login = await req("/api/auth/login", { method: "POST", headers: jh(), body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
  const token = cookieOf(login, "bunker_session");
  if (!token) { console.error("No se pudo autenticar; abortando."); process.exit(1); }
  const setCookie = (login.headers.get("set-cookie") || "").toLowerCase();
  record("COOKIE-01", setCookie.includes("httponly"), "Cookie de sesión con HttpOnly");
  record("COOKIE-02", setCookie.includes("samesite=lax") || setCookie.includes("samesite=strict"), "Cookie con SameSite");
  const maxAge = parseInt((setCookie.match(/max-age=(\d+)/) || [])[1] || "0", 10);
  let jwtTtl = 0;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    jwtTtl = payload.exp - payload.iat;
  } catch {}
  record("COOKIE-03", maxAge > 0 && jwtTtl > 0 && maxAge <= jwtTtl, `Max-Age de la cookie (${maxAge}s) no excede la vida del token (${jwtTtl}s)`);

  // ---------- Unauthenticated sweep over every API handler ----------
  const sweep = [
    ["GET", "/api/leads"], ["POST", "/api/leads"], ["PUT", "/api/leads"], ["DELETE", "/api/leads?id=x"],
    ["GET", "/api/leads/check-duplicate?email=a@b.co"], ["POST", "/api/leads/00000000-0000-0000-0000-000000000000/convert"],
    ["GET", "/api/clients"], ["POST", "/api/clients"], ["PUT", "/api/clients"], ["DELETE", "/api/clients?id=x"],
    ["GET", "/api/clients/00000000-0000-0000-0000-000000000000"], ["PUT", "/api/clients/00000000-0000-0000-0000-000000000000"], ["DELETE", "/api/clients/00000000-0000-0000-0000-000000000000"],
    ["GET", "/api/contacts"], ["POST", "/api/contacts"], ["PUT", "/api/contacts"], ["DELETE", "/api/contacts?id=x"],
    ["GET", "/api/pipeline"], ["POST", "/api/pipeline"], ["PUT", "/api/pipeline"], ["DELETE", "/api/pipeline?id=x"],
    ["GET", "/api/dashboard"], ["GET", "/api/users"], ["GET", "/api/activities"], ["POST", "/api/activities"],
    ["GET", "/api/tasks"], ["POST", "/api/tasks"], ["PUT", "/api/tasks"], ["DELETE", "/api/tasks?id=x"],
    ["GET", "/api/posts"], ["POST", "/api/posts"], ["PUT", "/api/posts"], ["DELETE", "/api/posts?id=x"],
    ["GET", "/api/integrations"], ["POST", "/api/integrations/sync"],
    ["GET", "/api/messages/sms"], ["POST", "/api/messages/sms"],
    ["POST", "/api/ai"], ["GET", "/api/marketing/ai-optimizer"], ["POST", "/api/marketing/ai-optimizer"],
  ];
  const leaky = [];
  for (const [m, u] of sweep) {
    const r = await req(u, { method: m, headers: jh(), body: m === "GET" || m === "DELETE" ? undefined : "{}" });
    if (r.status !== 401) leaky.push(`${m} ${u} -> ${r.status}`);
  }
  record("AUTH-SWEEP", leaky.length === 0, leaky.length ? `Rutas sin 401: ${leaky.join(", ")}` : `${sweep.length} handlers rechazan solicitudes sin sesión (401)`);

  // ---------- Login brute force throttling (non-existent account) ----------
  const statuses = [];
  for (let i = 0; i < 8; i++) {
    const r = await req("/api/auth/login", { method: "POST", headers: jh(), body: JSON.stringify({ email: "audit.nonexistent@invalid.test", password: "x".repeat(10) + i }) });
    statuses.push(r.status);
  }
  record("AUTH-RATE", statuses.includes(429), `Limitación de intentos de login tras 8 fallos (estados: ${[...new Set(statuses)].join(",")})`);

  // ---------- Server-side session revocation ----------
  const lg2 = await req("/api/auth/login", { method: "POST", headers: jh(), body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }) });
  const tok2 = cookieOf(lg2, "bunker_session");
  await req("/api/auth/logout", { method: "POST", headers: jh(tok2) });
  const reuse = await req("/api/auth/me", { headers: { Authorization: `Bearer ${tok2}` } });
  record("LOGOUT-REVOKE", reuse.status === 401, `Token reutilizado tras logout responde HTTP ${reuse.status} (esperado 401)`);

  // ---------- Temp foreign org ----------
  const stamp = STAMP;
  tmpOrg = await prisma.organization.create({ data: { name: `AUDIT TMP ${stamp}`, slug: `audit-tmp-${stamp}` } });
  const foreignStage = await prisma.pipelineStage.create({ data: { organizationId: tmpOrg.id, name: "Foreign Stage", order: 0 } });
  const foreignClient = await prisma.client.create({ data: { organizationId: tmpOrg.id, name: "Foreign Client" } });
  const foreignLead = await prisma.lead.create({ data: { organizationId: tmpOrg.id, name: "Foreign Lead", email: `foreign.${stamp}@audit.test`, normalizedPhone: "+15555550123", phone: "+15555550123" } });
  const foreignUser = await prisma.user.create({ data: { email: `audit.foreign.${stamp}@audit.test`, name: "Audit Foreign", passwordHash: "managed_by_supabase_auth" } });
  await prisma.organizationMember.create({ data: { organizationId: tmpOrg.id, userId: foreignUser.id } });

  // ---------- Duplicate isolation ----------
  const dup = await (await req(`/api/leads/check-duplicate?email=${encodeURIComponent(foreignLead.email)}`, { headers: jh(token) })).json();
  record("DUP-ISO", dup.success && dup.hasDuplicates === false, "check-duplicate no revela leads de otra organización");

  // ---------- Lead owner from foreign org ----------
  const ownerPost = await req("/api/leads", { method: "POST", headers: jh(token), body: JSON.stringify({ name: `Audit Owner ${STAMP}`, ownerId: foreignUser.id }) });
  const ownerPostJson = await ownerPost.json();
  if (ownerPostJson.lead) created.leads.push(ownerPostJson.lead.id);
  record("LEAD-OWNER-ISO", ownerPost.status === 400, `POST lead con ownerId de otra org -> HTTP ${ownerPost.status} (esperado 400)`);

  // ---------- Partial update must not wipe fields ----------
  const base = await (await req("/api/leads", { method: "POST", headers: jh(token), body: JSON.stringify({ name: `Audit Partial ${STAMP}`, companyName: "ACME Audit", email: `partial.${stamp}@audit.test`, notes: "nota original", estimatedValue: 100 }) })).json();
  if (base.lead) created.leads.push(base.lead.id);
  await req("/api/leads", { method: "PUT", headers: jh(token), body: JSON.stringify({ id: base.lead.id, name: `Audit Partial ${STAMP} B` }) });
  const after = (await (await req(`/api/leads?search=${encodeURIComponent(`Audit Partial ${STAMP} B`)}`, { headers: jh(token) })).json()).leads?.[0];
  record("LEAD-PARTIAL", !!after && after.email === `partial.${stamp}@audit.test` && after.companyName === "ACME Audit" && after.notes === "nota original", after ? `PUT parcial {id,name} conserva email/empresa/notas (email=${after.email ? "conservado" : "NULL"}, empresa=${after.companyName ? "conservada" : "NULL"}, notas=${after.notes ? "conservadas" : "NULL"})` : "lead no encontrado");

  // ---------- Budget validation (USD) ----------
  const negBudget = await req("/api/leads", { method: "POST", headers: jh(token), body: JSON.stringify({ name: `Audit Budget ${STAMP}`, estimatedValue: -5 }) });
  const negJ = await negBudget.json().catch(() => ({}));
  if (negJ.lead) created.leads.push(negJ.lead.id);
  const txtBudget = await req("/api/leads", { method: "POST", headers: jh(token), body: JSON.stringify({ name: `Audit Budget2 ${STAMP}`, estimatedValue: "abc" }) });
  const txtJ = await txtBudget.json().catch(() => ({}));
  if (txtJ.lead) created.leads.push(txtJ.lead.id);
  record("BUDGET-VALID", negBudget.status === 400 && txtBudget.status === 400, `Presupuesto negativo -> HTTP ${negBudget.status}, no numérico -> HTTP ${txtBudget.status} (esperado 400 y 400)`);

  // ---------- Manual 'converted' status must be rejected ----------
  const manualConv = await req("/api/leads", { method: "PUT", headers: jh(token), body: JSON.stringify({ id: base.lead.id, status: "converted" }) });
  record("LEAD-MANUAL-CONVERT", manualConv.status === 400, `PUT con status 'converted' sin conversión -> HTTP ${manualConv.status} (esperado 400)`);

  // ---------- Audit trail for relevant changes ----------
  await req("/api/leads", { method: "PUT", headers: jh(token), body: JSON.stringify({ id: base.lead.id, status: "qualified", estimatedValue: 250 }) });
  const trail = await prisma.auditLog.findFirst({
    where: { entityId: base.lead.id, action: "lead_updated" },
    orderBy: { createdAt: "desc" },
  });
  record("AUDIT-TRAIL", !!trail && String(trail.detailsJson).includes("qualified"), "Cambio de estado/presupuesto registrado en auditoría (lead_updated)");

  // ---------- Pipeline cross-org references ----------
  const ownStage = await prisma.pipelineStage.findFirst({ where: { organization: { slug: "bunker-agency" } }, orderBy: { order: "asc" } });
  const pOpp = await req("/api/pipeline", { method: "POST", headers: jh(token), body: JSON.stringify({ title: `Audit Opp ${STAMP}`, stageId: ownStage.id, value: 1, clientId: foreignClient.id }) });
  const pOppJson = await pOpp.json();
  if (pOppJson.opportunity) created.opps.push(pOppJson.opportunity.id);
  record("PIPE-POST-CLIENT", pOpp.status === 400 || pOpp.status === 404, `POST pipeline con clientId de otra org -> HTTP ${pOpp.status} (esperado 400/404)`);

  const pOpp2 = await (await req("/api/pipeline", { method: "POST", headers: jh(token), body: JSON.stringify({ title: `Audit Opp ${STAMP} 2`, stageId: ownStage.id, value: 1 }) })).json();
  if (pOpp2.opportunity) created.opps.push(pOpp2.opportunity.id);
  const mv = await req("/api/pipeline", { method: "PUT", headers: jh(token), body: JSON.stringify({ id: pOpp2.opportunity.id, stageId: foreignStage.id }) });
  record("PIPE-PUT-STAGE", mv.status === 400 || mv.status === 404, `PUT pipeline moviendo a etapa de otra org -> HTTP ${mv.status} (esperado 400/404)`);

  const badStatus = await req("/api/pipeline", { method: "PUT", headers: jh(token), body: JSON.stringify({ id: pOpp2.opportunity.id, status: "hacked" }) });
  record("PIPE-PUT-STATUS", badStatus.status === 400, `PUT pipeline con status inválido -> HTTP ${badStatus.status} (esperado 400)`);

  const nan = await req("/api/pipeline", { method: "POST", headers: jh(token), body: JSON.stringify({ title: `Audit NaN ${STAMP}`, stageId: ownStage.id, value: "abc" }) });
  const nanJ = await nan.json().catch(() => ({}));
  if (nanJ.opportunity) created.opps.push(nanJ.opportunity.id);
  record("PIPE-VALUE", nan.status === 400, `POST pipeline con valor no numérico -> HTTP ${nan.status} (esperado 400)`);

  // ---------- Clients owner ----------
  const cOwner = await req("/api/clients", { method: "POST", headers: jh(token), body: JSON.stringify({ name: `Audit Client ${STAMP}`, ownerId: foreignUser.id }) });
  const cOwnerJ = await cOwner.json().catch(() => ({}));
  if (cOwnerJ.client) created.clients.push(cOwnerJ.client.id);
  record("CLIENT-OWNER-ISO", cOwner.status === 400, `POST clients con ownerId de otra org -> HTTP ${cOwner.status} (esperado 400)`);

  // ---------- Contacts cross-org isolation ----------
  const cContact = await req("/api/contacts", { method: "POST", headers: jh(token), body: JSON.stringify({ clientId: foreignClient.id, firstName: "Audit Contact" }) });
  const cContactJ = await cContact.json().catch(() => ({}));
  if (cContactJ.contact) created.contacts.push(cContactJ.contact.id);
  record("CONTACT-CLIENT-ISO", cContact.status === 404, `POST contact con clientId de otra org -> HTTP ${cContact.status} (esperado 404)`);

  // ---------- Convert: foreign stage, idempotency, atomicity ----------
  const convLead = await (await req("/api/leads", { method: "POST", headers: jh(token), body: JSON.stringify({ name: `Audit Convert ${STAMP}`, email: `convert.${stamp}@audit.test`, estimatedValue: 100 }) })).json();
  created.leads.push(convLead.lead.id);
  const cvBad = await req(`/api/leads/${convLead.lead.id}/convert`, { method: "POST", headers: jh(token), body: JSON.stringify({ stageId: foreignStage.id }) });
  const cvBadJ = await cvBad.json().catch(() => ({}));
  if (cvBadJ.client) { created.clients.push(cvBadJ.client.id); }
  if (cvBadJ.opportunity) created.opps.push(cvBadJ.opportunity.id);
  record("CONVERT-STAGE-ISO", cvBad.status === 400 || cvBad.status === 404, `Convert con stageId de otra org -> HTTP ${cvBad.status} (esperado 400/404)`);
  const stillNew = await prisma.lead.findUnique({ where: { id: convLead.lead.id } });
  const orphanClientsAfterReject = await prisma.client.count({ where: { organizationId: { not: tmpOrg.id }, notes: { contains: `Audit Convert ${STAMP}` } } });
  record("CONVERT-ATOMIC", stillNew.status !== "converted" && orphanClientsAfterReject === 0, `Convert rechazado no deja registros parciales (lead=${stillNew.status}, clientes huérfanos=${orphanClientsAfterReject})`);

  const cv1 = await (await req(`/api/leads/${convLead.lead.id}/convert`, { method: "POST", headers: jh(token), body: "{}" })).json();
  if (cv1.client) created.clients.push(cv1.client.id);
  if (cv1.opportunity) created.opps.push(cv1.opportunity.id);
  const cv2 = await req(`/api/leads/${convLead.lead.id}/convert`, { method: "POST", headers: jh(token), body: "{}" });
  const cv2J = await cv2.json().catch(() => ({}));
  if (cv2J.client) created.clients.push(cv2J.client.id);
  if (cv2J.opportunity) created.opps.push(cv2J.opportunity.id);
  const clientsForLead = await prisma.client.count({ where: { notes: { contains: `Audit Convert ${STAMP}` }, isDeleted: false } });
  record("CONVERT-IDEMP", cv2.status === 409 && clientsForLead === 1, `Convertir dos veces -> HTTP ${cv2.status} (esperado 409) y clientes creados=${clientsForLead} (esperado 1)`);

  // ---------- Scoring thresholds in USD ----------
  const sc = await (await req("/api/leads", { method: "POST", headers: jh(token), body: JSON.stringify({ name: `Audit Score ${STAMP}`, email: `score.${stamp}@audit.test`, phone: "+14155552671", companyName: "Score Co", estimatedValue: 3000 }) })).json();
  if (sc.lead) created.leads.push(sc.lead.id);
  record("USD-SCORE", sc.lead && sc.lead.qualification >= 95, `Lead con $3,000 USD recibe score de presupuesto alto (qualification=${sc.lead && sc.lead.qualification}, esperado >= 95)`);
}

(async () => {
  try {
    await main();
  } catch (e) {
    console.error("Error en suite:", e.message);
  } finally {
    // Cleanup: only what this run created
    try {
      if (created.contacts.length) await prisma.contact.deleteMany({ where: { id: { in: created.contacts } } });
      if (created.opps.length) await prisma.opportunity.deleteMany({ where: { id: { in: created.opps } } });
      const strayClients = await prisma.client.findMany({ where: { OR: [{ id: { in: created.clients } }, { notes: { contains: `Audit Convert ${STAMP}` } }, { name: { contains: String(STAMP) } }] }, select: { id: true } });
      const cids = strayClients.map((c) => c.id);
      if (cids.length) {
        await prisma.opportunity.deleteMany({ where: { clientId: { in: cids } } });
        await prisma.contact.deleteMany({ where: { clientId: { in: cids } } });
        await prisma.client.deleteMany({ where: { id: { in: cids } } });
      }
      const strayLeads = await prisma.lead.findMany({ where: { OR: [{ id: { in: created.leads } }, { name: { contains: String(STAMP) } }] }, select: { id: true } });
      if (strayLeads.length) await prisma.lead.deleteMany({ where: { id: { in: strayLeads.map((l) => l.id) } } });
      await prisma.auditLog.deleteMany({ where: { entityId: { in: [...created.leads, ...cids] } } });
      if (tmpOrg) {
        await prisma.user.deleteMany({ where: { email: { startsWith: "audit.foreign." } } });
        await prisma.organization.delete({ where: { id: tmpOrg.id } }).catch(() => {});
      }
    } catch (e) {
      console.error("Cleanup warning:", e.message);
    }
    await prisma.$disconnect();
    const failed = results.filter((r) => !r.pass);
    console.log(`\nRESUMEN: ${results.length - failed.length}/${results.length} PASS` + (failed.length ? ` | FAIL: ${failed.map((f) => f.id).join(", ")}` : ""));
    process.exit(failed.length ? 1 : 0);
  }
})();
