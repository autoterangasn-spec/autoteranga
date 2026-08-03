import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";

import { BdrDetail } from "@/components/admin/bdr-detail";
import { MOIS_LABELS } from "@/components/admin/bdr-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { BordereauLigne, BordereauReglement } from "@/lib/types/database";

interface BdrDetailPageProps {
  params: { id: string };
}

export default async function BdrDetailPage({ params }: BdrDetailPageProps) {
  const supabase = await createClient();

  const { data: bordereauData, error: bordereauError } = await supabase
    .from("bordereaux_reglement")
    .select("*")
    .eq("id", params.id)
    .single();

  if (bordereauError || !bordereauData) {
    notFound();
  }

  const bordereau = bordereauData as BordereauReglement;

  const { data: lignesData, error: lignesError } = await supabase
    .from("bordereau_lignes")
    .select("*")
    .eq("bordereau_id", params.id)
    .order("n_police", { ascending: true });

  const lignes = (lignesData ?? []) as BordereauLigne[];

  const periode = `${MOIS_LABELS[bordereau.mois - 1]} ${bordereau.annee}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/admin/bdr">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux bordereaux
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          BDR — {periode}
        </h1>
        <p className="text-muted-foreground">
          Détail des primes et commissions du mois.
        </p>
      </div>

      {lignesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur lignes</AlertTitle>
          <AlertDescription>{lignesError.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{periode}</CardTitle>
          <CardDescription>
            Export PDF, envoi Askia et réception avis de recette.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BdrDetail bordereau={bordereau} lignes={lignes} />
        </CardContent>
      </Card>
    </div>
  );
}
