-- AlterTable
ALTER TABLE "BoardLayout" ADD COLUMN     "habitList" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "JournalEntry" ADD COLUMN     "habits" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "sleepHours" DOUBLE PRECISION,
ADD COLUMN     "weight" DOUBLE PRECISION;
