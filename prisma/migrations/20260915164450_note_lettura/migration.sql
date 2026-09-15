-- CreateTable
CREATE TABLE "NoteWidget" (
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteWidget_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "LetturaWidget" (
    "userId" TEXT NOT NULL,
    "titolo" TEXT NOT NULL DEFAULT '',
    "pagina" INTEGER NOT NULL DEFAULT 0,
    "totale" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LetturaWidget_pkey" PRIMARY KEY ("userId")
);
