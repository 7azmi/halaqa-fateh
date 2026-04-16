import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const QuerySchema = z.object({
  date: z.string().min(8), // "DD/MM/YYYY"
  teacherId: z.coerce.number().int().positive(),
});

const UpsertSchema = z.object({
  studentId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
  hijriDate: z.string().min(8), // "DD/MM/YYYY"
  hijriDay: z.number().int().min(1).max(30),
  hijriMonth: z.number().int().min(1).max(12),
  hijriYear: z.number().int().min(1300).max(1600),
  hifz: z.number().min(0),
  muragaa: z.number().min(0),
  notes: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    date: url.searchParams.get("date"),
    teacherId: url.searchParams.get("teacherId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }
  const { date, teacherId } = parsed.data;
  const rows = await db.dailyProgress.findMany({
    where: { hijriDate: date, teacherId },
  });
  return NextResponse.json(rows);
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const p = parsed.data;
  const row = await db.dailyProgress.upsert({
    where: {
      studentId_teacherId_hijriDate: {
        studentId: p.studentId,
        teacherId: p.teacherId,
        hijriDate: p.hijriDate,
      },
    },
    create: {
      studentId: p.studentId,
      teacherId: p.teacherId,
      hijriDate: p.hijriDate,
      hijriDay: p.hijriDay,
      hijriMonth: p.hijriMonth,
      hijriYear: p.hijriYear,
      hifz: p.hifz,
      muragaa: p.muragaa,
      notes: p.notes ?? null,
    },
    update: {
      hijriDay: p.hijriDay,
      hijriMonth: p.hijriMonth,
      hijriYear: p.hijriYear,
      hifz: p.hifz,
      muragaa: p.muragaa,
      notes: p.notes ?? null,
    },
  });
  return NextResponse.json(row);
}

