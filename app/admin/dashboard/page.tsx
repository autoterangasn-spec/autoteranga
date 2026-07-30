import { AlertCircle } from "lucide-react";

import { ExpirationTable } from "@/components/admin/expiration-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { VueExpirationProchaine } from "@/lib/types/database";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vue_expirations_prochaines")
    .select("*")
    .order("jours_restants", { ascending: true });

  const rows = Array.from(
    new Map(
      ((data ?? []) as VueExpirationProchaine[]).map((row) => [row.id, row])
    ).values()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Expirations prochaines
        </h1>
        <p className="text-muted-foreground">
          Polices expirant dans les 30 prochains jours.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tableau des expirations</CardTitle>
          <CardDescription>
            Filtrez par immatriculation, nom ou niveau d&apos;urgence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpirationTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
