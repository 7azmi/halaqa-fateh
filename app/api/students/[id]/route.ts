import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const StudentUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  hijriBirthYear: z.number().int().min(1300).max(1600).nullable().optional(),
  hijriEnrollmentDate: z.string().min(8).nullable().optional(),
  notes: z.string().nullable().optional(),
  state: z.enum(["active", "inactive", "archived", "graduated", "transferred"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const studentId = parseInt(id, 10);
  if (!studentId) {
    return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = StudentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const updated = await db.student.update({
    where: { id: studentId },
    data: {
      ...(parsed.data.fullName ? { fullName: parsed.data.fullName } : {}),
      ...(parsed.data.hijriBirthYear !== undefined
        ? { hijriBirthYear: parsed.data.hijriBirthYear }
        : {}),
      ...(parsed.data.hijriEnrollmentDate !== undefined
        ? { hijriEnrollmentDate: parsed.data.hijriEnrollmentDate }
        : {}),
      ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
      ...(parsed.data.state ? { state: parsed.data.state } : {}),
    },
  });
  return NextResponse.json(updated);
}

