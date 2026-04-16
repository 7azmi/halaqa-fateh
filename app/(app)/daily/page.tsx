"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  formatHijriDDMMYYYY,
  getHijriFromGregorian,
  getHijriWeekdayArFromGregorian,
  addDaysToGregorian,
} from "@/lib/hijri";
import { DailyEntry } from "@/components/daily-entry";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function DailyPage() {
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  if (!currentDate) return null;

  const h = getHijriFromGregorian(currentDate);
  const today = {
    hijriDate: formatHijriDDMMYYYY(h),
    weekdayAr: getHijriWeekdayArFromGregorian(currentDate),
  };

  const handlePrevDay = () => {
    setCurrentDate((prev) => (prev ? addDaysToGregorian(prev, -1) : new Date()));
  };

  const handleNextDay = () => {
    setCurrentDate((prev) => (prev ? addDaysToGregorian(prev, 1) : new Date()));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">اليومية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              {today.weekdayAr || "—"}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              {today.hijriDate}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevDay}
              className="rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="rounded-lg flex-1"
            >
              اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextDay}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <DailyEntry
        hijriDate={formatHijriDDMMYYYY(h)}
        hijriDay={h.day}
        hijriMonth={h.month}
        hijriYear={h.year}
      />
    </div>
  );
}

