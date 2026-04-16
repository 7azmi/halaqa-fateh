"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NAV = [
  { href: "/daily", label: "اليومية" },
  { href: "/students", label: "الطلاب" },
  { href: "/teachers", label: "المعلمين" },
  { href: "/stats", label: "الإحصائيات" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-xl px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl gap-4 px-3 py-4 md:px-6">
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="rounded-2xl border bg-background p-3">
            <div className="px-2 py-2">
              <div className="text-sm font-semibold">حلقة الفتح</div>
              <div className="text-xs text-muted-foreground">
                إدخال بيانات التحفيظ
              </div>
            </div>
            <Separator className="my-2" />
            <NavLinks />
          </div>
        </aside>

        <main className="flex-1">
          <header className="mb-3 flex items-center justify-between rounded-2xl border bg-background px-3 py-2 md:hidden">
            <div>
              <div className="text-sm font-semibold">حلقة الفتح</div>
              <div className="text-[11px] text-muted-foreground">
                إدخال بيانات التحفيظ
              </div>
            </div>
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="outline" size="sm">
                    القائمة
                  </Button>
                }
              />
              <SheetContent side="right" className="w-72">
                <div className="mb-2 text-sm font-semibold">التنقل</div>
                <NavLinks />
              </SheetContent>
            </Sheet>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}

