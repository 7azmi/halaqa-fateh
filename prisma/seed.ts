import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient, TeacherStatus, StudentState } from "../lib/generated/prisma/client";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function readCsv(path: string): { header: string[]; rows: Record<string, string>[] } {
  const txt = readFileSync(path, "utf8").replace(/\r\n/g, "\n").trimEnd();
  const lines = txt.split("\n").filter(Boolean);
  const header = parseCsvLine(lines[0]).map((s) => s.trim());
  const rows = lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = (cols[idx] ?? "").trim();
    });
    return row;
  });
  return { header, rows };
}

function parseHijriDateDDMMYYYY(s: string) {
  const [dd, mm, yyyy] = s.split("/").map((x) => parseInt(x, 10));
  if (!dd || !mm || !yyyy) throw new Error(`Invalid hijri_date: ${s}`);
  return { day: dd, month: mm, year: yyyy };
}

async function main() {
  const prisma = new PrismaClient();
  const root = process.cwd();
  const teachersCsv = resolve(root, "data", "teachers.csv");
  const studentsCsv = resolve(root, "data", "students.csv");
  const progressCsv = resolve(root, "data", "daily_progress.csv");

  const teachers = readCsv(teachersCsv).rows;
  const students = readCsv(studentsCsv).rows;
  const progress = readCsv(progressCsv).rows;

  for (const t of teachers) {
    const id = parseInt(t.id, 10);
    if (!id) continue;
    const status = (t.status || "active").toLowerCase() as TeacherStatus;
    await prisma.teacher.upsert({
      where: { id },
      create: {
        id,
        fullName: t.full_name,
        status: status ?? TeacherStatus.active,
      },
      update: {
        fullName: t.full_name,
        status: status ?? TeacherStatus.active,
      },
    });
  }

  for (const s of students) {
    const id = parseInt(s.id, 10);
    if (!id) continue;
    const birthYear = s.hijri_birth_year ? parseInt(s.hijri_birth_year, 10) : null;
    const state = (s.state || "active").toLowerCase() as StudentState;
    await prisma.student.upsert({
      where: { id },
      create: {
        id,
        fullName: s.full_name,
        hijriBirthYear: birthYear && !Number.isNaN(birthYear) ? birthYear : null,
        hijriEnrollmentDate: s.hijri_enrollment_date || null,
        notes: s.notes || null,
        state: state ?? StudentState.active,
      },
      update: {
        fullName: s.full_name,
        hijriBirthYear: birthYear && !Number.isNaN(birthYear) ? birthYear : null,
        hijriEnrollmentDate: s.hijri_enrollment_date || null,
        notes: s.notes || null,
        state: state ?? StudentState.active,
      },
    });
  }

  // Fast + deterministic: reset daily progress from CSV snapshot.
  await prisma.dailyProgress.deleteMany();

  const toCreate = progress
    .map((p) => {
      const studentId = parseInt(p.student_id, 10);
      const teacherId = parseInt(p.teacher_id, 10);
      if (!studentId || !teacherId) return null;
      const hijriDate = p.hijri_date;
      const h = parseHijriDateDDMMYYYY(hijriDate);
      return {
        studentId,
        teacherId,
        hijriDate,
        hijriDay: h.day,
        hijriMonth: h.month,
        hijriYear: h.year,
        hifz: p.hifz ? Number(p.hifz) : 0,
        muragaa: p.muragaa ? Number(p.muragaa) : 0,
        notes: p.notes || null,
      };
    })
    .filter(Boolean) as Array<{
    studentId: number;
    teacherId: number;
    hijriDate: string;
    hijriDay: number;
    hijriMonth: number;
    hijriYear: number;
    hifz: number;
    muragaa: number;
    notes: string | null;
  }>;

  const CHUNK = 1000;
  for (let i = 0; i < toCreate.length; i += CHUNK) {
    const chunk = toCreate.slice(i, i + CHUNK);
    await prisma.dailyProgress.createMany({ data: chunk, skipDuplicates: true });
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

