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
  // 1. Check Andres Toledo in database
  const lead = await prisma.lead.findFirst({
    where: { externalLeadId: "29732131886390228" },
    select: { id: true, name: true, externalLeadId: true, avatarUrl: true },
  });
  console.log("Lead in DB:", lead);

  // 2. Check Page token
  const page = await prisma.connectedAccount.findFirst({
    where: { externalId: "808679539201763" },
    select: { id: true, externalId: true, accessTokenEnc: true },
  });

  const pageToken = decryptSecret(page.accessTokenEnc);

  // 3. Query PSID 29732131886390228 directly on Graph API
  const psid = "29732131886390228";
  console.log(`Querying Meta Graph API for PSID ${psid}...`);

  // Try various field combinations
  const res1 = await fetch(`https://graph.facebook.com/v21.0/${psid}?fields=first_name,last_name,profile_pic&access_token=${pageToken}`);
  console.log("Field first_name,last_name,profile_pic response:", await res1.json());

  const res2 = await fetch(`https://graph.facebook.com/v21.0/${psid}?fields=name,profile_pic&access_token=${pageToken}`);
  console.log("Field name,profile_pic response:", await res2.json());

  const res3 = await fetch(`https://graph.facebook.com/v21.0/${psid}?fields=picture&access_token=${pageToken}`);
  console.log("Field picture response:", await res3.json());

  // Also test other leads from the screenshot: Yocelyn Diaz, Jose Muniz
  const otherLeads = await prisma.lead.findMany({
    where: {
      name: { in: ["Yocelyn Diaz", "José Muniz", "Karla Lara"] },
    },
    select: { id: true, name: true, externalLeadId: true, avatarUrl: true },
  });
  console.log("Other leads in DB:", otherLeads);

  for (const l of otherLeads) {
    if (l.externalLeadId) {
      const r = await fetch(`https://graph.facebook.com/v21.0/${l.externalLeadId}?fields=first_name,last_name,profile_pic&access_token=${pageToken}`);
      console.log(`Profile for ${l.name} (${l.externalLeadId}):`, await r.json());
    }
  }

  await prisma.$disconnect();
}

run().catch(console.error);
