import { NextResponse } from "next/server";
import {
  formatHijriDDMMYYYY,
  getHijriFromGregorian,
  getHijriWeekdayArFromGregorian,
} from "@/lib/hijri";

export const runtime = "nodejs";

export async function GET() {
  const now = new Date();
  const hijri = getHijriFromGregorian(now);
  return NextResponse.json({
    hijriDate: formatHijriDDMMYYYY(hijri),
    hijriDay: hijri.day,
    hijriMonth: hijri.month,
    hijriYear: hijri.year,
    weekdayAr: getHijriWeekdayArFromGregorian(now),
  });
}

