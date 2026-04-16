-- CreateEnum
CREATE TYPE "TeacherStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "StudentState" AS ENUM ('active', 'inactive', 'archived', 'graduated', 'transferred');

-- CreateTable
CREATE TABLE "teachers" (
    "id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "status" "TeacherStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "hijri_birth_year" INTEGER,
    "hijri_enrollment_date" TEXT,
    "notes" TEXT,
    "state" "StudentState" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_progress" (
    "id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "teacher_id" INTEGER NOT NULL,
    "hijri_date" TEXT NOT NULL,
    "hijri_day" INTEGER NOT NULL,
    "hijri_month" INTEGER NOT NULL,
    "hijri_year" INTEGER NOT NULL,
    "hifz" DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    "muragaa" DECIMAL(5,1) NOT NULL DEFAULT 0.0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_progress_hijri_year_hijri_month_idx" ON "daily_progress"("hijri_year", "hijri_month");

-- CreateIndex
CREATE INDEX "daily_progress_teacher_id_hijri_year_hijri_month_idx" ON "daily_progress"("teacher_id", "hijri_year", "hijri_month");

-- CreateIndex
CREATE INDEX "daily_progress_student_id_hijri_year_hijri_month_idx" ON "daily_progress"("student_id", "hijri_year", "hijri_month");

-- CreateIndex
CREATE UNIQUE INDEX "daily_progress_student_id_teacher_id_hijri_date_key" ON "daily_progress"("student_id", "teacher_id", "hijri_date");

-- AddForeignKey
ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_progress" ADD CONSTRAINT "daily_progress_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
