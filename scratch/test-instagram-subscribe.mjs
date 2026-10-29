import { PrismaClient } from "@prisma/client";
import { createDecipheriv, createHash } from "crypto";

const prisma = new PrismaClient();

function getKey() {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret) throw new Error("INTEGRATIONS_ENCRYPTION_KEY missing");
  return createHash("sha256").update(secret).digest();
}

function decryptSecret(payload) {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, "utf8") + decipher.final("utf8");
}

async function run() {
  const page = await prisma.connectedAccount.findFirst({
    where: { externalId: "808679539201763" },
    select: { externalId: true, accessTokenEnc: true },
  });

  const token = decryptSecret(page.accessTokenEnc);
  const pageId = page.externalId;
  const igId = "17841400353364903";

  console.log("=== PROBANDO SUSCRIPCIÓN DE INSTAGRAM ===");

  // 1. Check if Instagram account supports subscribed_apps
  console.log(`Intentando suscribir Instagram ${igId}...`);
  const igSub = await fetch(
    `https://graph.facebook.com/v21.0/${igId}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,message_reactions&access_token=${token}`,
    { method: "POST" }
  );
  console.log("Respuesta suscripción Instagram:", await igSub.json());

  // 2. Check if page has instagram permissions / subscribed fields
  console.log(`\nConsultando suscripciones de la página ${pageId}...`);
  const pageSub = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?access_token=${token}`
  );
  console.log("Página subscribed_apps:", await pageSub.json());

  // 3. Try to subscribe page to messaging fields (some Meta versions route Instagram through page subscribed_apps)
  console.log("\nActualizando subscribed_fields de la página...");
  const updatePageSub = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/subscribed_apps?subscribed_fields=leadgen,messages,messaging_postbacks,message_echoes&access_token=${token}`,
    { method: "POST" }
  );
  console.log("Respuesta update page subscribed_apps:", await updatePageSub.json());

  // 4. Test Graph API for Instagram direct conversations endpoint with different parameters
  console.log("\nProbando endpoints alternativos de Instagram:");
  // me/conversations on page token
  const test1 = await fetch(`https://graph.facebook.com/v21.0/${igId}/conversations?access_token=${token}`);
  console.log(`GET /${igId}/conversations:`, await test1.json());

  const test2 = await fetch(`https://graph.facebook.com/v21.0/${pageId}/conversations?platform=instagram&access_token=${token}`);
  console.log(`GET /${pageId}/conversations?platform=instagram:`, await test2.json());
}

run().catch(console.error).finally(() => prisma.$disconnect());
