import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { WhiteboardClient } from "@/app/(app)/app/whiteboard/_components/WhiteboardClient";

export default async function WhiteboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/app/whiteboard");
  }

  return <WhiteboardClient />;
}
