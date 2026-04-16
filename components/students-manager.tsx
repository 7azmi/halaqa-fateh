"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

export function StudentsManager({ initial }: { initial: Student[] }) {
  const [students, setStudents] = useState<Student[]>(initial);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

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
          <div className="text-xs text-muted-foreground">
            الإجمالي: {filtered.length}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.map((s) => {
            const archived = s.state === "archived";
            const busy = busyId === s.id;
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl border bg-background p-3",
                  archived ? "opacity-70" : ""
                )}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{s.fullName}</div>
                      <Badge variant={archived ? "secondary" : "outline"}>
                        {stateLabel[s.state]}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      رقم: {s.id}
                      {s.hijriBirthYear ? ` • الميلاد: ${s.hijriBirthYear}` : ""}
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="rounded-xl"
                    variant={archived ? "outline" : "secondary"}
                    disabled={busy}
                    onClick={() => toggleArchive(s)}
                  >
                    {archived ? "إلغاء الأرشفة" : "أرشفة"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

