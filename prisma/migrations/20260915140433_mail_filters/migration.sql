-- CreateTable
CREATE TABLE "MailFilter" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailFilter_userId_idx" ON "MailFilter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MailFilter_userId_pattern_key" ON "MailFilter"("userId", "pattern");
