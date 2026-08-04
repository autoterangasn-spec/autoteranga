"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { getDevisDocumentUrl } from "@/app/actions/attestation";
import { Button } from "@/components/ui/button";

interface DevisDocumentsProps {
  devisId: string;
  numPolice?: string | null;
  numAttestation?: string | null;
  showFacture?: boolean;
}

export function DevisDocuments({
  devisId,
  numPolice,
  numAttestation,
  showFacture = true,
}: DevisDocumentsProps) {
  const [loadingType, setLoadingType] = useState<
    "attestation" | "facture" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(type: "attestation" | "facture") {
    setLoadingType(type);
    setError(null);

    const { data, error: dlError } = await getDevisDocumentUrl(devisId, type);
    setLoadingType(null);

    if (dlError || !data?.url) {
      setError(dlError ?? "Téléchargement impossible.");
      return;
    }

    if (data.url.startsWith("data:")) {
      const base64 = data.url.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        type === "attestation"
          ? `attestation-${numAttestation ?? devisId.slice(0, 8)}.pdf`
          : `facture-${numPolice ?? devisId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    window.open(data.url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownload("attestation")}
          disabled={loadingType !== null}
          className="gap-2"
        >
          {loadingType === "attestation" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Attestation {numAttestation ? `(${numAttestation})` : ""}
        </Button>
        {showFacture && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDownload("facture")}
            disabled={loadingType !== null}
            className="gap-2"
          >
            {loadingType === "facture" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Facture {numPolice ? `(${numPolice})` : ""}
          </Button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
