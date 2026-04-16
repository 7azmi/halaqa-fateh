import { db } from "@/lib/db";
import { StudentsManager } from "@/components/students-manager";

export default async function StudentsPage() {
  const students = await db.student.findMany({ orderBy: { id: "asc" } });
  return <StudentsManager initial={students} />;
}

