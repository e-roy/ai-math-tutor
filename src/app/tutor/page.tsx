import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { TutorClient } from "./TutorClient";

export default async function TutorPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/tutor");
  }

  return (
    <main className="container py-8">
      <TutorClient />
    </main>
  );
}
