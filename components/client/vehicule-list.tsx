"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import { deleteVehicule, getCarteGriseSignedUrl } from "@/app/actions/vehicules";
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
import { formatDate } from "@/lib/utils";
import { VEHICULE_TYPE_LABELS } from "@/lib/vehicules";
import type { Vehicule } from "@/lib/types/database";

interface VehiculeListProps {
  vehicules: Vehicule[];
}

export function VehiculeList({ vehicules }: VehiculeListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce véhicule ?")) return;

    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await deleteVehicule(id);
      if (result.error) {
        setError(result.error);
      }
      setPendingId(null);
    });
  }

  async function handleViewCarteGrise(storagePath: string) {
    setError(null);
    const result = await getCarteGriseSignedUrl(storagePath);
    if (result.error || !result.data) {
      setError(result.error ?? "Document indisponible.");
      return;
    }
    window.open(result.data, "_blank", "noopener,noreferrer");
  }

  if (vehicules.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun véhicule enregistré. Ajoutez votre premier véhicule ci-dessous.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Carte grise</TableHead>
              <TableHead>Ajouté le</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicules.map((vehicule) => (
              <TableRow key={vehicule.id}>
                <TableCell className="font-medium">
                  {vehicule.immatriculation}
                </TableCell>
                <TableCell>
                  {vehicule.type ? (
                    <Badge variant="secondary">
                      {VEHICULE_TYPE_LABELS[vehicule.type]}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {vehicule.carte_grise_url ? (
                    <Button
                      variant="link"
                      className="h-auto p-0"
                      onClick={() =>
                        handleViewCarteGrise(vehicule.carte_grise_url!)
                      }
                    >
                      Voir le document
                    </Button>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{formatDate(vehicule.created_at)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending && pendingId === vehicule.id}
                    onClick={() => handleDelete(vehicule.id)}
                    aria-label="Supprimer"
                  >
                    {isPending && pendingId === vehicule.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
