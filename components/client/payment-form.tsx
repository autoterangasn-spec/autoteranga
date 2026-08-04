"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Smartphone } from "lucide-react";

import {
  initiatePayment,
  simulateMockPayment,
} from "@/app/actions/paiement";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFormuleInfo } from "@/lib/askia-tarifs";
import type { DevisWithVehicule, MoyenPaiement } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";

interface PaymentFormProps {
  devis: DevisWithVehicule;
  isMockMode: boolean;
  mockSession?: string | null;
  mockTransactionId?: string | null;
  showSuccess?: boolean;
  showError?: boolean;
}

export function PaymentForm({
  devis,
  isMockMode,
  mockSession,
  mockTransactionId,
  showSuccess,
  showError,
}: PaymentFormProps) {
  const router = useRouter();
  const [moyen, setMoyen] = useState<MoyenPaiement>("wave");
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vehicule = devis.vehicules;
  const vehiculeLabel = vehicule
    ? [vehicule.immatriculation, vehicule.marque, vehicule.modele]
        .filter(Boolean)
        .join(" — ")
    : "—";

  async function handlePay() {
    setLoading(true);
    setError(null);

    const { data, error: payError } = await initiatePayment(devis.id, moyen);

    if (payError || !data) {
      setError(payError ?? "Paiement impossible.");
      setLoading(false);
      return;
    }

    window.location.href = data.checkoutUrl;
  }

  async function handleMockConfirm() {
    const transactionId = mockTransactionId;
    if (!transactionId) {
      setError("Référence transaction manquante.");
      return;
    }
    setSimulating(true);
    setError(null);

    const { error: simError } = await simulateMockPayment(transactionId);
    setSimulating(false);

    if (simError) {
      setError(simError);
      return;
    }

    router.push(`/client/devis/${devis.id}/paiement?success=1`);
    router.refresh();
  }

  if (devis.statut === "paye" || devis.statut === "police_emise" || showSuccess) {
    return (
      <Alert>
        <AlertDescription>
          Paiement confirmé. Votre prime a été reversée au compte séquestre Askia.
          {devis.statut === "police_emise"
            ? " Votre attestation est disponible."
            : " Vous recevrez votre attestation sous 24 à 48 h."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {showError && (
        <Alert variant="destructive">
          <AlertDescription>
            Le paiement a échoué ou a été annulé. Réessayez ou contactez le
            support.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif</CardTitle>
          <CardDescription>{vehiculeLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Formule</span>
            <span className="font-medium">
              {getFormuleInfo(devis.formule).label}
            </span>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <span>Prime TTC à payer</span>
            <span>{formatCurrency(devis.prime_calculee)}</span>
          </div>
          <p className="pt-2 text-xs text-muted-foreground">
            La prime est versée directement au compte séquestre Askia Assurances.
            Autoteranga ne détient pas les fonds (conformité CIMA).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Moyen de paiement</CardTitle>
          <CardDescription>Choisissez votre opérateur Mobile Money</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() => setMoyen("wave")}
            className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors ${
              moyen === "wave"
                ? "border-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
          >
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Wave</p>
              <p className="text-xs text-muted-foreground">
                Paiement sécurisé via l&apos;application Wave
              </p>
            </div>
          </button>

          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-dashed p-4 text-left opacity-60"
          >
            <CreditCard className="h-5 w-5" />
            <div>
              <p className="font-medium">Orange Money</p>
              <p className="text-xs text-muted-foreground">Bientôt disponible</p>
            </div>
          </button>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        size="lg"
        onClick={handlePay}
        disabled={loading || moyen !== "wave"}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Redirection vers Wave…
          </>
        ) : (
          `Payer ${formatCurrency(devis.prime_calculee)}`
        )}
      </Button>

      {isMockMode && mockSession && mockTransactionId && (
        <Card className="border-dashed border-amber-400 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-base">Mode simulation (dev)</CardTitle>
            <CardDescription>
              WAVE_MOCK=true — simulez un paiement réussi sans clé Wave.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleMockConfirm}
              disabled={simulating}
            >
              {simulating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmation…
                </>
              ) : (
                "Simuler paiement réussi"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
