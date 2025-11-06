import { headers } from "next/headers";
import { LandingHeader } from "@/components/LandingHeader";

export async function ConditionalHeader() {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  // Show landing header only on landing page
  if (pathname === "/") {
    return <LandingHeader />;
  }

  // No header on sign-in page or app routes (handled by app layout)
  return null;
}
