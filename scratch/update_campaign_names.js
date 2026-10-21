const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCampaigns() {
  const updated = await prisma.lead.updateMany({
    where: {
      externalFormId: "1230453512591237",
      campaign: null
    },
    data: {
      campaign: "Buyer - Just Listed - Boulder"
    }
  });
  console.log("Updated leads count:", updated.count);
}

updateCampaigns().catch(console.error).finally(() => prisma.$disconnect());
