-- CreateTable
CREATE TABLE "SavedLayout" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "layout" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedLayout_userId_idx" ON "SavedLayout"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedLayout_userId_name_key" ON "SavedLayout"("userId", "name");
