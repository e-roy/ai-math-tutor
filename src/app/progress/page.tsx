import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function ProgressPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/progress");
  }

  return (
    <main className="container py-8">
      <h1 className="text-4xl font-bold">Progress</h1>
      <p className="mt-4 text-muted-foreground">
        Your learning progress and mastery overview will appear here.
      </p>
    </main>
  );
}

