"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { generateAttestationPdf } from "@/app/actions/attestation";
import { Button } from "@/components/ui/button";

interface AttestationDownloadProps {
  devisId: string;
  numAttestation?: string | null;
}

export function AttestationDownload({
  devisId,
  numAttestation,
}: AttestationDownloadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setLoading(true);
    setError(null);

    const { data, error: genError } = await generateAttestationPdf(devisId);
    setLoading(false);

    if (genError || !data) {
      setError(genError ?? "Génération impossible.");
      return;
    }

    const binary = atob(data.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        Attestation {numAttestation ? `(${numAttestation})` : ""}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
