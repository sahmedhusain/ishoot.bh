-- Website pages made of blocks, and articles (news, updates, posts, press releases). Pages are created from the
-- current website settings the first time the CMS opens, so homepage sections, About and Contact keep their content.
-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageType" TEXT NOT NULL DEFAULT 'custom',
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "seoTitleEn" TEXT,
    "seoTitleAr" TEXT,
    "seoDescriptionEn" TEXT,
    "seoDescriptionAr" TEXT,
    "blocks" JSONB NOT NULL DEFAULT '[]',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "inHeader" BOOLEAN NOT NULL DEFAULT false,
    "inFooter" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable


CREATE TABLE "CmsArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "excerptEn" TEXT,
    "excerptAr" TEXT,
    "bodyEn" JSONB,
    "bodyAr" JSONB,
    "bodyHtmlEn" TEXT,
    "bodyHtmlAr" TEXT,
    "coverUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'news',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT,
    "authorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "seoTitleEn" TEXT,
    "seoTitleAr" TEXT,
    "seoDescriptionEn" TEXT,
    "seoDescriptionAr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_slug_key" ON "CmsPage" ("slug");

-- CreateIndex
CREATE INDEX "CmsPage_sortOrder_idx" ON "CmsPage" ("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CmsArticle_slug_key" ON "CmsArticle" ("slug");

-- CreateIndex
CREATE INDEX "CmsArticle_status_publishAt_idx" ON "CmsArticle" ("status", "publishAt");

-- CreateIndex
CREATE INDEX "CmsArticle_category_idx" ON "CmsArticle" ("category");

-- AddForeignKey
ALTER TABLE "CmsArticle"
ADD CONSTRAINT "CmsArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;