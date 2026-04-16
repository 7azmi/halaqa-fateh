-- AlterTable
CREATE SEQUENCE students_id_seq;
ALTER TABLE "students" ALTER COLUMN "id" SET DEFAULT nextval('students_id_seq');
ALTER SEQUENCE students_id_seq OWNED BY "students"."id";

-- AlterTable
CREATE SEQUENCE teachers_id_seq;
ALTER TABLE "teachers" ALTER COLUMN "id" SET DEFAULT nextval('teachers_id_seq');
ALTER SEQUENCE teachers_id_seq OWNED BY "teachers"."id";
