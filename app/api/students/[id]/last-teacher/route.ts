import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const studentId = parseInt(id, 10);
    
    if (!studentId) {
      return NextResponse.json({ error: "Invalid student ID" }, { status: 400 });
    }

    // Get the most recent daily progress record for this student (regardless of teacher)
    const lastEntry = await db.dailyProgress.findFirst({
      where: { studentId },
      orderBy: { createdAt: "desc" },
      select: { teacherId: true },
    });

    return NextResponse.json({
      lastTeacherId: lastEntry?.teacherId ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
