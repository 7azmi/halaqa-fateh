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
import { toast } from "sonner";

type Teacher = {
  id: number;
  fullName: string;
  status: "active" | "inactive" | "archived";
};

const statusLabel: Record<Teacher["status"], string> = {
  active: "نشط",
  inactive: "غير نشط",
  archived: "مؤرشف",
};

function TeacherForm({
  teacher,
  onSave,
  onOpenChange,
}: {
  teacher?: Teacher;
  onSave: (data: Partial<Teacher>) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(teacher?.fullName ?? "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        fullName: name,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>اسم المعلم</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="أدخل اسم المعلم"
          required
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full rounded-lg">
        {loading ? "جاري الحفظ..." : teacher ? "تحديث" : "إضافة"}
      </Button>
    </form>
  );
}

export function TeachersManager({ initial }: { initial: Teacher[] }) {
  const [teachers, setTeachers] = useState<Teacher[]>(initial);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim();
    if (!qq) return teachers;
    return teachers.filter(
      (t) =>
        t.fullName.includes(qq) || String(t.id) === qq || String(t.id).includes(qq)
    );
  }, [teachers, q]);

  async function toggleArchive(t: Teacher) {
    setBusyId(t.id);
    try {
      const nextStatus = t.status === "archived" ? "active" : "archived";
      const res = await fetch(`/api/teachers/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const updated = (await res.json()) as Teacher;
      setTeachers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } finally {
      setBusyId(null);
    }
  }

  async function addTeacher(data: Partial<Teacher>) {
    try {
      const res = await fetch("/api/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
          status: "active",
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to add teacher");
      }
      const created = (await res.json()) as Teacher;
      setTeachers((prev) => [...prev, created].sort((a, b) => a.id - b.id));
      toast.success("تم إضافة المعلم بنجاح");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطأ في إضافة المعلم";
      toast.error(message);
      throw error;
    }
  }

  async function updateTeacher(id: number, data: Partial<Teacher>) {
    try {
      const res = await fetch(`/api/teachers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: data.fullName,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to update teacher");
      }
      const updated = (await res.json()) as Teacher;
      setTeachers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      toast.success("تم تحديث المعلم بنجاح");
    } catch (error) {
      const message = error instanceof Error ? error.message : "خطأ في تحديث المعلم";
      toast.error(message);
      throw error;
    }
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">المعلمين</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Input
            className="rounded-xl md:max-w-sm"
            placeholder="بحث بالاسم أو رقم المعلم"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex gap-2 items-center">
            <div className="text-xs text-muted-foreground">
              الإجمالي: {filtered.length}
            </div>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <Button className="rounded-lg" size="sm" onClick={() => setAddOpen(true)}>
                + إضافة معلم
              </Button>
              <DialogContent className="rounded-xl">
                <DialogHeader>
                  <DialogTitle>إضافة معلم جديد</DialogTitle>
                </DialogHeader>
                <TeacherForm
                  onSave={addTeacher}
                  onOpenChange={setAddOpen}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((t) => {
            const archived = t.status === "archived";
            const busy = busyId === t.id;
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-2xl border bg-background p-3",
                  archived ? "opacity-70" : ""
                )}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{t.fullName}</div>
                      <Badge variant={archived ? "secondary" : "outline"}>
                        {statusLabel[t.status]}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">رقم: {t.id}</div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog open={editingId === t.id} onOpenChange={(open) => open ? setEditingId(t.id) : setEditingId(null)}>
                      <Button
                        type="button"
                        className="rounded-xl"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setEditingId(t.id)}
                      >
                        تعديل
                      </Button>
                      <DialogContent className="rounded-xl">
                        <DialogHeader>
                          <DialogTitle>تعديل المعلم</DialogTitle>
                        </DialogHeader>
                        <TeacherForm
                          teacher={t}
                          onSave={(data) =>
                            updateTeacher(t.id, data).then(() =>
                              setEditingId(null)
                            )
                          }
                          onOpenChange={(open) =>
                            open ? setEditingId(t.id) : setEditingId(null)
                          }
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      type="button"
                      className="rounded-xl"
                      variant={archived ? "outline" : "secondary"}
                      disabled={busy}
                      onClick={() => toggleArchive(t)}
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

