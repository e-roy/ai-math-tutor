"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/actions/auth";
import { BookOpen, Home, TrendingUp } from "lucide-react";
import { type Session } from "next-auth";

interface NavBarClientProps {
  session: Session | null;
}

export function NavBarClient({ session }: NavBarClientProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/tutor", label: "Tutor", icon: BookOpen },
    { href: "/progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold">
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
          {session ? (
            <>
              <span className="text-sm text-muted-foreground">
                {session.user?.name || session.user?.email}
              </span>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

