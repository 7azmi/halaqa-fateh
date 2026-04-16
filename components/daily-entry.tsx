"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Teacher = { id: number; fullName: string; status: string };
type Student = { id: number; fullName: string; state: string; hijriBirthYear: number | null };
type DailyProgressRow = {
  id: string;
  studentId: number;
  teacherId: number;
  hijriDate: string;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
  hifz: string | number;
  muragaa: string | number;
  notes: string | null;
};

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  return Number.isFinite(n) ? n : 0;
}

export function DailyEntry({
  hijriDate,
  hijriDay,
  hijriMonth,
  hijriYear,
}: {
  hijriDate: string;
  hijriDay: number;
  hijriMonth: number;
  hijriYear: number;
}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherId, setTeacherId] = useState<string>("");
  const [rowsByStudent, setRowsByStudent] = useState<Map<number, DailyProgressRow>>(
    () => new Map()
  );
  const [savingByStudent, setSavingByStudent] = useState<Set<number>>(() => new Set());
  const [filterOnlyAttended, setFilterOnlyAttended] = useState(false);
  const [inputValues, setInputValues] = useState<Map<number, { hifz: string; muragaa: string }>>(
    () => new Map()
  );

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/teachers", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/students", { cache: "no-store" }).then((r) => r.json()),
    ]).then(([t, s]) => {
      if (cancelled) return;
      setTeachers((t as Teacher[]).filter((x) => x.status !== "archived"));
      setStudents((s as Student[]).filter((x) => x.state !== "archived"));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!teacherId) {
      setRowsByStudent(new Map());
      setInputValues(new Map());
      return;
    }
    let cancelled = false;
    fetch(`/api/daily-progress?date=${encodeURIComponent(hijriDate)}&teacherId=${teacherId}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((rows: DailyProgressRow[]) => {
        if (cancelled) return;
        const map = new Map<number, DailyProgressRow>();
        const inputMap = new Map<number, { hifz: string; muragaa: string }>();
        rows.forEach((row) => {
          map.set(row.studentId, row);
          inputMap.set(row.studentId, {
            hifz: String(toNum(row.hifz)),
            muragaa: String(toNum(row.muragaa)),
          });
        });
        setRowsByStudent(map);
        setInputValues(inputMap);
      });
    return () => {
      cancelled = true;
    };
  }, [teacherId, hijriDate]);

  const visibleStudents = useMemo(() => {
    const list = students.slice().sort((a, b) => a.id - b.id);
    if (!filterOnlyAttended) return list;
    return list.filter((s) => rowsByStudent.has(s.id));
  }, [students, filterOnlyAttended, rowsByStudent]);

  async function upsert(studentId: number, hifz: number, muragaa: number) {
    if (!teacherId) return;
    setSavingByStudent((prev) => new Set(prev).add(studentId));
    try {
      const res = await fetch("/api/daily-progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          teacherId: parseInt(teacherId, 10),
          hijriDate,
          hijriDay,
          hijriMonth,
          hijriYear,
          hifz,
          muragaa,
          notes: null,
        }),
      });
      const saved = (await res.json()) as DailyProgressRow;
      setRowsByStudent((prev) => {
        const next = new Map(prev);
        next.set(studentId, saved);
        return next;
      });
      setInputValues((prev) => {
        const next = new Map(prev);
        next.set(studentId, {
          hifz: String(toNum(saved.hifz)),
          muragaa: String(toNum(saved.muragaa)),
        });
        return next;
      });
    } finally {
      setSavingByStudent((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">إدخال اليوم</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>التاريخ (هجري)</Label>
              <div className="rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                {hijriDate}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>المعلم</Label>
              <Select
                value={teacherId}
                onValueChange={(v) => setTeacherId(v ?? "")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر المعلم" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setFilterOnlyAttended((v) => !v)}
            >
              {filterOnlyAttended ? "إظهار جميع الطلاب" : "إخفاء الطلاب بدون حضور"}
            </Button>
            <div className="text-xs text-muted-foreground">
              {teacherId ? "الحفظ تلقائي" : "اختر معلمًا للبدء"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">قائمة الطلاب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!teacherId ? (
            <div className="text-sm text-muted-foreground">
              اختر المعلم أولاً لعرض اليومية.
            </div>
          ) : (
            visibleStudents.map((s) => {
              const row = rowsByStudent.get(s.id);
              const hifz = toNum(row?.hifz ?? 0);
              const mur = toNum(row?.muragaa ?? 0);
              const attended = !!row;
              const busy = savingByStudent.has(s.id);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "rounded-2xl border bg-background p-3",
                    attended ? "border-primary/30" : "border-border"
                  )}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{s.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        رقم: {s.id}
                        {attended ? " • حاضر" : ""}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <div className="w-28">
                        <Label className="text-[11px]">الحفظ</Label>
                        <Input
                          className="h-9 rounded-xl"
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          value={inputValues.get(s.id)?.hifz ?? ""}
                          onChange={(e) => {
                            setInputValues((prev) => {
                              const next = new Map(prev);
                              const current = next.get(s.id) ?? { hifz: "", muragaa: "" };
                              next.set(s.id, { ...current, hifz: e.target.value });
                              return next;
                            });
                          }}
                          onBlur={(e) => {
                            const v = toNum(e.target.value);
                            upsert(s.id, v, mur);
                          }}
                        />
                      </div>
                      <div className="w-28">
                        <Label className="text-[11px]">المراجعة</Label>
                        <Input
                          className="h-9 rounded-xl"
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          value={inputValues.get(s.id)?.muragaa ?? ""}
                          onChange={(e) => {
                            setInputValues((prev) => {
                              const next = new Map(prev);
                              const current = next.get(s.id) ?? { hifz: "", muragaa: "" };
                              next.set(s.id, { ...current, muragaa: e.target.value });
                              return next;
                            });
                          }}
                          onBlur={(e) => {
                            const v = toNum(e.target.value);
                            upsert(s.id, hifz, v);
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant={attended ? "secondary" : "outline"}
                        className="h-9 rounded-xl"
                        disabled={busy}
                        onClick={() => upsert(s.id, 0, 0)}
                      >
                        حضور فقط
                      </Button>
                      {busy ? (
                        <div className="text-[11px] text-muted-foreground">...حفظ</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}

