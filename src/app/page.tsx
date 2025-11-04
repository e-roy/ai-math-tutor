import Link from "next/link";

import { Button } from "@/components/ui/button";
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

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="container py-16">
        <div className="flex flex-col items-center gap-12 text-center">
          <div className="flex flex-col gap-4">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
              AI Math Tutor
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl">
              Socratic math tutoring with AI assistance. Upload problems, get
              guided help, and track your progress.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-4xl w-full">
            <Card>
              <CardHeader>
                <BookOpen className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Tutor</CardTitle>
                <CardDescription>
                  Start a tutoring session with AI guidance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {session ? (
                  <Button asChild className="w-full">
                    <Link href="/tutor">Start Tutoring</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/signin?callbackUrl=/tutor">
                      Sign in to Start
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Progress</CardTitle>
                <CardDescription>
                  View your learning progress and mastery
                </CardDescription>
              </CardHeader>
              <CardContent>
                {session ? (
                  <Button asChild className="w-full">
                    <Link href="/progress">View Progress</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/signin?callbackUrl=/progress">
                      Sign in to View
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
