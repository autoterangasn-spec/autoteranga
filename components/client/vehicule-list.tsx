"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";

import {
  deleteVehicule,
  getCarteGriseSignedUrl,
  getVehiculePhotoSignedUrl,
} from "@/app/actions/vehicules";
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

function VehiculePhotoThumb({ storagePath }: { storagePath: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getVehiculePhotoSignedUrl(storagePath).then((result) => {
      if (!cancelled && result.data) {
        setUrl(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  if (!url) {
    return <span className="text-xs text-muted-foreground">…</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Photo du véhicule"
      className="h-12 w-16 rounded object-cover"
    />
  );
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
              <TableHead className="w-[72px]">Photo</TableHead>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Marque / Modèle</TableHead>
              <TableHead>Année</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Carte grise</TableHead>
              <TableHead>Ajouté le</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicules.map((vehicule) => {
              const mainPhoto = vehicule.photos_urls?.[0];

              return (
                <TableRow key={vehicule.id}>
                  <TableCell>
                    {mainPhoto ? (
                      <VehiculePhotoThumb storagePath={mainPhoto} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {vehicule.immatriculation}
                  </TableCell>
                  <TableCell>
                    {vehicule.marque || vehicule.modele
                      ? [vehicule.marque, vehicule.modele]
                          .filter(Boolean)
                          .join(" ")
                      : "—"}
                  </TableCell>
                  <TableCell>{vehicule.annee ?? "—"}</TableCell>
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
                      <span className="text-xs text-muted-foreground">
                        Non fournie
                      </span>
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
