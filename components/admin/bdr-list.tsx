"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus } from "lucide-react";

import { genererBdrDuMois } from "@/app/actions/bdr";
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
import type { BordereauReglement } from "@/lib/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

const MOIS_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

function statutBadge(statut: BordereauReglement["statut"]) {
  switch (statut) {
    case "brouillon":
      return <Badge variant="secondary">Brouillon</Badge>;
    case "envoye":
      return <Badge variant="outline">Envoyé</Badge>;
    case "solde":
      return <Badge>Soldé</Badge>;
    default:
      return <Badge variant="secondary">{statut}</Badge>;
  }
}

interface BdrListProps {
  bordereaux: BordereauReglement[];
}

export function BdrList({ bordereaux }: BdrListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    const result = await genererBdrDuMois();

    if (result.error) {
      setError(result.error);
      if (result.data?.id) {
        router.push(`/admin/bdr/${result.data.id}`);
      }
    } else if (result.data?.id) {
      router.push(`/admin/bdr/${result.data.id}`);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Bordereaux de règlement Askia — primes collectées via la plateforme.
        </p>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Générer BDR du mois
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Période</TableHead>
              <TableHead>Total primes</TableHead>
              <TableHead>Commission Autoteranga</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bordereaux.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun bordereau. Cliquez sur « Générer BDR du mois ».
                </TableCell>
              </TableRow>
            ) : (
              bordereaux.map((bdr) => (
                <TableRow key={bdr.id}>
                  <TableCell className="font-medium">
                    {MOIS_LABELS[bdr.mois - 1]} {bdr.annee}
                  </TableCell>
                  <TableCell>{formatCurrency(bdr.total_primes)}</TableCell>
                  <TableCell>{formatCurrency(bdr.total_commission)}</TableCell>
                  <TableCell>{statutBadge(bdr.statut)}</TableCell>
                  <TableCell>{formatDate(bdr.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/bdr/${bdr.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Voir
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export { MOIS_LABELS };
