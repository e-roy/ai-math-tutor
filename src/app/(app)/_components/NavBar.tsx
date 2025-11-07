"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Home, TrendingUp } from "lucide-react";

export function NavBar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navItems = [
    { href: "/app", label: "Home", icon: Home },
    { href: "/tutor", label: "Tutor", icon: BookOpen },
    { href: "/progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <nav className="bg-background border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/app" className="text-lg font-semibold">
            AI Math Tutor
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.href}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {status === "loading" ? (
            <Skeleton className="h-5 w-32" />
          ) : session ? (
            <>
              <span className="text-muted-foreground text-sm">
                {session.user?.name ?? session.user?.email}
              </span>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign Out
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
