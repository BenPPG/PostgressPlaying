-- CreateTable
CREATE TABLE "StoryList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "StoryList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryListItem" (
    "listId" INTEGER NOT NULL,
    "storyId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryListItem_pkey" PRIMARY KEY ("listId","storyId")
);

-- CreateIndex
CREATE INDEX "StoryList_ownerId_idx" ON "StoryList"("ownerId");

-- CreateIndex
CREATE INDEX "StoryListItem_storyId_idx" ON "StoryListItem"("storyId");

-- AddForeignKey
ALTER TABLE "StoryList" ADD CONSTRAINT "StoryList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryListItem" ADD CONSTRAINT "StoryListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "StoryList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryListItem" ADD CONSTRAINT "StoryListItem_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create default lists for existing users
DO $$
DECLARE
    u RECORD;
BEGIN
    FOR u IN SELECT id FROM "User" LOOP
        IF NOT EXISTS (
            SELECT 1 FROM "StoryList"
            WHERE "ownerId" = u.id AND "isDefault" = true AND "name" = 'Favourites'
        ) THEN
            INSERT INTO "StoryList" ("name", "description", "isPublic", "isDefault", "createdAt", "updatedAt", "ownerId")
            VALUES ('Favourites', 'Your favourite stories.', false, true, NOW(), NOW(), u.id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM "StoryList"
            WHERE "ownerId" = u.id AND "isDefault" = true AND "name" = 'Read Later'
        ) THEN
            INSERT INTO "StoryList" ("name", "description", "isPublic", "isDefault", "createdAt", "updatedAt", "ownerId")
            VALUES ('Read Later', 'Stories you want to read later.', false, true, NOW(), NOW(), u.id);
        END IF;
    END LOOP;
END $$;
