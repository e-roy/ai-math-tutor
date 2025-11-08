import { redirect } from "next/navigation";

import { NavBar } from "@/app/(app)/_components/NavBar";
import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";

import { EmptyStateWithWizard } from "@/app/(app)/app/_components/EmptyStateWithWizard";
import { AppClient } from "@/app/(app)/app/_components/AppClient";

export default async function AppPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/app");
  }

  // Fetch children for the authenticated user
  const students = await api.children.list();

  return (
    <HydrateClient>
      <NavBar />
      <main className="mx-auto max-w-7xl py-16">
        {students.length === 0 ? (
          // Empty state: no children yet
          <EmptyStateWithWizard />
        ) : (
          // Standard dashboard: has children
          <AppClient students={students} />
        )}
      </main>
    </HydrateClient>
  );
}
