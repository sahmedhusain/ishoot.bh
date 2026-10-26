-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "departmentId" TEXT,
    "ownerId" TEXT,
    "color" TEXT NOT NULL DEFAULT '#4F46E5',
    "startDate" DATE,
    "dueDate" DATE,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assigneeId" TEXT,
    "departmentId" TEXT,
    "startDate" DATE,
    "dueDate" DATE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "linkType" TEXT,
    "linkId" TEXT,
    "createdById" TEXT,
    "completedAt" TIMESTAMP(3),
    "remindedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project" ("code");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project" ("status");

-- CreateIndex
CREATE INDEX "Project_departmentId_idx" ON "Project" ("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_number_key" ON "Task" ("number");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task" ("assigneeId", "status");

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "Task" ("projectId", "status");

-- CreateIndex
CREATE INDEX "Task_departmentId_status_idx" ON "Task" ("departmentId", "status");

-- CreateIndex
CREATE INDEX "Task_status_dueDate_idx" ON "Task" ("status", "dueDate");

-- CreateIndex
CREATE INDEX "Task_linkType_linkId_idx" ON "Task" ("linkType", "linkId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_createdAt_idx" ON "TaskComment" ("taskId", "createdAt");

-- AddForeignKey
ALTER TABLE "Task"
ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment"
ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity
ALTER TABLE "Project"
ADD CONSTRAINT "Project_status_check" CHECK (
    "status" IN (
        'active',
        'on_hold',
        'done',
        'archived'
    )
);

ALTER TABLE "Project"
ADD CONSTRAINT "Project_color_check" CHECK ("color" ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE "Project"
ADD CONSTRAINT "Project_dates_check" CHECK (
    "startDate" IS NULL
    OR "dueDate" IS NULL
    OR "startDate" <= "dueDate"
);

ALTER TABLE "Task"
ADD CONSTRAINT "Task_status_check" CHECK (
    "status" IN (
        'todo',
        'in_progress',
        'review',
        'done',
        'cancelled'
    )
);

ALTER TABLE "Task"
ADD CONSTRAINT "Task_priority_check" CHECK (
    "priority" IN (
        'low',
        'normal',
        'high',
        'urgent'
    )
);

ALTER TABLE "Task"
ADD CONSTRAINT "Task_dates_check" CHECK (
    "startDate" IS NULL
    OR "dueDate" IS NULL
    OR "startDate" <= "dueDate"
);

ALTER TABLE "Task"
ADD CONSTRAINT "Task_link_check" CHECK (
    ("linkType" IS NULL) = ("linkId" IS NULL)
);