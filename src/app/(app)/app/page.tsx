import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { NavBar } from "@/components/NavBar";
import { auth } from "@/server/auth";
import { HydrateClient } from "@/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, TrendingUp } from "lucide-react";

export default async function AppPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/app");
  }

  return (
    <HydrateClient>
      <NavBar />
      <main className="container py-16">
        <div className="flex flex-col items-center gap-12 text-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Welcome back!
            </h1>
            <p className="text-muted-foreground max-w-2xl text-xl">
              Choose your learning path to continue your math journey.
            </p>
          </div>

          <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <BookOpen className="text-primary mb-2 h-8 w-8" />
                <CardTitle>Tutor</CardTitle>
                <CardDescription>
                  Start a tutoring session with AI guidance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/tutor">Start Tutoring</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="text-primary mb-2 h-8 w-8" />
                <CardTitle>Progress</CardTitle>
                <CardDescription>
                  View your learning progress and mastery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/progress">View Progress</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
