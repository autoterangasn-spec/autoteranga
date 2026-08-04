"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2, Upload } from "lucide-react";

import { validateAskiaManually } from "@/app/actions/attestation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DevisStatut } from "@/lib/types/database";

interface DevisValidationFormProps {
  devisId: string;
  statut: DevisStatut;
}

const STEPS = [
  { id: 1, label: "Devis payé" },
  { id: 2, label: "Créer la police sur Askia" },
  { id: 3, label: "Saisir N° police / attestation" },
  { id: 4, label: "Uploader attestation + facture" },
  { id: 5, label: "Police émise" },
];

function stepState(
  stepId: number,
  statut: DevisStatut
): "done" | "current" | "pending" {
  if (statut === "police_emise") return "done";
  if (statut === "paye") {
    if (stepId === 1) return "done";
    if (stepId === 2) return "current";
    return "pending";
  }
  if (stepId === 1 && statut === "envoye") return "current";
  return "pending";
}

export function DevisValidationForm({ devisId, statut }: DevisValidationFormProps) {
  const router = useRouter();
  const [numPolice, setNumPolice] = useState("");
  const [numAttestation, setNumAttestation] = useState("");
  const [attestationPdf, setAttestationPdf] = useState<File | null>(null);
  const [facturePdf, setFacturePdf] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("devis_id", devisId);
    formData.append("num_police", numPolice);
    formData.append("num_attestation", numAttestation);
    if (attestationPdf) formData.append("attestation_pdf", attestationPdf);
    if (facturePdf) formData.append("facture_pdf", facturePdf);

    const { data, error: submitError } = await validateAskiaManually(formData);

    setLoading(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setSuccess(`Police émise (ID : ${data?.policeId?.slice(0, 8)}…).`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-3">
        {STEPS.map((step) => {
          const state = stepState(step.id, statut);
          return (
            <li
              key={step.id}
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                state === "current"
                  ? "border-primary bg-primary/5"
                  : state === "done"
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "opacity-60"
              }`}
            >
              {state === "done" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    state === "current"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.id}
                </span>
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">{step.label}</p>
                {step.id === 2 && state !== "pending" && statut !== "police_emise" && (
                  <p className="text-xs text-muted-foreground">
                    Connectez-vous à la plateforme Askia (
                    <a
                      href="https://askia.sn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary underline"
                    >
                      askia.sn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    ), créez la police, puis récupérez l&apos;attestation et la
                    facture PDF.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {statut === "envoye" && (
        <Alert>
          <AlertDescription>
            En attente du paiement client sur Autoteranga (Wave). La prime sera
            encaissée sur le compte Senegalsoft, puis reversée à Askia en fin de
            mois via le BDR.
          </AlertDescription>
        </Alert>
      )}

      {statut === "police_emise" && (
        <Alert>
          <AlertDescription>
            Police émise et documents disponibles pour le client.
          </AlertDescription>
        </Alert>
      )}

      {statut === "paye" && (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attestation_pdf">Attestation PDF (Askia)</Label>
              <Input
                id="attestation_pdf"
                type="file"
                accept="application/pdf"
                required
                onChange={(e) =>
                  setAttestationPdf(e.target.files?.[0] ?? null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facture_pdf">Facture PDF (Askia)</Label>
              <Input
                id="facture_pdf"
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setFacturePdf(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Émission en cours…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Valider et publier les documents client
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
