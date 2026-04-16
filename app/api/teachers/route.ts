import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const TeacherCreateSchema = z.object({
  id: z.number().int().positive().optional(),
  fullName: z.string().min(1),
  status: z.enum(["active", "inactive", "archived"]).optional(),
});

export async function GET() {
  const teachers = await db.teacher.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json(teachers);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = TeacherCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const t = parsed.data;
  const created = await db.teacher.create({
    data: {
      ...(t.id ? { id: t.id } : {}),
      fullName: t.fullName,
      status: t.status ?? "active",
    },
  });
  return NextResponse.json(created, { status: 201 });
}

