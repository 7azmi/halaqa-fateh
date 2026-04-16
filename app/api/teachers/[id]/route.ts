import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const TeacherUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teacherId = parseInt(id, 10);
    if (!teacherId) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    const parsed = TeacherUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const updated = await db.teacher.update({
      where: { id: teacherId },
      data: {
        ...(parsed.data.fullName ? { fullName: parsed.data.fullName } : {}),
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

