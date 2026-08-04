"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
  Upload,
} from "lucide-react";

import { previewPrime, submitDevis } from "@/app/actions/devis";
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
import { Label } from "@/components/ui/label";
import {
  FORMULES_ASSURANCE,
  type FormuleAssurance,
} from "@/lib/askia-tarifs";
import type { DevisAssurance, Vehicule } from "@/lib/types/database";
import { formatCurrency } from "@/lib/utils";
import { VEHICULE_TYPE_LABELS } from "@/lib/vehicules";

interface DevisWizardProps {
  vehicule: Vehicule;
}

const STEPS = [
  { id: 1, label: "Formule" },
  { id: 2, label: "Prime" },
  { id: 3, label: "Carte grise" },
  { id: 4, label: "Confirmation" },
];

export function DevisWizard({ vehicule }: DevisWizardProps) {
  const [step, setStep] = useState(1);
  const [formule, setFormule] = useState<FormuleAssurance | null>(null);
  const [prime, setPrime] = useState<number | null>(null);
  const [carteGriseFile, setCarteGriseFile] = useState<File | null>(null);
  const [useExistingCarteGrise, setUseExistingCarteGrise] = useState(
    Boolean(vehicule.carte_grise_url)
  );
  const [submittedDevis, setSubmittedDevis] = useState<DevisAssurance | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const vehiculeLabel = [vehicule.marque, vehicule.modele]
    .filter(Boolean)
    .join(" ");

  function handleSelectFormule(selected: FormuleAssurance) {
    setFormule(selected);
    setError(null);
    setPrime(null);
  }

  function handleNextFromFormule() {
    if (!formule) {
      setError("Sélectionnez une formule pour continuer.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await previewPrime(vehicule.id, formule);
      if (result.error || result.data == null) {
        setError(result.error ?? "Impossible de calculer la prime.");
        return;
      }
      setPrime(result.data);
      setStep(2);
    });
  }

  function handleNextFromPrime() {
    setError(null);
    setStep(3);
  }

  function handleNextFromCarteGrise() {
    if (!useExistingCarteGrise && !carteGriseFile) {
      setError("Téléversez votre carte grise pour continuer.");
      return;
    }
    setError(null);
    setStep(4);
  }

  function handleSubmit() {
    if (!formule) return;

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("vehicule_id", vehicule.id);
      formData.set("formule", formule);
      formData.set(
        "use_existing_carte_grise",
        useExistingCarteGrise ? "true" : "false"
      );
      if (carteGriseFile) {
        formData.set("carte_grise", carteGriseFile);
      }

      const result = await submitDevis(formData);
      if (result.error || !result.data) {
        setError(result.error ?? "Échec de l'envoi du devis.");
        return;
      }

      setSubmittedDevis(result.data);
      setPrime(result.data.prime_calculee);
      setStep(5);
    });
  }

  if (step === 5 && submittedDevis && formule) {
    const formuleInfo = FORMULES_ASSURANCE.find((f) => f.id === formule)!;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h1 className="text-2xl font-bold">Demande de devis envoyée</h1>
          <p className="text-muted-foreground">
            Votre demande a été transmise à Askia Assurances. Vous serez
            contacté pour finaliser la souscription.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Véhicule</span>
              <span className="font-medium">
                {vehicule.immatriculation}
                {vehiculeLabel ? ` — ${vehiculeLabel}` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formule</span>
              <span className="font-medium">{formuleInfo.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prime estimée TTC</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(submittedDevis.prime_calculee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant="success">Envoyé</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Référence</span>
              <span className="font-mono text-xs">{submittedDevis.id.slice(0, 8)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/client/devis">Voir mes devis</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/client/vehicules">Retour aux véhicules</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
          <Link href="/client/vehicules">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Mes véhicules
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Demande de devis assurance
        </h1>
        <p className="mt-1 text-muted-foreground">
          {vehicule.immatriculation}
          {vehiculeLabel ? ` — ${vehiculeLabel}` : ""}
          {vehicule.annee ? ` (${vehicule.annee})` : ""}
          {vehicule.type
            ? ` · ${VEHICULE_TYPE_LABELS[vehicule.type]}`
            : ""}
        </p>
      </div>

      <nav aria-label="Étapes" className="flex gap-2">
        {STEPS.map((s) => (
          <div
            key={s.id}
            className={`flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center text-xs sm:text-sm ${
              step === s.id
                ? "border-primary bg-primary/5 font-medium"
                : step > s.id
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "text-muted-foreground"
            }`}
          >
            <span className="font-semibold">{s.id}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </nav>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Choisissez votre formule</h2>
            <p className="text-sm text-muted-foreground">
              Sélectionnez le niveau de couverture adapté à votre usage.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {FORMULES_ASSURANCE.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => handleSelectFormule(f.id)}
                className={`rounded-xl border p-4 text-left transition-colors hover:border-primary/50 ${
                  formule === f.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : ""
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{f.label}</span>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {f.description}
                </p>
                <ul className="space-y-1 text-xs">
                  {f.garanties.map((g) => (
                    <li key={g} className="flex items-start gap-1">
                      <span className="text-primary">•</span>
                      {g}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleNextFromFormule} disabled={!formule || isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Calculer la prime
            </Button>
          </div>
        </section>
      )}

      {step === 2 && formule && (
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prime estimée</CardTitle>
              <CardDescription>
                Montant TTC calculé selon les tarifs Askia (estimation MVP).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-6 text-center">
                <p className="text-sm text-muted-foreground">Prime TTC annuelle</p>
                <p className="text-3xl font-bold text-primary">
                  {prime != null ? formatCurrency(prime) : "—"}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formule</span>
                  <span>
                    {FORMULES_ASSURANCE.find((f) => f.id === formule)?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>
                    {vehicule.type
                      ? VEHICULE_TYPE_LABELS[vehicule.type]
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Année</span>
                  <span>{vehicule.annee ?? "—"}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Ce montant est indicatif. La prime définitive sera confirmée
                par Askia Assurances lors de la souscription.
              </p>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button onClick={handleNextFromPrime}>
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Carte grise</h2>
            <p className="text-sm text-muted-foreground">
              Obligatoire pour finaliser votre demande de devis et la
              souscription assurance.
            </p>
          </div>

          {vehicule.carte_grise_url && (
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">Carte grise déjà enregistrée</p>
                  <p className="text-sm text-muted-foreground">
                    Vous pouvez réutiliser le document associé à ce véhicule.
                  </p>
                </div>
                <Button
                  variant={useExistingCarteGrise ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setUseExistingCarteGrise(true);
                    setCarteGriseFile(null);
                  }}
                >
                  Utiliser
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Label htmlFor="carte_grise_devis">
                  {vehicule.carte_grise_url
                    ? "Ou téléverser une nouvelle carte grise"
                    : "Téléverser la carte grise"}
                </Label>
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <input
                    id="carte_grise_devis"
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setCarteGriseFile(file);
                      if (file) setUseExistingCarteGrise(false);
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  PDF, JPEG, PNG ou WebP — max 10 Mo.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button onClick={handleNextFromCarteGrise}>
              Vérifier le récapitulatif
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      )}

      {step === 4 && formule && (
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Confirmer et envoyer</CardTitle>
              <CardDescription>
                Vérifiez les informations avant d&apos;envoyer votre demande.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Véhicule</span>
                <span className="font-medium">
                  {vehicule.immatriculation}
                  {vehiculeLabel ? ` — ${vehiculeLabel}` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Formule</span>
                <span>
                  {FORMULES_ASSURANCE.find((f) => f.id === formule)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prime estimée TTC</span>
                <span className="font-bold">{formatCurrency(prime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Carte grise</span>
                <span>
                  {useExistingCarteGrise
                    ? "Document existant"
                    : carteGriseFile?.name ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(3)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Envoyer ma demande
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
