import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileQuestion } from "lucide-react";
import { LandingHeader } from "@/components/landing-page/LandingHeader";

export default function NotFound() {
  return (
    <>
      <LandingHeader />
      <main>
        <section className="mx-auto max-w-7xl py-24 sm:py-32">
          <div className="flex flex-col items-center gap-8 text-center">
            <Card className="max-w-md">
              <CardHeader>
                <FileQuestion className="text-primary mx-auto mb-4 h-16 w-16" />
                <CardTitle className="text-4xl font-extrabold">404</CardTitle>
                <CardDescription className="text-lg">
                  Page not found
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-6">
                <p className="text-muted-foreground mb-6">
                  The page you&apos;re looking for doesn&apos;t exist or has
                  been moved.
                </p>
                <Button asChild size="lg" className="w-full">
                  <Link href="/">Go Home</Link>
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    </>
  );
}
