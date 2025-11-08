import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { NavBar } from "@/app/(app)/_components/NavBar";
import { ProgressOverview } from "./_components/ProgressOverview";

export default async function ProgressPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/progress");
  }

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-7xl py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Progress</h1>
          <p className="text-muted-foreground mt-2">
            Track your learning progress and mastery across different skills and
            domains.
          </p>
        </div>
        <ProgressOverview />
      </main>
    </>
  );
}
