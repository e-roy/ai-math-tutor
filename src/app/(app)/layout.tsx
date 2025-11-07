import { SessionProvider } from "@/app/(app)/_components/SessionProvider";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <SessionProvider>{children}</SessionProvider>;
}
