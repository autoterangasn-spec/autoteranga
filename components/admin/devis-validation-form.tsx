"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { validateAskiaManually } from "@/app/actions/attestation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DevisValidationFormProps {
  devisId: string;
  disabled?: boolean;
}

export function DevisValidationForm({
  devisId,
  disabled,
}: DevisValidationFormProps) {
  const router = useRouter();
  const [numPolice, setNumPolice] = useState("");
  const [numAttestation, setNumAttestation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { data, error: submitError } = await validateAskiaManually(
      devisId,
      numPolice,
      numAttestation
    );

    setLoading(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setSuccess(`Police émise (ID : ${data?.policeId?.slice(0, 8)}…).`);
    router.refresh();
  }

  if (disabled) {
    return (
      <Alert>
        <AlertDescription>
          La validation Askia n&apos;est disponible qu&apos;après confirmation du
          paiement (statut payé).
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Saisie manuelle MVP — simule la validation Askia (N° police et
        attestation).
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="num_police">N° police Askia</Label>
        <Input
          id="num_police"
          placeholder="5723510AS000057"
          value={numPolice}
          onChange={(e) => setNumPolice(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="num_attestation">N° attestation</Label>
        <Input
          id="num_attestation"
          placeholder="SN003GT84QH"
          value={numAttestation}
          onChange={(e) => setNumAttestation(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Émission en cours…
          </>
        ) : (
          "Valider et émettre la police"
        )}
      </Button>
    </form>
  );
}
