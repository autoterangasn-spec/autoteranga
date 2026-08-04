import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { getAdminDevisDetail } from "@/app/actions/admin-devis";
import { AttestationDownload } from "@/components/client/attestation-download";
import { DevisValidationForm } from "@/components/admin/devis-validation-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DEVIS_STATUT_LABELS, getFormuleInfo } from "@/lib/askia-tarifs";
import { formatCurrency, formatDate } from "@/lib/utils";

interface AdminDevisDetailPageProps {
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

export default async function AdminDevisDetailPage({
  params,
}: AdminDevisDetailPageProps) {
  const { data: devis, error } = await getAdminDevisDetail(params.id);

  if (error || !devis) {
    notFound();
  }

  const vehicule = devis.vehicules;
  const vehiculeLabel = vehicule
    ? [vehicule.immatriculation, vehicule.marque, vehicule.modele]
        .filter(Boolean)
        .join(" — ")
    : "—";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/admin/devis">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux devis
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Devis — {vehiculeLabel}
        </h1>
        <div className="flex items-center gap-2">
          <Badge>{DEVIS_STATUT_LABELS[devis.statut]}</Badge>
          <span className="text-sm text-muted-foreground">
            Créé le {formatDate(devis.created_at)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Véhicule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Immatriculation" value={vehicule?.immatriculation ?? "—"} />
            <InfoRow
              label="Marque / modèle"
              value={[vehicule?.marque, vehicule?.modele].filter(Boolean).join(" ") || "—"}
            />
            <InfoRow label="Année" value={vehicule?.annee ? String(vehicule.annee) : "—"} />
            <InfoRow label="Type" value={vehicule?.type ?? "—"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Formule" value={getFormuleInfo(devis.formule).label} />
            <InfoRow label="Prime TTC" value={formatCurrency(devis.prime_calculee)} />
            <InfoRow label="Statut" value={DEVIS_STATUT_LABELS[devis.statut]} />
            <InfoRow label="Payé le" value={formatDate(devis.paid_at)} />
            {devis.num_police && (
              <InfoRow label="N° police" value={devis.num_police} />
            )}
            {devis.num_attestation && (
              <InfoRow label="N° attestation" value={devis.num_attestation} />
            )}
          </CardContent>
        </Card>
      </div>

      {devis.statut === "police_emise" && devis.police_id && (
        <Card>
          <CardHeader>
            <CardTitle>Police émise</CardTitle>
            <CardDescription>
              Dossier complet et attestation PDF disponibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/admin/polices/${devis.police_id}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Voir la police
              </Link>
            </Button>
            <AttestationDownload
              devisId={devis.id}
              numAttestation={devis.num_attestation}
            />
          </CardContent>
        </Card>
      )}

      {devis.statut !== "police_emise" && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Askia (MVP)</CardTitle>
            <CardDescription>
              Déclenchement manuel de l&apos;émission police / attestation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DevisValidationForm
              devisId={devis.id}
              disabled={devis.statut !== "paye"}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
