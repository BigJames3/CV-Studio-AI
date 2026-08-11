/**
 * Prisma seed — official templates + subscription plans
 * Run: pnpm db:seed
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { TEMPLATE_SEEDS } from '../src/modules/templates/template-seeds';

const prisma = new PrismaClient();

const PLAN_SEEDS = [
  {
    name: 'Free',
    description: '1 CV, 5 templates, PDF export, no AI',
    priceMonthly: 0,
    priceYearly: 0,
    cvLimit: 1,
    aiFeatures: false,
    prioritySupport: false,
    customDomain: false,
    marketplaceAccess: false,
    apiAccess: false,
  },
  {
    name: 'Pro',
    description: 'Unlimited CVs, 50+ templates, all AI features, ATS, portfolio',
    priceMonthly: 9.99,
    priceYearly: 99,
    cvLimit: 999999,
    aiFeatures: true,
    prioritySupport: true,
    customDomain: false,
    marketplaceAccess: true,
    apiAccess: false,
  },
  {
    name: 'Business',
    description: 'Everything in Pro + team collab, analytics, API, branding',
    priceMonthly: 29.99,
    priceYearly: 299,
    cvLimit: 999999,
    aiFeatures: true,
    prioritySupport: true,
    customDomain: true,
    marketplaceAccess: true,
    apiAccess: true,
  },
] as const;

async function main() {
  for (const seed of TEMPLATE_SEEDS) {
    await prisma.template.upsert({
      where: { id: seed.id },
      create: {
        id: seed.id,
        name: seed.name,
        description: seed.description,
        category: seed.category,
        previewImageUrl: seed.previewImageUrl,
        isPremium: seed.isPremium,
        price: seed.price ?? undefined,
        designData: seed.designData as Prisma.InputJsonValue,
        isPublished: true,
        downloadCount: seed.downloadCount,
        rating: seed.rating,
      },
      update: {
        name: seed.name,
        description: seed.description,
        designData: seed.designData as Prisma.InputJsonValue,
        isPublished: true,
        previewImageUrl: seed.previewImageUrl,
      },
    });
  }
  console.warn(`Seeded ${TEMPLATE_SEEDS.length} templates`);

  for (const plan of PLAN_SEEDS) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      create: { ...plan },
      update: {
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        cvLimit: plan.cvLimit,
        aiFeatures: plan.aiFeatures,
        prioritySupport: plan.prioritySupport,
        customDomain: plan.customDomain,
        marketplaceAccess: plan.marketplaceAccess,
        apiAccess: plan.apiAccess,
        isActive: true,
      },
    });
  }
  console.warn(`Seeded ${PLAN_SEEDS.length} plans`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
