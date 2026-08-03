import { PrestataireHome } from "@/components/prestataire/prestataire-home";
import { createClient } from "@/lib/supabase/server";

export default async function PrestatairePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <PrestataireHome userEmail={user?.email} />;
}
