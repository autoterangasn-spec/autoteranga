import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

interface MockWavePageProps {
  searchParams: { session?: string; ref?: string };
}

export default async function MockWavePage({ searchParams }: MockWavePageProps) {
  const session = searchParams.session;
  const ref = searchParams.ref;

  if (!ref) {
    redirect("/client/devis");
  }

  const supabase = await createClient();
  const { data: tx } = await supabase
    .from("assurance_transactions")
    .select("devis_id")
    .eq("id", ref)
    .maybeSingle();

  if (!tx?.devis_id) {
    redirect("/client/devis");
  }

  const params = new URLSearchParams();
  if (session) params.set("mock_session", session);
  params.set("ref", ref);

  redirect(`/client/devis/${tx.devis_id}/paiement?${params.toString()}`);
}
