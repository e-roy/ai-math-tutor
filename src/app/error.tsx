"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { LandingHeader } from "@/components/landing-page/LandingHeader";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error:", error);
    }
  }, [error]);

  return (
    <>
      <LandingHeader />
      <main>
        <section className="mx-auto max-w-7xl py-24 sm:py-32">
          <div className="flex flex-col items-center gap-8 text-center">
            <Card className="max-w-md">
              <CardHeader>
                <AlertCircle className="text-destructive mx-auto mb-4 h-16 w-16" />
                <CardTitle className="text-3xl font-extrabold">
                  Something went wrong
                </CardTitle>
                <CardDescription className="text-lg">
                  An unexpected error occurred
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <p className="text-muted-foreground mb-6">
                  We&apos;re sorry, but something went wrong. Please try again
                  or return to the home page.
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={reset} size="lg" className="w-full">
                    Try Again
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    <Link href="/">Go Home</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}
