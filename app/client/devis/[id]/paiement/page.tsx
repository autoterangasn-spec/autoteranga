import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getDevisForPayment } from "@/app/actions/paiement";
import { PaymentForm } from "@/components/client/payment-form";
import { DevisDocuments } from "@/components/client/devis-documents";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isWaveMockMode } from "@/lib/wave/client";

interface PaymentPageProps {
  params: { id: string };
  searchParams: {
    success?: string;
    error?: string;
    mock_session?: string;
    ref?: string;
  };
}

export default async function DevisPaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const { data: devis, error } = await getDevisForPayment(params.id);

  if (error || !devis) {
    notFound();
  }

  if (devis.statut === "brouillon" || devis.statut === "refuse") {
    redirect("/client/devis");
  }

  const isMockMode = isWaveMockMode();
  const mockSession = searchParams.mock_session ?? null;
  const transactionRef = searchParams.ref ?? null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="space-y-1">
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/client/devis">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mes devis
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Payer ma prime</h1>
        <p className="text-muted-foreground">
          Règlement sécurisé Mobile Money via Wave (compte Autoteranga /
          Senegalsoft).
        </p>
      </div>

      {devis.statut === "police_emise" && (
        <div className="space-y-3">
          <Alert>
            <AlertDescription>
              Votre police {devis.num_police} est active. Téléchargez votre
              attestation ci-dessous.
            </AlertDescription>
          </Alert>
          <DevisDocuments
            devisId={devis.id}
            numPolice={devis.num_police}
            numAttestation={devis.num_attestation}
          />
        </div>
      )}

      {(devis.statut === "envoye" || devis.statut === "paye") && (
        <PaymentForm
          devis={devis}
          isMockMode={isMockMode}
          mockSession={mockSession}
          mockTransactionId={transactionRef}
          showSuccess={searchParams.success === "1" || devis.statut === "paye"}
          showError={searchParams.error === "1"}
        />
      )}
    </div>
  );
}
