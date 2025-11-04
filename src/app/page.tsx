import Link from "next/link";

import { Button } from "@/components/ui/button";
import { auth } from "@/server/auth";
import { api, HydrateClient } from "@/trpc/server";

export default async function Home() {
  const session = await auth();

  // Example post router removed - not part of MVP
  // if (session?.user) {
  //   void api.post.getLatest.prefetch();
  // }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
            AI Math Tutor
          </h1>

          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-col items-center justify-center gap-4">
              <p className="text-center text-2xl text-white">
                {session && <span>Logged in as {session.user?.name}</span>}
              </p>
              {session ? (
                <form
                  action={async () => {
                    "use server";
                    const { signOut } = await import("@/server/auth");
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <Button type="submit">Sign out</Button>
                </form>
              ) : (
                <Button asChild>
                  <Link href="/signin" className="no-underline">
                    Sign in
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
