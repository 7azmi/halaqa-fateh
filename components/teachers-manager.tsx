"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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

export function TeachersManager({ initial }: { initial: Teacher[] }) {
  const [teachers, setTeachers] = useState<Teacher[]>(initial);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

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
          <div className="text-xs text-muted-foreground">
            الإجمالي: {filtered.length}
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
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="truncate text-sm font-semibold">{t.fullName}</div>
                      <Badge variant={archived ? "secondary" : "outline"}>
                        {statusLabel[t.status]}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">رقم: {t.id}</div>
                  </div>

                  <Button
                    type="button"
                    className="rounded-xl"
                    variant={archived ? "outline" : "secondary"}
                    disabled={busy}
                    onClick={() => toggleArchive(t)}
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

