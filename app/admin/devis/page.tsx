import { AlertCircle } from "lucide-react";

import { getAdminDevisList } from "@/app/actions/admin-devis";
import { AdminDevisList } from "@/components/admin/admin-devis-list";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminDevisPage() {
  const { data: devis, error } = await getAdminDevisList();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Devis assurance
        </h1>
        <p className="text-muted-foreground">
          Demandes clients — paiement Wave (Senegalsoft) et émission manuelle
          police Askia.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur de chargement</AlertTitle>
          <AlertDescription>
            {error.includes("devis_assurance")
              ? "Table devis absente. Exécutez supabase/sprint1-devis-assurance.sql."
              : error}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Devis en cours</CardTitle>
          <CardDescription>
            Statuts : envoyé (en attente paiement client), payé (création police
            Askia + upload documents), police émise (documents client
            disponibles).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminDevisList devis={devis ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
