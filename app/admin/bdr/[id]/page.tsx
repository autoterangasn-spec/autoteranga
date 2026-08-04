import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";

import { BdrDetail } from "@/components/admin/bdr-detail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBdrPeriode } from "@/lib/constants/bdr";
import { createClient } from "@/lib/supabase/server";
import type { BordereauLigne, BordereauReglement } from "@/lib/types/database";

interface BdrDetailPageProps {
  params: { id: string };
}

export default async function BdrDetailPage({ params }: BdrDetailPageProps) {
  const { id } = params;

  try {
    const supabase = await createClient();

    const { data: bordereauData, error: bordereauError } = await supabase
      .from("bordereaux_reglement")
      .select("*")
      .eq("id", id)
      .single();

    if (bordereauError || !bordereauData) {
      console.error("BDR fetch error:", bordereauError?.message, "id:", id);
      notFound();
    }

    const bordereau = bordereauData as BordereauReglement;

    const { data: lignesData, error: lignesError } = await supabase
      .from("bordereau_lignes")
      .select("*")
      .eq("bordereau_id", id)
      .order("n_police", { ascending: true });

    const lignes = (lignesData ?? []) as BordereauLigne[];
    const periode = formatBdrPeriode(bordereau.mois, bordereau.annee);

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
              Export PDF (format BDR HP), virement Askia et réception avis de
              recette (COM DEDUITE).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BdrDetail bordereau={bordereau} lignes={lignes} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (err) {
    console.error("BDR detail page error:", err, "id:", id);

    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/admin/bdr">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux bordereaux
          </Link>
        </Button>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>
            Impossible d&apos;afficher ce bordereau. Réessayez ou contactez le
            support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
