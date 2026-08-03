"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function BdrDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("BDR detail error boundary:", error);
  }, [error]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/admin/bdr">Retour aux bordereaux</Link>
      </Button>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erreur</AlertTitle>
        <AlertDescription>
          Le détail du bordereau n&apos;a pas pu être affiché.
          {error.digest ? ` (${error.digest})` : null}
        </AlertDescription>
      </Alert>

      <Button variant="outline" onClick={reset}>
        Réessayer
      </Button>
    </div>
  );
}
