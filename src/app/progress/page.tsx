import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ProgressOverview } from "./ProgressOverview";

export default async function ProgressPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/progress");
  }

  return (
    <main className="container py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Progress</h1>
        <p className="mt-2 text-muted-foreground">
          Track your learning progress and mastery across different skills and domains.
        </p>
      </div>
      <ProgressOverview />
    </main>
  );
}

