CREATE TABLE "UploadObject" (
    "id" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadObject_pkey" PRIMARY KEY (id)
);

CREATE UNIQUE INDEX "UploadObject_fileUrl_key" ON "UploadObject" ("fileUrl");

CREATE INDEX "UploadObject_ownerId_expiresAt_idx" ON "UploadObject" ("ownerId", "expiresAt");

ALTER TABLE "UploadObject"
ADD CONSTRAINT "UploadObject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" (id) ON DELETE RESTRICT ON UPDATE CASCADE;