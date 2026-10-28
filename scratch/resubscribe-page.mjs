import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../src/lib/crypto.js";
import { subscribePageToLeadgen } from "../src/lib/integrations/meta.js";

const prisma = new PrismaClient();

async function run() {
  const page = await prisma.connectedAccount.findFirst({
    where: { externalId: "808679539201763" },
    select: { id: true, externalId: true, accessTokenEnc: true },
  });

  if (!page || !page.accessTokenEnc) {
    console.log("No page found");
    return;
  }

  const token = decryptSecret(page.accessTokenEnc);
  console.log("Subscribing page", page.externalId);
  const res = await subscribePageToLeadgen(page.externalId, token);
  console.log("Result:", res);
  await prisma.$disconnect();
}

run().catch(console.error);

