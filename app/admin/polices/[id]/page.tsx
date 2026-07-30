import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";

import { DocumentList } from "@/components/admin/document-list";
import { DaysBadge } from "@/components/admin/days-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import type { Police, PoliceDocument, Vehicule, AssuranceClient } from "@/lib/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PoliceDetailPageProps {
  params: { id: string };
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium sm:text-right">{value}</span>
    </div>
  );
}

export default async function PoliceDetailPage({
  params,
}: PoliceDetailPageProps) {
  const { id } = params;
  const supabase = await createClient();

  const { data: policeData, error: policeError } = await supabase
    .from("polices")
    .select("*")
    .eq("id", id)
    .single();

  if (policeError || !policeData) {
    console.error("Police fetch error:", policeError?.message, "id:", id);
    notFound();
  }

  const police = policeData as Police;

  const [vehiculeResult, clientResult, documentsResult] = await Promise.all([
    police.vehicule_id
      ? supabase
          .from("vehicules")
          .select("*")
          .eq("id", police.vehicule_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    police.assurance_client_id
      ? supabase
          .from("assurance_clients")
          .select("*")
          .eq("id", police.assurance_client_id)
          .single()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("police_documents").select("*").eq("police_id", id),
  ]);

  const vehicule = vehiculeResult.data as Vehicule | null;
  const client = clientResult.data as AssuranceClient | null;
  const documents = (documentsResult.data ?? []) as PoliceDocument[];

  const joursRestants = police.date_expiration
    ? Math.ceil(
        (new Date(police.date_expiration).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
            <Link href="/admin/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au dashboard
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Police {police.num_police}
          </h1>
          <p className="text-muted-foreground">
            Dossier complet — véhicule, client et documents.
          </p>
        </div>
        {joursRestants !== null && <DaysBadge days={joursRestants} />}
      </div>

      {documentsResult.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur documents</AlertTitle>
          <AlertDescription>{documentsResult.error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Véhicule</CardTitle>
            <CardDescription>Informations du véhicule assuré</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="Immatriculation"
              value={vehicule?.immatriculation ?? "—"}
            />
            <InfoRow
              label="N° châssis"
              value={vehicule?.numero_chassis ?? "—"}
            />
            <InfoRow label="Marque" value={vehicule?.marque ?? "—"} />
            <InfoRow label="Modèle" value={vehicule?.modele ?? "—"} />
            <InfoRow label="Genre" value={vehicule?.genre ?? "—"} />
            <InfoRow label="Énergie" value={vehicule?.energie ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client assurance</CardTitle>
            <CardDescription>Données Gestassur / Askia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow
              label="N° client"
              value={client?.num_client_gestassur ?? "—"}
            />
            <InfoRow
              label="Nom"
              value={
                [client?.nom, client?.prenoms].filter(Boolean).join(" ") || "—"
              }
            />
            <InfoRow label="Téléphone" value={client?.cellulaire ?? "—"} />
            <InfoRow
              label="Point de vente"
              value={
                client?.point_vente_code && client?.point_vente_nom
                  ? `${client.point_vente_code} ${client.point_vente_nom}`
                  : client?.point_vente_nom ?? "—"
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Police d&apos;assurance</CardTitle>
          <CardDescription>
            Détails de la police et découpage de la prime
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="N° police" value={police.num_police} />
            <InfoRow label="N° facture" value={police.num_facture ?? "—"} />
            <InfoRow label="N° avenant" value={police.num_avenant ?? "—"} />
            <InfoRow label="Statut" value={police.statut} />
            <InfoRow
              label="Date d'effet"
              value={formatDate(police.date_effet)}
            />
            <InfoRow
              label="Date d'expiration"
              value={formatDate(police.date_expiration)}
            />
          </div>

          <Separator />

          <div className="mx-auto max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prime nette</span>
              <span>{formatCurrency(police.prime_nette)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accessoire</span>
              <span>{formatCurrency(police.accessoire)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">FGA</span>
              <span>{formatCurrency(police.fga)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TCA</span>
              <span>{formatCurrency(police.tca)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>TTC</span>
              <span>{formatCurrency(police.prime_ttc)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            {documents.length} document{documents.length !== 1 ? "s" : ""} —
            visualisation et partage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentList documents={documents} numPolice={police.num_police} />
        </CardContent>
      </Card>
    </div>
  );
}
