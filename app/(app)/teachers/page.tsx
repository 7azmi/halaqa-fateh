import { db } from "@/lib/db";
import { TeachersManager } from "@/components/teachers-manager";

export default async function TeachersPage() {
  const teachers = await db.teacher.findMany({ orderBy: { id: "asc" } });
  return <TeachersManager initial={teachers} />;
}

