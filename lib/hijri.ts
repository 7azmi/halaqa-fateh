import { gregorianToHijri } from "@tabby_ai/hijri-converter";

export type HijriParts = {
  day: number;
  month: number;
  year: number;
};

export function getHijriFromGregorian(date: Date): HijriParts {
  const g = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
  const h = gregorianToHijri(g);
  return { day: h.day, month: h.month, year: h.year };
}

export function formatHijriDDMMYYYY(h: HijriParts): string {
  const dd = String(h.day).padStart(2, "0");
  const mm = String(h.month).padStart(2, "0");
  return `${dd}/${mm}/${h.year}`;
}

export function getHijriWeekdayArFromGregorian(date: Date): string {
  // Display-only label; data storage is via converter above.
  // Use a fixed locale/calendar for consistency.
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date);
  } catch {
    return "";
  }
}

export function addDaysToGregorian(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function calculateAgeFromHijriYear(birthYear: number): number {
  const now = new Date();
  const currentHijri = getHijriFromGregorian(now);
  return currentHijri.year - birthYear;
}

export function calculateHijriBirthYearFromAge(age: number): number {
  const now = new Date();
  const currentHijri = getHijriFromGregorian(now);
  return currentHijri.year - age;
}

