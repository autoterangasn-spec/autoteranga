"use client";

import Link from "next/link";
import { CreditCard, FileText } from "lucide-react";
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
import { DEVIS_STATUT_LABELS, getFormuleInfo } from "@/lib/askia-tarifs";
import type { DevisWithVehicule } from "@/lib/types/database";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DevisListProps {
  devis: DevisWithVehicule[];
}

function statutVariant(
  statut: DevisWithVehicule["statut"]
): "default" | "secondary" | "success" | "destructive" | "warning" {
  switch (statut) {
    case "envoye":
      return "default";
    case "paye":
      return "warning";
    case "police_emise":
      return "success";
    case "accepte":
      return "success";
    case "refuse":
      return "destructive";
    case "brouillon":
      return "warning";
    default:
      return "secondary";
  }
}

export function DevisList({ devis }: DevisListProps) {
  if (devis.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <p className="font-medium">Aucun devis pour le moment</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Demandez un devis depuis la liste de vos véhicules.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/client/vehicules">Mes véhicules</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Véhicule</TableHead>
            <TableHead>Formule</TableHead>
            <TableHead>Prime TTC</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devis.map((item) => {
            const vehicule = item.vehicules;
            const label = vehicule
              ? [vehicule.immatriculation, vehicule.marque, vehicule.modele]
                  .filter(Boolean)
                  .join(" — ")
              : "—";

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{label}</TableCell>
                <TableCell>{getFormuleInfo(item.formule).label}</TableCell>
                <TableCell>{formatCurrency(item.prime_calculee)}</TableCell>
                <TableCell>
                  <Badge variant={statutVariant(item.statut)}>
                    {DEVIS_STATUT_LABELS[item.statut]}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(item.created_at)}</TableCell>
                <TableCell className="text-right">
                  {item.statut === "envoye" && (
                    <Button size="sm" asChild>
                      <Link href={`/client/devis/${item.id}/paiement`}>
                        <CreditCard className="mr-1 h-3 w-3" />
                        Payer ma prime
                      </Link>
                    </Button>
                  )}
                  {item.statut === "paye" && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/client/devis/${item.id}`}>Suivre</Link>
                    </Button>
                  )}
                  {item.statut === "police_emise" && (
                    <Button size="sm" asChild>
                      <Link href={`/client/devis/${item.id}`}>Mes documents</Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
