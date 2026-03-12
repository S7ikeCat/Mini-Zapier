-- CreateTable
CREATE TABLE "TelegramIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "botToken" TEXT NOT NULL,
    "defaultChatId" TEXT,
    "botUsername" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramIntegration_userId_key" ON "TelegramIntegration"("userId");

-- CreateIndex
CREATE INDEX "TelegramIntegration_userId_idx" ON "TelegramIntegration"("userId");
