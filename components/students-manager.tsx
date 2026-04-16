"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { calculateAgeFromHijriYear, calculateHijriBirthYearFromAge } from "@/lib/hijri";
import { toast } from "sonner";

type Student = {
  id: number;
  fullName: string;
  hijriBirthYear: number | null;
  hijriEnrollmentDate: string | null;
  notes: string | null;
  state: "active" | "inactive" | "archived" | "graduated" | "transferred";
};

const stateLabel: Record<Student["state"], string> = {
  active: "نشط",
  inactive: "غير نشط",
  archived: "مؤرشف",
  graduated: "متخرج",
  transferred: "منقول",
};

function StudentForm({
  student,
  onSave,
  onOpenChange,
}: {
  student?: Student;
  onSave: (data: Partial<Student>) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(student?.fullName ?? "");
  const [age, setAge] = useState(
    student?.hijriBirthYear
      ? String(calculateAgeFromHijriYear(student.hijriBirthYear))
      : ""
  );
  const [notes, setNotes] = useState(student?.notes ?? "");
  const [loading, setLoading] = useState(false);

  const calculatedBirthYear = age ? calculateHijriBirthYearFromAge(parseInt(age, 10)) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        fullName: name,
        hijriBirthYear: calculatedBirthYear,
        notes: notes || null,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>الاسم الكامل</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="أدخل اسم الطالب"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label>العمر (سنة)</Label>
        <Input
          type="number"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="مثال: 12"
          min="1"
          max="100"
          disabled={loading}
        />
      </div>

      {calculatedBirthYear && (
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">سنة الميلاد المحسوبة (هجري)</p>
          <p className="text-sm font-semibold">{calculatedBirthYear}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>ملاحظات</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي ملاحظات مهمة"
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full rounded-lg">
        {loading ? "جاري الحفظ..." : student ? "تحديث" : "إضافة"}
      </Button>
    </form>
  );
}

export function StudentsManager({ initial }: { initial: Student[] }) {
  const [students, setStudents] = useState<Student[]>(initial);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim();
    if (!qq) return students;
    return students.filter(
      (s) =>
        s.fullName.includes(qq) ||
        String(s.id) === qq ||
        String(s.id).includes(qq)
    );
  }, [students, q]);

  async function toggleArchive(s: Student) {
    setBusyId(s.id);
    try {
      const nextState = s.state === "archived" ? "active" : "archived";
      const res = await fetch(`/api/students/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
      const updated = (await res.json()) as Student;
      setStudents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function addStudent(data: Partial<Student>) {
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          hijriBirthYear: data.hijriBirthYear,
          notes: data.notes,
          state: "active",
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to add student");
      }
      const created = (await res.json()) as Student;
      setStudents((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      toast.success("تم إضافة الطالب بنجاح");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطأ في إضافة الطالب";
      toast.error(message);
      throw error;
    }
  }

  async function updateStudent(id: number, data: Partial<Student>) {
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          hijriBirthYear: data.hijriBirthYear,
          notes: data.notes,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to update student");
      }
      const updated = (await res.json()) as Student;
      setStudents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("تم تحديث الطالب بنجاح");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطأ في تحديث الطالب";
      toast.error(message);
      throw error;
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">الطلاب</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Input
            className="rounded-xl md:max-w-sm"
            placeholder="بحث بالاسم أو رقم الطالب"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex gap-2 items-center">
            <div className="text-xs text-muted-foreground">
              الإجمالي: {filtered.length}
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <Button className="rounded-lg" size="sm" onClick={() => setAddOpen(true)}>
                + إضافة طالب
              </Button>
              <DialogContent className="rounded-xl">
                <DialogHeader>
                  <DialogTitle>إضافة طالب جديد</DialogTitle>
                </DialogHeader>
                <StudentForm
                  onSave={addStudent}
                  onOpenChange={setAddOpen}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((s) => {
            const archived = s.state === "archived";
            const busy = busyId === s.id;
            const age =
              s.hijriBirthYear ? calculateAgeFromHijriYear(s.hijriBirthYear) : null;
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl border bg-background p-3",
                  archived ? "opacity-70" : ""
                )}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{s.fullName}</div>
                      <Badge variant={archived ? "secondary" : "outline"}>
                        {stateLabel[s.state]}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      رقم: {s.id}
                      {age !== null ? ` • العمر: ${age} سنة` : ""}
                      {s.notes ? ` • ${s.notes}` : ""}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog open={editingId === s.id} onOpenChange={(open) => open ? setEditingId(s.id) : setEditingId(null)}>
                      <Button
                        type="button"
                        className="rounded-xl"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setEditingId(s.id)}
                      >
                        تعديل
                      </Button>
                      <DialogContent className="rounded-xl">
                        <DialogHeader>
                          <DialogTitle>تعديل الطالب</DialogTitle>
                        </DialogHeader>
                        <StudentForm
                          student={s}
                          onSave={(data) =>
                            updateStudent(s.id, data).then(() =>
                              setEditingId(null)
                            )
                          }
                          onOpenChange={(open) =>
                            open ? setEditingId(s.id) : setEditingId(null)
                          }
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="button"
                      className="rounded-xl"
                      variant={archived ? "outline" : "secondary"}
                      disabled={busy}
                      onClick={() => toggleArchive(s)}
                      size="sm"
                    >
                      {archived ? "إلغاء الأرشفة" : "أرشفة"}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

