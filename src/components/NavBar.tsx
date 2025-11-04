import { auth } from "@/server/auth";
import { NavBarClient } from "./NavBarClient";

export async function NavBar() {
  const session = await auth();

  return <NavBarClient session={session} />;
}

