-- ============================================================
-- Alfanex Attendance App — Full Schema
-- Run this in Supabase SQL Editor (drops and recreates everything)
-- ============================================================

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "Upload" CASCADE;
DROP TABLE IF EXISTS "Bill" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Task" CASCADE;
DROP TABLE IF EXISTS "Attendance" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Drop enums
DROP TYPE IF EXISTS "Role" CASCADE;
DROP TYPE IF EXISTS "AttendanceStatus" CASCADE;
DROP TYPE IF EXISTS "TaskPriority" CASCADE;
DROP TYPE IF EXISTS "TaskStatus" CASCADE;
DROP TYPE IF EXISTS "BillType" CASCADE;
DROP TYPE IF EXISTS "BillStatus" CASCADE;
DROP TYPE IF EXISTS "DocType" CASCADE;
DROP TYPE IF EXISTS "NotifType" CASCADE;

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE "Role" AS ENUM ('admin', 'manager', 'staff', 'customer');
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'late', 'absent', 'leave', 'half_day', 'visit');
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'done', 'cancelled');
CREATE TYPE "BillType" AS ENUM ('electricity', 'water', 'rent', 'salary', 'misc', 'customer');
CREATE TYPE "BillStatus" AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE "DocType" AS ENUM ('electricity', 'water', 'invoice', 'receipt', 'report', 'other');
CREATE TYPE "NotifType" AS ENUM ('bill', 'task', 'attendance', 'sync', 'system');

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE "User" (
    "id"           TEXT        NOT NULL,
    "name"         TEXT        NOT NULL,
    "email"        TEXT,
    "password"     TEXT        NOT NULL,
    "role"         "Role"      NOT NULL DEFAULT 'staff',
    "avatar"       TEXT,
    "department"   TEXT,
    "phone"        TEXT,
    "isActive"     BOOLEAN     NOT NULL DEFAULT true,
    "refreshToken" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email") WHERE "email" IS NOT NULL;

CREATE TABLE "Attendance" (
    "id"           TEXT              NOT NULL,
    "userId"       TEXT              NOT NULL,
    "date"         TEXT              NOT NULL,
    "checkIn"      TEXT,
    "checkOut"     TEXT,
    "status"       "AttendanceStatus" NOT NULL DEFAULT 'present',
    "note"         TEXT,
    "approvedById" TEXT,
    "latitude"     FLOAT,
    "longitude"    FLOAT,
    "locationName" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Attendance_userId_date_key" UNIQUE ("userId", "date"),
    CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id"),
    CONSTRAINT "Attendance_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id")
);

CREATE TABLE "Task" (
    "id"           TEXT           NOT NULL,
    "title"        TEXT           NOT NULL,
    "description"  TEXT,
    "assignedToId" TEXT           NOT NULL,
    "assignedById" TEXT           NOT NULL,
    "priority"     "TaskPriority" NOT NULL DEFAULT 'medium',
    "status"       "TaskStatus"   NOT NULL DEFAULT 'pending',
    "dueDate"      TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    "tags"         TEXT[],
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id"),
    CONSTRAINT "Task_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id")
);

CREATE TABLE "Bill" (
    "id"            TEXT        NOT NULL,
    "title"         TEXT        NOT NULL,
    "type"          "BillType"  NOT NULL DEFAULT 'misc',
    "amount"        DOUBLE PRECISION NOT NULL,
    "submittedById" TEXT        NOT NULL,
    "customer"      TEXT,
    "fileUrl"       TEXT,
    "fileName"      TEXT,
    "status"        "BillStatus" NOT NULL DEFAULT 'pending',
    "adminMessage"  TEXT,
    "approvedById"  TEXT,
    "approvedAt"    TIMESTAMP(3),
    "month"         TEXT,
    "category"      TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Bill_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Bill_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id"),
    CONSTRAINT "Bill_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id")
);

CREATE TABLE "Product" (
    "id"          TEXT    NOT NULL,
    "name"        TEXT    NOT NULL,
    "description" TEXT,
    "price"       DOUBLE PRECISION NOT NULL,
    "category"    TEXT,
    "imageUrl"    TEXT,
    "inStock"     BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT    NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id")
);

CREATE TABLE "Upload" (
    "id"             TEXT      NOT NULL,
    "originalName"   TEXT      NOT NULL,
    "storedName"     TEXT      NOT NULL,
    "fileUrl"        TEXT      NOT NULL,
    "fileType"       TEXT,
    "fileSize"       INTEGER,
    "tag"            TEXT,
    "amount"         DOUBLE PRECISION,
    "month"          TEXT,
    "docType"        "DocType" NOT NULL DEFAULT 'other',
    "uploadedById"   TEXT      NOT NULL,
    "syncedToSheets" BOOLEAN   NOT NULL DEFAULT false,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id")
);

CREATE TABLE "Notification" (
    "id"          TEXT        NOT NULL,
    "recipientId" TEXT        NOT NULL,
    "type"        "NotifType" NOT NULL DEFAULT 'system',
    "title"       TEXT        NOT NULL,
    "message"     TEXT        NOT NULL,
    "read"        BOOLEAN     NOT NULL DEFAULT false,
    "link"        TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id")
);

-- ============================================================
-- Disable RLS (required for server-side API key access)
-- ============================================================

ALTER TABLE "User"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance"   DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Task"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Bill"         DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"      DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Upload"       DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;