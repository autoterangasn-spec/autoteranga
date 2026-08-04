import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard } from "lucide-react";

import { getClientDevisDetail } from "@/app/actions/devis";
import { DevisDocuments } from "@/components/client/devis-documents";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

interface ClientDevisDetailPageProps {
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

export default async function ClientDevisDetailPage({
  params,
}: ClientDevisDetailPageProps) {
  const { data: devis, error } = await getClientDevisDetail(params.id);

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/client/devis">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mes devis
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Devis assurance</h1>
        <p className="text-muted-foreground">{vehiculeLabel}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Récapitulatif</CardTitle>
            <Badge>{DEVIS_STATUT_LABELS[devis.statut]}</Badge>
          </div>
          <CardDescription>Créé le {formatDate(devis.created_at)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Formule" value={getFormuleInfo(devis.formule).label} />
          <InfoRow label="Prime TTC" value={formatCurrency(devis.prime_calculee)} />
          {devis.paid_at && (
            <InfoRow label="Payé le" value={formatDate(devis.paid_at)} />
          )}
          {devis.num_police && (
            <InfoRow label="N° police" value={devis.num_police} />
          )}
          {devis.num_attestation && (
            <InfoRow label="N° attestation" value={devis.num_attestation} />
          )}
        </CardContent>
      </Card>

      {devis.statut === "envoye" && (
        <Card>
          <CardHeader>
            <CardTitle>Paiement</CardTitle>
            <CardDescription>
              Réglez votre prime via Wave pour finaliser la souscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/client/devis/${devis.id}/paiement`}>
                <CreditCard className="mr-2 h-4 w-4" />
                Payer ma prime
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {devis.statut === "paye" && (
        <Alert>
          <AlertDescription>
            Paiement confirmé. Votre attestation sera disponible sous 24 à 48 h
            après émission de la police sur Askia Assurances.
          </AlertDescription>
        </Alert>
      )}

      {devis.statut === "police_emise" && (
        <Card>
          <CardHeader>
            <CardTitle>Vos documents</CardTitle>
            <CardDescription>
              Police {devis.num_police} — attestation et facture Askia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DevisDocuments
              devisId={devis.id}
              numPolice={devis.num_police}
              numAttestation={devis.num_attestation}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
