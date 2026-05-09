-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'SUPERADMIN', 'API_PRODUCT_OWNER', 'API_DEVELOPER', 'GOVERNANCE_REVIEWER', 'SUPPORT_USER');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "APIType" AS ENUM ('REST', 'GRAPHQL', 'ASYNC_API', 'EVENT', 'WEBHOOK', 'SOAP');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('INTERNAL', 'PARTNER', 'PUBLIC');

-- CreateEnum
CREATE TYPE "LifecycleStatus" AS ENUM ('DRAFT', 'BETA', 'ACTIVE', 'DEPRECATED', 'RETIRED');

-- CreateEnum
CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "LifecycleEventType" AS ENUM ('CREATED', 'PUBLISHED', 'DEPRECATED', 'RETIRED', 'VERSION_ADDED', 'SPEC_UPDATED', 'STATUS_CHANGED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMembership" (
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMembership_pkey" PRIMARY KEY ("userId","orgId")
);

-- CreateTable
CREATE TABLE "API" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "APIType" NOT NULL,
    "category" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'INTERNAL',
    "businessCapability" TEXT,
    "systemOfRecord" TEXT,
    "supportContact" TEXT,
    "piiIndicator" BOOLEAN NOT NULL DEFAULT false,
    "phiIndicator" BOOLEAN NOT NULL DEFAULT false,
    "dataClassification" "DataClassification" NOT NULL DEFAULT 'INTERNAL',
    "gatewayRef" TEXT,
    "runtimeEndpoint" TEXT,
    "domainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "API_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIVersion" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "specKey" TEXT,
    "specUrl" TEXT,
    "specType" "APIType" NOT NULL,
    "status" "VersionStatus" NOT NULL DEFAULT 'DRAFT',
    "lifecycleStatus" "LifecycleStatus" NOT NULL DEFAULT 'DRAFT',
    "retirementDate" TIMESTAMP(3),
    "changelog" TEXT,
    "releaseNotes" TEXT,
    "maturityScore" INTEGER,
    "authMethod" TEXT,
    "rateLimitPolicy" TEXT,
    "slaInfo" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocPage" (
    "id" TEXT NOT NULL,
    "apiVersionId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockConfig" (
    "id" TEXT NOT NULL,
    "apiVersionId" TEXT NOT NULL,
    "baseDelayMs" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MockConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mockClientId" TEXT NOT NULL,
    "mockClientSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionRequest" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'dev',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'dev',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceChecklist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "apiType" "APIType",
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceReview" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LifecycleEvent" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" "LifecycleEventType" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMetric" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "consumers" INTEGER NOT NULL DEFAULT 0,
    "docViews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "roadmap" TEXT,
    "documentation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "APIProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "APIProductItem" (
    "productId" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,

    CONSTRAINT "APIProductItem_pkey" PRIMARY KEY ("productId","apiId")
);

-- CreateTable
CREATE TABLE "ProductSubscriptionRequest" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSubscriptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiTag" (
    "apiId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ApiTag_pkey" PRIMARY KEY ("apiId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "API_orgId_slug_key" ON "API"("orgId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "APIVersion_apiId_version_key" ON "APIVersion"("apiId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DocPage_apiVersionId_slug_key" ON "DocPage"("apiVersionId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "MockConfig_apiVersionId_key" ON "MockConfig"("apiVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_applicationId_apiId_environment_key" ON "Subscription"("applicationId", "apiId", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMetric_apiId_month_key" ON "UsageMetric"("apiId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_name_key" ON "Domain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "APIProduct_slug_key" ON "APIProduct"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgMembership" ADD CONSTRAINT "OrgMembership_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "API" ADD CONSTRAINT "API_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "API" ADD CONSTRAINT "API_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "API" ADD CONSTRAINT "API_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIVersion" ADD CONSTRAINT "APIVersion_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocPage" ADD CONSTRAINT "DocPage_apiVersionId_fkey" FOREIGN KEY ("apiVersionId") REFERENCES "APIVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockConfig" ADD CONSTRAINT "MockConfig_apiVersionId_fkey" FOREIGN KEY ("apiVersionId") REFERENCES "APIVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionRequest" ADD CONSTRAINT "SubscriptionRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceReview" ADD CONSTRAINT "GovernanceReview_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceReview" ADD CONSTRAINT "GovernanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceReview" ADD CONSTRAINT "GovernanceReview_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "GovernanceChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LifecycleEvent" ADD CONSTRAINT "LifecycleEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageMetric" ADD CONSTRAINT "UsageMetric_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIProduct" ADD CONSTRAINT "APIProduct_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIProductItem" ADD CONSTRAINT "APIProductItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "APIProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "APIProductItem" ADD CONSTRAINT "APIProductItem_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubscriptionRequest" ADD CONSTRAINT "ProductSubscriptionRequest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "APIProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSubscriptionRequest" ADD CONSTRAINT "ProductSubscriptionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTag" ADD CONSTRAINT "ApiTag_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "API"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiTag" ADD CONSTRAINT "ApiTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

