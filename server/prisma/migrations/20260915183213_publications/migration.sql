-- CreateEnum
CREATE TYPE "PublicationKind" AS ENUM ('BOOK', 'CATALOGUE', 'ARTICLE', 'INTERVIEW');

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "PublicationKind" NOT NULL DEFAULT 'ARTICLE',
    "author" TEXT,
    "source" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "publications_year_idx" ON "publications"("year");
