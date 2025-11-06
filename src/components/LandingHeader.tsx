"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 border-b backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          AI Math Tutor
        </Link>
        <Button asChild variant="default">
          <Link href="/signin">Sign In</Link>
        </Button>
      </div>
    </header>
  );
}
