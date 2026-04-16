import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const StudentCreateSchema = z.object({
  id: z.number().int().positive().optional(),
  fullName: z.string().min(1),
  hijriBirthYear: z.number().int().min(1300).max(1600).nullable().optional(),
  hijriEnrollmentDate: z.string().min(8).nullable().optional(), // "DD/MM/YYYY"
  notes: z.string().nullable().optional(),
  state: z
    .enum(["active", "inactive", "archived", "graduated", "transferred"])
    .optional(),
});

export async function GET() {
  const students = await db.student.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json(students);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = StudentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
    }
    const s = parsed.data;
    const created = await db.student.create({
      data: {
        ...(s.id ? { id: s.id } : {}),
        fullName: s.fullName,
        hijriBirthYear: s.hijriBirthYear ?? null,
        hijriEnrollmentDate: s.hijriEnrollmentDate ?? null,
        notes: s.notes ?? null,
        state: s.state ?? "active",
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

