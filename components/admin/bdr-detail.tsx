"use client";

import { useRef, useState } from "react";
import { Download, ExternalLink, Loader2, Send, Upload } from "lucide-react";

import {
  getAvisRecetteSignedUrl,
  marquerBdrEnvoye,
  uploadAvisRecette,
} from "@/app/actions/bdr";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBdrPeriode, formatBdrReference } from "@/lib/constants/bdr";
import type { BordereauLigne, BordereauReglement } from "@/lib/types/database";
import { formatCurrency, formatCurrencyForPdf, formatDate } from "@/lib/utils";

function formatMoyenPaiement(moyen: BordereauLigne["moyen_paiement"]): string {
  if (moyen === "wave") return "WAVE";
  if (moyen === "om") return "OM";
  return "—";
}

interface BdrDetailProps {
  bordereau: BordereauReglement;
  lignes: BordereauLigne[];
}

export function BdrDetail({ bordereau, lignes }: BdrDetailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totalAReverserAskia = bordereau.total_primes;
  const commissionDue = bordereau.total_commission;

  async function exportPdf() {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "landscape" });
    const periode = formatBdrPeriode(bordereau.mois, bordereau.annee);

    doc.setFontSize(16);
    doc.text("Bordereau de règlement — Autoteranga / Askia", 14, 18);
    doc.setFontSize(11);
    doc.text(`Période : ${periode}`, 14, 26);
    doc.text(
      `Réf. BDR (format Askia HP) : ${formatBdrReference(bordereau.mois, bordereau.annee)}`,
      14,
      32
    );
    doc.text(`Statut : ${bordereau.statut}`, 14, 38);

    autoTable(doc, {
      startY: 44,
      head: [
        [
          "N° Police",
          "Immatriculation",
          "Montant prime",
          "Date souscription",
          "Paiement",
          "Commission",
        ],
      ],
      body: lignes.map((l) => [
        l.n_police,
        l.immatriculation,
        formatCurrencyForPdf(l.montant_prime),
        formatDate(l.date_souscription),
        formatMoyenPaiement(l.moyen_paiement),
        formatCurrencyForPdf(l.commission),
      ]),
    });

    const finalY =
      (doc as InstanceType<typeof jsPDF> & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY ?? 38;

    doc.setFontSize(11);
    doc.text(
      `Total à reverser Askia : ${formatCurrencyForPdf(totalAReverserAskia)}`,
      14,
      finalY + 12
    );
    doc.text(
      `Commission Autoteranga due : ${formatCurrencyForPdf(commissionDue)}`,
      14,
      finalY + 20
    );

    doc.save(`BDR-${bordereau.annee}-${String(bordereau.mois).padStart(2, "0")}.pdf`);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadAvisRecette(bordereau.id, formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Avis de recette enregistré. Statuts polices mis à jour.");
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleViewAvis() {
    if (!bordereau.avis_recette_url) return;

    setError(null);
    const result = await getAvisRecetteSignedUrl(bordereau.avis_recette_url);

    if (result.error || !result.data?.url) {
      setError(result.error ?? "Lien indisponible.");
      return;
    }

    window.open(result.data.url, "_blank", "noopener,noreferrer");
  }

  async function handleMarkSent() {
    setMarking(true);
    setError(null);

    const result = await marquerBdrEnvoye(bordereau.id);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess("Bordereau marqué comme envoyé.");
    }

    setMarking(false);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        En fin de mois : virement du total des primes à Askia Assurances via ce
        bordereau (format BDR HP, ex.{" "}
        {formatBdrReference(bordereau.mois, bordereau.annee)}). Askia retourne
        un avis de recette avec commission déduite (ex. COM DEDUITE 9980F).
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{bordereau.statut}</Badge>
        {bordereau.avis_recette_url && (
          <Badge>Avis de recette reçu</Badge>
        )}
      </div>

      {(error || success) && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertDescription>{error ?? success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Total à reverser Askia</p>
          <p className="text-2xl font-bold">{formatCurrency(totalAReverserAskia)}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Commission Autoteranga due</p>
          <p className="text-2xl font-bold">{formatCurrency(commissionDue)}</p>
        </div>
        <div className="rounded-lg border bg-background p-4">
          <p className="text-sm text-muted-foreground">Nombre de polices</p>
          <p className="text-2xl font-bold">{lignes.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportPdf}>
          <Download className="mr-2 h-4 w-4" />
          Exporter PDF
        </Button>
        {bordereau.statut === "brouillon" && (
          <Button variant="secondary" onClick={handleMarkSent} disabled={marking}>
            {marking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Marquer envoyé
          </Button>
        )}
        {bordereau.avis_recette_url && (
          <Button variant="outline" onClick={handleViewAvis}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Voir avis de recette
          </Button>
        )}
        <Button
          variant="default"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          Upload avis de recette
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N° Police</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Montant prime</TableHead>
              <TableHead>Date souscription</TableHead>
              <TableHead>Type paiement</TableHead>
              <TableHead>Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lignes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucune ligne dans ce bordereau.
                </TableCell>
              </TableRow>
            ) : (
              lignes.map((ligne) => (
                <TableRow key={ligne.id}>
                  <TableCell className="font-medium">{ligne.n_police}</TableCell>
                  <TableCell>{ligne.immatriculation}</TableCell>
                  <TableCell>{formatCurrency(ligne.montant_prime)}</TableCell>
                  <TableCell>{formatDate(ligne.date_souscription)}</TableCell>
                  <TableCell>{formatMoyenPaiement(ligne.moyen_paiement)}</TableCell>
                  <TableCell>{formatCurrency(ligne.commission)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
