import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { ConversationClient } from "@/app/(app)/app/conversation/_components/ConversationClient";

export default async function ConversationPage() {
  const session = await auth();

  if (!session) {
    redirect("/signin?callbackUrl=/app/conversation");
  }

  return <ConversationClient />;
}
