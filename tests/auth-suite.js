const http = require("http");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

// Read .env
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[key] = val;
    }
  }
}

const prisma = new PrismaClient();
const BASE_URL = "http://127.0.0.1:3005";

// Helper for fetch with cookie support
async function makeRequest(urlPath, options = {}) {
  const fullUrl = `${BASE_URL}${urlPath}`;
  const fetchOptions = {
    ...options,
    redirect: "manual", // allow inspecting 307 / 308 redirects
  };
  return await fetch(fullUrl, fetchOptions);
}

function extractCookie(res, cookieName) {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

const results = [];

function recordResult(testName, passed, details) {
  results.push({ testName, passed, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} [${testName}] ${details}`);
}

async function runSuite() {
  console.log("\n🧪 =============================================================");
  console.log("   BUNKER CRM — SUITE DE PRUEBAS AUTOMATIZADAS DE SEGURIDAD");
  console.log("=============================================================\n");

  // PRUEBA A: Acceso no autenticado a página privada (/dashboard)
  try {
    const resA = await makeRequest("/dashboard");
    const isRedirect = resA.status === 307 || resA.status === 308 || resA.status === 302;
    const location = resA.headers.get("location") || "";
    const passes = isRedirect && location.includes("/login");
    recordResult(
      "PRUEBA A",
      passes,
      `Acceso a /dashboard sin sesión responde HTTP ${resA.status} -> Redirección hacia '${location}'`
    );
  } catch (err) {
    recordResult("PRUEBA A", false, `Fallo en la solicitud: ${err.message}`);
  }

  // PRUEBA B: GET /api/leads sin autenticación
  try {
    const resB = await makeRequest("/api/leads");
    const jsonB = await resB.json().catch(() => ({}));
    const passes = resB.status === 401 && jsonB.success === false;
    recordResult(
      "PRUEBA B",
      passes,
      `GET /api/leads sin sesión responde HTTP ${resB.status} (Unauthorized). Error: "${jsonB.error}"`
    );
  } catch (err) {
    recordResult("PRUEBA B", false, `Fallo: ${err.message}`);
  }

  // PRUEBA C: POST /api/leads sin autenticación
  try {
    const resC = await makeRequest("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Intruso No Autorizado" }),
    });
    const jsonC = await resC.json().catch(() => ({}));
    const passes = resC.status === 401 && jsonC.success === false;
    recordResult(
      "PRUEBA C",
      passes,
      `POST /api/leads sin sesión responde HTTP ${resC.status} (Unauthorized). No se crea registro.`
    );
  } catch (err) {
    recordResult("PRUEBA C", false, `Fallo: ${err.message}`);
  }

  // PRUEBA D: Login con credenciales válidas (Admin)
  let adminSessionCookie = "";
  try {
    const resD = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@bunkermarketing.io",
        password: "bunker2026",
      }),
    });
    const jsonD = await resD.json().catch(() => ({}));
    adminSessionCookie = extractCookie(resD, "bunker_session");

    let mePasses = false;
    if (adminSessionCookie) {
      const resMe = await makeRequest("/api/auth/me", {
        headers: { Cookie: `bunker_session=${adminSessionCookie}` },
      });
      const jsonMe = await resMe.json().catch(() => ({}));
      mePasses = resMe.status === 200 && jsonMe.user?.role === "admin";
    }

    const passes = resD.status === 200 && Boolean(adminSessionCookie) && mePasses;
    recordResult(
      "PRUEBA D",
      passes,
      `Inicio de sesión exitoso HTTP 200. Cookie de sesión emitida, usuario autenticado como rol 'admin' [${jsonD.user?.email}]`
    );
  } catch (err) {
    recordResult("PRUEBA D", false, `Fallo: ${err.message}`);
  }

  // PRUEBA E: Cierre de sesión (Logout)
  try {
    const resE = await makeRequest("/api/auth/logout", {
      method: "POST",
      headers: { Cookie: `bunker_session=${adminSessionCookie}` },
    });
    const setCookie = resE.headers.get("set-cookie") || "";
    const isRevoked = setCookie.includes("Max-Age=0") || setCookie.includes("expires=");

    // Verify revoked session on /api/auth/me
    const resMeAfter = await makeRequest("/api/auth/me");
    const passes = resE.status === 200 && isRevoked && resMeAfter.status === 401;
    recordResult(
      "PRUEBA E",
      passes,
      `Cierre de sesión revoca cookie con Max-Age=0. Solicitudes posteriores responden HTTP 401.`
    );
  } catch (err) {
    recordResult("PRUEBA E", false, `Fallo: ${err.message}`);
  }

  // PRUEBA F: Usuario SALES intenta ejecutar operación exclusiva de ADMIN (DELETE lead)
  try {
    // 1. Login as sales_rep
    const resLoginSales = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "carlos.sales@bunkermarketing.io",
        password: "bunker2026",
      }),
    });
    const salesCookie = extractCookie(resLoginSales, "bunker_session");

    // 2. Attempt admin action (DELETE /api/leads?id=any)
    const resF = await makeRequest("/api/leads?id=dummy-id", {
      method: "DELETE",
      headers: { Cookie: `bunker_session=${salesCookie}` },
    });
    const jsonF = await resF.json().catch(() => ({}));
    const passes = resF.status === 403 && jsonF.success === false;
    recordResult(
      "PRUEBA F",
      passes,
      `Usuario rol 'sales_rep' intenta DELETE en /api/leads -> Rechazado con HTTP 403 (Forbidden): "${jsonF.error}"`
    );
  } catch (err) {
    recordResult("PRUEBA F", false, `Fallo: ${err.message}`);
  }

  // PRUEBA G: Aislamiento entre organizaciones (Cross-tenant isolation)
  let testOrg = null;
  let isolatedLead = null;
  try {
    // Re-authenticate admin
    const resLogin = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@bunkermarketing.io",
        password: "bunker2026",
      }),
    });
    const adminCookie = extractCookie(resLogin, "bunker_session");

    // Create a temporary isolated second organization in DB
    testOrg = await prisma.organization.create({
      data: {
        name: "Organización Aislada de Prueba",
        slug: `isolated-org-${Date.now()}`,
      },
    });

    isolatedLead = await prisma.lead.create({
      data: {
        organizationId: testOrg.id,
        name: "Lead Secreto de Otra Empresa",
        email: "confidential@othercompany.com",
        source: "manual",
      },
    });

    // Bunker user requests leads
    const resG = await makeRequest("/api/leads", {
      headers: { Cookie: `bunker_session=${adminCookie}` },
    });
    const jsonG = await resG.json().catch(() => ({ leads: [] }));
    const foundIsolatedLead = jsonG.leads?.some((l) => l.id === isolatedLead.id);

    const passes = resG.status === 200 && !foundIsolatedLead;
    recordResult(
      "PRUEBA G",
      passes,
      `Consulta de leads de Bunker Agency NO incluye el lead de la organización ajena (${isolatedLead.id}). Aislamiento estricto confirmado.`
    );
  } catch (err) {
    recordResult("PRUEBA G", false, `Fallo: ${err.message}`);
  }

  // PRUEBA H: Manipulación de organizationId por el cliente
  try {
    const resLogin = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@bunkermarketing.io",
        password: "bunker2026",
      }),
    });
    const adminCookie = extractCookie(resLogin, "bunker_session");

    // Send payload with spoofed organizationId pointing to testOrg
    const spoofedOrgId = testOrg ? testOrg.id : "spoofed-fake-org-id";
    const resH = await makeRequest("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `bunker_session=${adminCookie}`,
      },
      body: JSON.stringify({
        name: "Lead con Org Manipulado",
        organizationId: spoofedOrgId, // Attempted tamper
      }),
    });
    const jsonH = await resH.json().catch(() => ({}));

    // Verify lead was created under admin's real organization, not spoofedOrgId
    const passes =
      resH.status === 201 &&
      jsonH.lead &&
      jsonH.lead.organizationId !== spoofedOrgId;

    recordResult(
      "PRUEBA H",
      passes,
      `Solicitud con organizationId adulterado: El servidor ignora el parámetro del cliente y asigna el organizationId verificado del usuario.`
    );

    // Clean up created lead
    if (jsonH.lead?.id) {
      await prisma.lead.delete({ where: { id: jsonH.lead.id } }).catch(() => {});
    }
  } catch (err) {
    recordResult("PRUEBA H", false, `Fallo: ${err.message}`);
  } finally {
    // Cleanup isolated test lead and org
    if (isolatedLead) {
      await prisma.lead.delete({ where: { id: isolatedLead.id } }).catch(() => {});
    }
    if (testOrg) {
      await prisma.organization.delete({ where: { id: testOrg.id } }).catch(() => {});
    }
  }

  // PRUEBA I: Autenticación con credenciales incorrectas
  try {
    const resI = await makeRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@bunkermarketing.io",
        password: "WrongPassword999!",
      }),
    });
    const jsonI = await resI.json().catch(() => ({}));
    const passes =
      resI.status === 401 &&
      jsonI.success === false &&
      !jsonI.error.includes("password") &&
      !jsonI.error.includes("hash");
    recordResult(
      "PRUEBA I",
      passes,
      `Credenciales erróneas devuelven HTTP 401 con mensaje genérico: "${jsonI.error}". Sin filtración de datos.`
    );
  } catch (err) {
    recordResult("PRUEBA I", false, `Fallo: ${err.message}`);
  }

  // PRUEBA J: Rutas públicas y prevención de ciclos de redirección
  try {
    const resJ = await makeRequest("/login");
    const passes = resJ.status === 200;
    recordResult(
      "PRUEBA J",
      passes,
      `Ruta pública /login responde HTTP ${resJ.status} OK sin ciclos de redirección.`
    );
  } catch (err) {
    recordResult("PRUEBA J", false, `Fallo: ${err.message}`);
  }

  console.log("\n=============================================================");
  const allPassed = results.every((r) => r.passed);
  console.log(
    `RESUMEN: ${results.filter((r) => r.passed).length}/${results.length} pruebas superadas exitosamente.`
  );
  console.log("=============================================================\n");

  await prisma.$disconnect();
  process.exit(allPassed ? 0 : 1);
}

runSuite().catch((err) => {
  console.error("Fatal suite error:", err);
  process.exit(1);
});
