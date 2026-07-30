"use client";

import { useRef, useState } from "react";
import { ExternalLink, Loader2, MessageCircle } from "lucide-react";

import { getSignedDocumentUrl } from "@/app/actions/documents";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DocumentActionsProps {
  fichierUrl: string;
  documentLabel: string;
  numPolice?: string;
  typeDocument?: string | null;
}

export function DocumentActions({
  fichierUrl,
  documentLabel,
  numPolice,
  typeDocument,
}: DocumentActionsProps) {
  const [loading, setLoading] = useState<"view" | "whatsapp" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function resolveSignedUrl(): Promise<string | null> {
    const { url, error: signedError } = await getSignedDocumentUrl(
      fichierUrl,
      numPolice,
      typeDocument
    );

    if (signedError || !url) {
      setError(signedError ?? "Impossible de générer le lien.");
      return null;
    }

    setError(null);
    return url;
  }

  async function handleView(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busyRef.current) return;

    busyRef.current = true;
    setLoading("view");
    setError(null);

    try {
      const url = await resolveSignedUrl();
      if (!url) return;

      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(null);
      busyRef.current = false;
    }
  }

  async function handleWhatsApp(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busyRef.current) return;

    busyRef.current = true;
    setLoading("whatsapp");
    setError(null);

    try {
      const url = await resolveSignedUrl();
      if (!url) return;

      const text = `${documentLabel}\n${url}`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(null);
      busyRef.current = false;
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <Alert variant="destructive" className="max-w-xs py-2">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleView}
          disabled={loading !== null}
        >
          {loading === "view" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="mr-2 h-4 w-4" />
          )}
          Voir
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleWhatsApp}
          disabled={loading !== null}
        >
          {loading === "whatsapp" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageCircle className="mr-2 h-4 w-4" />
          )}
          Partager WhatsApp
        </Button>
      </div>
    </div>
  );
}
