import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function getStats() {
  const [studentCount, teacherCount, totalRecords] = await Promise.all([
    db.student.count({ where: { state: { not: "archived" } } }),
    db.teacher.count({ where: { status: { not: "archived" } } }),
    db.dailyProgress.count(),
  ]);

  const monthlyData = await db.dailyProgress.groupBy({
    by: ["hijriMonth", "hijriYear"],
    _count: { id: true },
    orderBy: [{ hijriYear: "desc" }, { hijriMonth: "desc" }],
    take: 12,
  });

  return {
    studentCount,
    teacherCount,
    totalRecords,
    monthlyData,
  };
}

export default async function StatsPage() {
  const { studentCount, teacherCount, totalRecords, monthlyData } = await getStats();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{studentCount}</span>
            <span className="text-xs text-muted-foreground">طالب</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">إجمالي المعلمين</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{teacherCount}</span>
            <span className="text-xs text-muted-foreground">معلم</span>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">إجمالي السجلات</CardTitle>
          </CardHeader>
          <CardContent className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{totalRecords}</span>
            <span className="text-xs text-muted-foreground">سجل</span>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">التقدم الشهري (آخر 12 شهر)</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد بيانات</p>
          ) : (
            <div className="space-y-2">
              {monthlyData.map((item) => (
                <div
                  key={`${item.hijriYear}-${item.hijriMonth}`}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <span className="text-sm">
                    شهر {item.hijriMonth} من سنة {item.hijriYear}
                  </span>
                  <span className="text-sm font-medium text-primary">{item._count.id}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

