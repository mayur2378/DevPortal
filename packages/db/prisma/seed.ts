import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@devportal.dev";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: "Portal Admin", passwordHash, role: "SUPERADMIN" },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@devportal.dev" },
    update: {},
    create: { email: "owner@devportal.dev", name: "API Owner", passwordHash, role: "API_PRODUCT_OWNER" },
  });

  await prisma.user.upsert({
    where: { email: "consumer@devportal.dev" },
    update: {},
    create: { email: "consumer@devportal.dev", name: "API Consumer", passwordHash, role: "USER" },
  });

  await prisma.user.upsert({
    where: { email: "reviewer@devportal.dev" },
    update: {},
    create: { email: "reviewer@devportal.dev", name: "Governance Reviewer", passwordHash, role: "GOVERNANCE_REVIEWER" },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "healthcare-enterprise" },
    update: {},
    create: { name: "Healthcare Enterprise", slug: "healthcare-enterprise" },
  });

  const domains = await Promise.all([
    prisma.domain.upsert({ where: { name: "Customer" }, update: {}, create: { name: "Customer", description: "Customer management APIs" } }),
    prisma.domain.upsert({ where: { name: "Claims" }, update: {}, create: { name: "Claims", description: "Claims processing APIs" } }),
    prisma.domain.upsert({ where: { name: "Provider" }, update: {}, create: { name: "Provider", description: "Provider network APIs" } }),
    prisma.domain.upsert({ where: { name: "Events" }, update: {}, create: { name: "Events", description: "Event streaming APIs" } }),
  ]);

  await Promise.all([
    prisma.tag.upsert({ where: { name: "healthcare" }, update: {}, create: { name: "healthcare" } }),
    prisma.tag.upsert({ where: { name: "hipaa" }, update: {}, create: { name: "hipaa" } }),
    prisma.tag.upsert({ where: { name: "rest" }, update: {}, create: { name: "rest" } }),
    prisma.tag.upsert({ where: { name: "events" }, update: {}, create: { name: "events" } }),
    prisma.tag.upsert({ where: { name: "crm" }, update: {}, create: { name: "crm" } }),
  ]);

  const apiDefs = [
    { name: "Customer API", slug: "customer-api", type: "REST" as const, visibility: "PUBLIC" as const, lifecycleStatus: "ACTIVE" as const, dataClassification: "CONFIDENTIAL" as const, description: "Core customer data management and lookup.", businessCapability: "Customer Management", piiIndicator: true, maturityScore: 85, domainIdx: 0 },
    { name: "Claims API", slug: "claims-api", type: "REST" as const, visibility: "INTERNAL" as const, lifecycleStatus: "ACTIVE" as const, dataClassification: "RESTRICTED" as const, description: "Claims submission, adjudication, and status tracking.", businessCapability: "Claims Processing", phiIndicator: true, maturityScore: 92, domainIdx: 1 },
    { name: "Provider API", slug: "provider-api", type: "REST" as const, visibility: "PARTNER" as const, lifecycleStatus: "ACTIVE" as const, dataClassification: "INTERNAL" as const, description: "Provider directory, credentialing, and network status.", businessCapability: "Provider Management", maturityScore: 78, domainIdx: 2 },
    { name: "Member Eligibility API", slug: "member-eligibility-api", type: "REST" as const, visibility: "INTERNAL" as const, lifecycleStatus: "ACTIVE" as const, dataClassification: "RESTRICTED" as const, description: "Real-time member eligibility verification.", businessCapability: "Member Services", phiIndicator: true, piiIndicator: true, maturityScore: 88, domainIdx: 0 },
    { name: "Payment Events API", slug: "payment-events-api", type: "ASYNC_API" as const, visibility: "INTERNAL" as const, lifecycleStatus: "BETA" as const, dataClassification: "CONFIDENTIAL" as const, description: "Kafka-based payment event streaming.", businessCapability: "Payments", maturityScore: 60, domainIdx: 1 },
    { name: "Prior Authorization API", slug: "prior-auth-api", type: "REST" as const, visibility: "INTERNAL" as const, lifecycleStatus: "ACTIVE" as const, dataClassification: "RESTRICTED" as const, description: "Prior authorization submission and status.", businessCapability: "Utilization Management", phiIndicator: true, maturityScore: 81, domainIdx: 2 },
    { name: "Salesforce Lead API", slug: "salesforce-lead-api", type: "REST" as const, visibility: "INTERNAL" as const, lifecycleStatus: "ACTIVE" as const, dataClassification: "CONFIDENTIAL" as const, description: "CRM lead creation and management via Salesforce.", businessCapability: "Sales & Marketing", piiIndicator: true, maturityScore: 74, domainIdx: 0 },
    { name: "SAP Order API", slug: "sap-order-api", type: "REST" as const, visibility: "INTERNAL" as const, lifecycleStatus: "DEPRECATED" as const, dataClassification: "INTERNAL" as const, description: "SAP-backed order management (being replaced by cloud-native Order Service).", businessCapability: "Order Management", maturityScore: 45, domainIdx: 1 },
    { name: "Kafka Customer Events", slug: "kafka-customer-events", type: "EVENT" as const, visibility: "INTERNAL" as const, lifecycleStatus: "ACTIVE" as const, dataClassification: "CONFIDENTIAL" as const, description: "Kafka topic for customer lifecycle events.", businessCapability: "Customer Management", piiIndicator: true, maturityScore: 70, domainIdx: 3 },
    { name: "Webhook Notification API", slug: "webhook-notification-api", type: "WEBHOOK" as const, visibility: "PARTNER" as const, lifecycleStatus: "BETA" as const, dataClassification: "INTERNAL" as const, description: "Outbound webhook notifications for partner integrations.", businessCapability: "Notifications", maturityScore: 55, domainIdx: 3 },
  ];

  for (const def of apiDefs) {
    const { lifecycleStatus, maturityScore, domainIdx, piiIndicator, phiIndicator, dataClassification, ...rest } = def;
    const existing = await prisma.api.findFirst({ where: { orgId: org.id, slug: def.slug } });
    if (!existing) {
      const api = await prisma.api.create({
        data: { ...rest, orgId: org.id, ownerId: owner.id, piiIndicator: piiIndicator ?? false, phiIndicator: phiIndicator ?? false, dataClassification, domainId: domains[domainIdx].id },
      });
      await prisma.apiVersion.create({
        data: { apiId: api.id, version: "1.0.0", specType: def.type, status: "PUBLISHED", lifecycleStatus, maturityScore, changelog: `Initial ${def.name} release.`, releaseNotes: `First stable release of ${def.name}.` },
      });
    }
  }

  await prisma.governanceChecklist.upsert({ where: { id: "gc-naming" }, update: {}, create: { id: "gc-naming", name: "Naming Conventions", description: "API name follows kebab-case slug convention", required: true } });
  await prisma.governanceChecklist.upsert({ where: { id: "gc-versioning" }, update: {}, create: { id: "gc-versioning", name: "Versioning", description: "API has a semantic version in its spec", required: true } });
  await prisma.governanceChecklist.upsert({ where: { id: "gc-security-docs" }, update: {}, create: { id: "gc-security-docs", name: "Security Documentation", description: "Authentication method documented", required: true } });

  await prisma.announcement.upsert({
    where: { id: "ann-welcome" },
    update: {},
    create: { id: "ann-welcome", title: "Welcome to the Enterprise API Developer Portal", body: "Explore our API catalog, request access, and manage your integrations all in one place.", active: true, createdById: admin.id },
  });

  const apis = await prisma.api.findMany({ where: { orgId: org.id } });
  const months = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
  for (const api of apis) {
    for (const month of months) {
      await prisma.usageMetric.upsert({
        where: { apiId_month: { apiId: api.id, month } },
        update: {},
        create: { apiId: api.id, month, calls: Math.floor(Math.random() * 50000) + 1000, consumers: Math.floor(Math.random() * 20) + 1, docViews: Math.floor(Math.random() * 500) + 50 },
      });
    }
  }

  const allApis = await prisma.api.findMany({ where: { orgId: org.id } });
  const apiBySlug = Object.fromEntries(allApis.map((a) => [a.slug, a]));

  const healthcareProduct = await prisma.aPIProduct.upsert({
    where: { slug: "healthcare-core" },
    update: {},
    create: {
      name: "Healthcare Core Platform",
      slug: "healthcare-core",
      description: "Essential APIs for healthcare member, provider, and claims operations.",
      ownerId: owner.id,
      roadmap: "# Q3 2026\n- [ ] Add member consent API\n- [ ] Enhance claims status webhooks\n\n# Q4 2026\n- [x] Prior auth API v2\n- [ ] Provider credentialing API",
      documentation: "## Overview\nThe Healthcare Core Platform provides a unified set of APIs for core operations.\n\n## Getting Started\n1. Register an application\n2. Request product access\n3. Use mock credentials for development",
    },
  });

  for (const slug of ["customer-api", "claims-api", "member-eligibility-api", "prior-auth-api"]) {
    if (apiBySlug[slug]) {
      await prisma.aPIProductItem.upsert({
        where: { productId_apiId: { productId: healthcareProduct.id, apiId: apiBySlug[slug].id } },
        update: {},
        create: { productId: healthcareProduct.id, apiId: apiBySlug[slug].id },
      });
    }
  }

  const eventsProduct = await prisma.aPIProduct.upsert({
    where: { slug: "event-streaming" },
    update: {},
    create: {
      name: "Event Streaming Bundle",
      slug: "event-streaming",
      description: "Kafka and webhook APIs for real-time integration patterns.",
      ownerId: owner.id,
      roadmap: "# Active\n- [x] Kafka Customer Events\n- [x] Webhook Notification API\n\n# Planned\n- [ ] Payment Events API (GA)\n- [ ] Provider Event Stream",
    },
  });

  for (const slug of ["kafka-customer-events", "payment-events-api", "webhook-notification-api"]) {
    if (apiBySlug[slug]) {
      await prisma.aPIProductItem.upsert({
        where: { productId_apiId: { productId: eventsProduct.id, apiId: apiBySlug[slug].id } },
        update: {},
        create: { productId: eventsProduct.id, apiId: apiBySlug[slug].id },
      });
    }
  }

  console.log("✅ Enterprise seed complete");
}

main().catch(console.error).finally(() => prisma.$disconnect());
