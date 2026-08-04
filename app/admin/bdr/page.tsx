import { AlertCircle } from "lucide-react";

import { BdrList } from "@/components/admin/bdr-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { BordereauReglement } from "@/lib/types/database";

export default async function AdminBdrPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bordereaux_reglement")
    .select("*")
    .order("annee", { ascending: false })
    .order("mois", { ascending: false });

  const bordereaux = (data ?? []) as BordereauReglement[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Bordereaux de règlement
        </h1>
        <p className="text-muted-foreground">
          Génération mensuelle des primes collectées via Wave (Senegalsoft), à
          reverser à Askia via BDR (format HP, ex. N°57232026002).
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>
            {error.message.includes("bordereaux_reglement")
              ? "Tables BDR absentes. Exécutez supabase/mvp-schema.sql dans Supabase."
              : error.message}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>BDR mensuels</CardTitle>
          <CardDescription>
            Polices vendues via Autoteranga du mois en cours. Virement Askia +
            avis de recette avec commission déduite.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BdrList bordereaux={bordereaux} />
        </CardContent>
      </Card>
    </div>
  );
}
