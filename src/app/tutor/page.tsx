import { redirect } from "next/navigation";
import { auth } from "@/server/auth";

export default async function TutorPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/tutor");
  }

  return (
    <main className="container py-8">
      <h1 className="text-4xl font-bold">Tutor</h1>
      <p className="mt-4 text-muted-foreground">
        Your tutoring session will appear here.
      </p>
    </main>
  );
}

