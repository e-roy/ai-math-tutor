import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, TrendingUp, Upload, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="container py-24 sm:py-32">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex flex-col gap-6">
            <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
              Master Math with
              <span className="text-primary"> AI-Powered</span> Tutoring
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-xl">
              Get personalized, Socratic guidance for math problems. Upload
              screenshots, receive step-by-step help, and track your progress
              from ages 4 to 18.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="px-8 text-lg">
              <Link href="/signin">Get Started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="px-8 text-lg"
            >
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container border-t py-16">
        <div className="flex flex-col items-center gap-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              How It Works
            </h2>
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg">
              Everything you need to excel in math, powered by AI
            </p>
          </div>

          <div className="grid w-full max-w-5xl gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <Upload className="text-primary mb-4 h-10 w-10" />
                <CardTitle>Upload Problems</CardTitle>
                <CardDescription>
                  Take a photo or screenshot of your math problem. Our AI uses
                  vision to understand what you&apos;re working on.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Sparkles className="text-primary mb-4 h-10 w-10" />
                <CardTitle>Socratic Tutoring</CardTitle>
                <CardDescription>
                  Get guided help through questions, not direct answers. Learn
                  the concepts, not just the solution.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="text-primary mb-4 h-10 w-10" />
                <CardTitle>Track Progress</CardTitle>
                <CardDescription>
                  Monitor your mastery across skills and domains. See your
                  growth over time with detailed progress tracking.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container border-t py-16">
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Start Learning?
          </h2>
          <p className="text-muted-foreground max-w-xl text-lg">
            Join students who are mastering math with personalized AI guidance.
          </p>
          <Button asChild size="lg" className="px-8 text-lg">
            <Link href="/signin">Get Started Free</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
