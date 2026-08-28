-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('development', 'staging', 'production');

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "environment" "Environment" NOT NULL DEFAULT 'development',
    "clientId" TEXT NOT NULL,
    "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessTokenTtl" TEXT NOT NULL DEFAULT '15m',
    "refreshTokenTtl" TEXT NOT NULL DEFAULT '30d',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "applications_clientId_key" ON "applications"("clientId");

-- CreateIndex
CREATE INDEX "applications_developerId_idx" ON "applications"("developerId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyId_key" ON "api_keys"("keyId");

-- CreateIndex
CREATE INDEX "api_keys_applicationId_idx" ON "api_keys"("applicationId");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
