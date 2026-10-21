const { PrismaClient } = require("./node_modules/@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const audit = await prisma.auditLog.findMany({
    where: { entityType: "lead" },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("Lead audit logs:", audit);

  const metaEvents = await prisma.metaLeadEvent.findMany({
    take: 5,
    select: {
      id: true,
      pageId: true,
      formId: true,
      status: true,
      error: true,
      leadgenId: true,
      createdAt: true,
    },
  });
  console.log("Meta lead events:", metaEvents);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
