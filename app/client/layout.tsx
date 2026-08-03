import { ClientShell } from "@/components/client/client-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ClientShell userEmail={user?.email}>{children}</ClientShell>
  );
}
