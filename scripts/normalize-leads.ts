import { PrismaClient } from "@prisma/client";
import { migrationPatch } from "../lib/lead-filters";

const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    select: {
      id: true,
      requirement: true,
      location: true,
      locations: true,
      budget: true,
      budgetMin: true,
      budgetMax: true,
      intent: true,
      category: true,
      propertyType: true,
      propertyTypes: true,
      bhk: true,
      bhks: true,
      constructionStatus: true,
      plotSize: true,
      plotSizeMin: true,
      plotSizeMax: true,
      plotSizeUnit: true,
    },
  });

  let updated = 0;
  for (const lead of leads) {
    const data = migrationPatch(lead);
    if (!data) continue;
    await prisma.lead.update({ where: { id: lead.id }, data });
    updated += 1;
  }

  console.log(`Normalized ${updated} of ${leads.length} leads.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
