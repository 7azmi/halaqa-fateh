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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

const SHOW_ALL_TEACHERS = "__all__";

function getTeacherName(teachers: Teacher[], teacherId: number | undefined): string {
  if (!teacherId) return "بدون معلم";
  const teacher = teachers.find(t => t.id === teacherId);
  return teacher?.fullName ?? "معلم غير معروف";
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
  const [studentTeachers, setStudentTeachers] = useState<Map<number, number>>(new Map());
  const [rowsByStudent, setRowsByStudent] = useState<Map<number, DailyProgressRow>>(
    () => new Map()
  );
  const [savingByStudent, setSavingByStudent] = useState<Set<number>>(() => new Set());
  const [filterOnlyAttended, setFilterOnlyAttended] = useState(false);
  const [inputValues, setInputValues] = useState<Map<number, { hifz: string; muragaa: string }>>(
    () => new Map()
  );
  const [clearConfirmStudent, setClearConfirmStudent] = useState<number | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<number | null>(null);

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
    if (students.length === 0) return;
    let cancelled = false;

    Promise.all(
      students.map(async (student) => {
        try {
          const res = await fetch(`/api/students/${student.id}/last-teacher`, {
            cache: "no-store",
          });
          if (!res.ok) return { studentId: student.id, teacherId: null as number | null };
          const data = await res.json();
          return {
            studentId: student.id,
            teacherId:
              typeof data.lastTeacherId === "number" ? (data.lastTeacherId as number) : null,
          };
        } catch {
          return { studentId: student.id, teacherId: null as number | null };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      setStudentTeachers((prev) => {
        const next = new Map(prev);
        results.forEach((r) => {
          if (r.teacherId) next.set(r.studentId, r.teacherId);
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [students]);

  useEffect(() => {
    if (!teacherId) {
      setRowsByStudent(new Map());
      setInputValues(new Map());
      setStudentTeachers(new Map());
      return;
    }
    
    let cancelled = false;
    
    // If "show all teachers" is selected, fetch all data for the date
    const isShowAll = teacherId === SHOW_ALL_TEACHERS;
    const url = isShowAll 
      ? `/api/daily-progress?date=${encodeURIComponent(hijriDate)}`
      : `/api/daily-progress?date=${encodeURIComponent(hijriDate)}&teacherId=${teacherId}`;
    
    fetch(url, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      })
      .then((rows: unknown) => {
        if (cancelled) return;
        if (!Array.isArray(rows)) {
          console.error("Expected rows to be an array, got:", rows);
          return;
        }
        
        const map = new Map<number, DailyProgressRow>();
        const inputMap = new Map<number, { hifz: string; muragaa: string }>();
        const teacherMap = new Map<number, number>();
        
        rows.forEach((row) => {
          map.set(row.studentId, row);
          inputMap.set(row.studentId, {
            hifz: String(toNum(row.hifz)),
            muragaa: String(toNum(row.muragaa)),
          });
          teacherMap.set(row.studentId, row.teacherId);
        });
        setRowsByStudent(map);
        setInputValues(inputMap);
        setStudentTeachers((prev) => {
          const next = new Map(prev);
          teacherMap.forEach((tid, sid) => {
            next.set(sid, tid);
          });
          return next;
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load daily progress:", err);
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [teacherId, hijriDate]);

  const visibleStudents = useMemo(() => {
    const list = students.slice().sort((a, b) => a.id - b.id);
    const selectedTeacherId =
      teacherId && teacherId !== SHOW_ALL_TEACHERS ? parseInt(teacherId, 10) : null;

    if (selectedTeacherId) {
      const mapped = list.filter((s) => {
        const mappedTeacherId = studentTeachers.get(s.id);
        const todayTeacherId = rowsByStudent.get(s.id)?.teacherId;
        return mappedTeacherId === selectedTeacherId || todayTeacherId === selectedTeacherId;
      });
      if (!filterOnlyAttended) return mapped;
      return mapped.filter((s) => rowsByStudent.has(s.id));
    }

    if (!filterOnlyAttended) return list;
    return list.filter((s) => rowsByStudent.has(s.id));
  }, [students, filterOnlyAttended, rowsByStudent, teacherId, studentTeachers]);

  async function upsert(studentId: number, hifz: number, muragaa: number) {
    if (!teacherId) {
      toast.error("يجب اختيار المعلم أولاً");
      return;
    }

    const assignedTeacherId =
      teacherId === SHOW_ALL_TEACHERS
        ? studentTeachers.get(studentId)
        : parseInt(teacherId, 10);

    if (!assignedTeacherId) {
      toast.error("يجب اختيار معلم للطالب");
      return;
    }
    
    setSavingByStudent((prev) => new Set(prev).add(studentId));
    try {
      const res = await fetch("/api/daily-progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          teacherId: assignedTeacherId,
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
      setStudentTeachers((prev) => {
        const next = new Map(prev);
        next.set(studentId, assignedTeacherId);
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

  async function deleteEntry(studentId: number) {
    if (!teacherId) return;
    setDeletingStudent(studentId);
    try {
      const row = rowsByStudent.get(studentId);
      if (!row) {
        toast.error("السجل غير موجود");
        return;
      }
      
      const res = await fetch(`/api/daily-progress/${row.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to delete entry");
      }

      setRowsByStudent((prev) => {
        const next = new Map(prev);
        next.delete(studentId);
        return next;
      });
      setInputValues((prev) => {
        const next = new Map(prev);
        next.delete(studentId);
        return next;
      });
      
      toast.success("تم حذف السجل بنجاح");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطأ في حذف السجل";
      toast.error(message);
      console.error("Delete error:", error);
    } finally {
      setDeletingStudent(null);
      setClearConfirmStudent(null);
    }
  }

  function handleAttendanceToggle(studentId: number) {
    if (!teacherId) {
      toast.error("يجب اختيار المعلم أولاً");
      return;
    }

    const row = rowsByStudent.get(studentId);
    const attended = !!row;
    if (attended) {
      // If already attended, ask for confirmation before clearing
      setClearConfirmStudent(studentId);
    } else {
      // If not attended, mark as attended with zeros
      upsert(studentId, 0, 0);
    }
  }

  return (
    <div className="space-y-4">
      {/* Sticky Date Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 rounded-2xl mb-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">التاريخ (هجري)</div>
            <div className="text-lg font-semibold">{hijriDate}</div>
          </div>
          <div className="text-xs text-muted-foreground">
            {teacherId ? "الحفظ تلقائي" : "اختر معلمًا"}
          </div>
        </div>
      </div>

      {/* Students Card with Teachers Tabs */}
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3">
            <CardTitle className="text-base">قائمة الطلاب</CardTitle>
            
            {/* Teachers Tabs */}
            <div className="w-full">
              <Label className="text-xs mb-2 block">المعلم</Label>
              <Tabs value={teacherId} onValueChange={setTeacherId} className="w-full">
                <TabsList className="w-full justify-start overflow-x-auto rounded-xl bg-muted p-0.5 h-9">
                  <TabsTrigger 
                    value={SHOW_ALL_TEACHERS}
                    className="rounded-lg px-2 py-1 text-xs whitespace-nowrap"
                  >
                    الكل
                  </TabsTrigger>
                  {teachers.map((t) => (
                    <TabsTrigger 
                      key={t.id}
                      value={String(t.id)}
                      className="rounded-lg px-2 py-1 text-xs whitespace-nowrap"
                      title={t.fullName}
                    >
                      {t.fullName.length > 12 ? t.fullName.substring(0, 10) + "..." : t.fullName}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Filter Button */}
            <Button
              type="button"
              variant="outline"
              className="rounded-xl w-full text-xs"
              onClick={() => setFilterOnlyAttended((v) => !v)}
            >
              {filterOnlyAttended ? "إظهار جميع الطلاب" : "إخفاء بدون حضور"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {!teacherId ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              اختر معلمًا للبدء
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
                    "rounded-2xl border bg-background p-3 space-y-2",
                    attended ? "border-primary/30" : "border-border"
                  )}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{s.fullName}</div>
                      <div className="text-[11px] text-muted-foreground">
                        رقم: {s.id}
                        {attended ? " • حاضر" : ""}
                      </div>
                    </div>

                    {teacherId === SHOW_ALL_TEACHERS && (
                      <div className="w-48">
                        <Label className="text-[11px]">المعلم</Label>
                        <Select
                          value={String(studentTeachers.get(s.id) ?? "")}
                          onValueChange={(v) => {
                            const tid = parseInt(v, 10);
                            setStudentTeachers((prev) => {
                              const next = new Map(prev);
                              next.set(s.id, tid);
                              return next;
                            });
                          }}
                        >
                          <SelectTrigger className="h-9 rounded-xl">
                            <SelectValue placeholder="اختر المعلم">
                              {studentTeachers.get(s.id) ? getTeacherName(teachers, studentTeachers.get(s.id)) : "اختر المعلم"}
                            </SelectValue>
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
                    )}
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
                      disabled={busy || deletingStudent === s.id}
                      onClick={() => handleAttendanceToggle(s.id)}
                    >
                      {attended ? "إلغاء" : "حضور فقط"}
                    </Button>
                    {busy ? (
                      <div className="text-[11px] text-muted-foreground">...حفظ</div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={clearConfirmStudent !== null} onOpenChange={(open) => !open && setClearConfirmStudent(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>تأكيد حذف الحضور</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            هل أنت متأكد من رغبتك في حذف حضور هذا الطالب؟ لا يمكن التراجع عن هذا الإجراء.
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-lg"
              onClick={() => setClearConfirmStudent(null)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-lg"
              disabled={deletingStudent === clearConfirmStudent}
              onClick={() => clearConfirmStudent !== null && deleteEntry(clearConfirmStudent)}
            >
              {deletingStudent === clearConfirmStudent ? "جاري الحذف..." : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

