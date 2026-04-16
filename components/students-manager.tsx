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
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { calculateAgeFromHijriYear } from "@/lib/hijri";
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
  const [birthYear, setBirthYear] = useState(student?.hijriBirthYear?.toString() ?? "");
  const [notes, setNotes] = useState(student?.notes ?? "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        fullName: name,
        hijriBirthYear: birthYear ? parseInt(birthYear, 10) : null,
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
        <Label>سنة الميلاد (هجري)</Label>
        <Input
          type="number"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          placeholder="مثال: 1410"
          min="1300"
          max="1600"
          disabled={loading}
        />
      </div>

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
      const created = (await res.json()) as Student;
      setStudents((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      toast.success("تم إضافة الطالب بنجاح");
    } catch (error) {
      toast.error("خطأ في إضافة الطالب");
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
      const updated = (await res.json()) as Student;
      setStudents((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("تم تحديث الطالب بنجاح");
    } catch (error) {
      toast.error("خطأ في تحديث الطالب");
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
              <DialogTrigger asChild>
                <Button className="rounded-lg" size="sm">
                  + إضافة طالب
                </Button>
              </DialogTrigger>
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
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          className="rounded-xl"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                        >
                          تعديل
                        </Button>
                      </DialogTrigger>
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

