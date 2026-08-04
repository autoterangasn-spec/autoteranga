"use client";

import Link from "next/link";
import { CreditCard, ExternalLink, FileCheck } from "lucide-react";
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

interface AdminDevisListProps {
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
    default:
      return "secondary";
  }
}

export function AdminDevisList({ devis }: AdminDevisListProps) {
  if (devis.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucun devis en cours (envoyé, payé ou police émise).
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Véhicule</TableHead>
            <TableHead>Formule</TableHead>
            <TableHead>Prime</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                  <div className="flex items-center justify-end gap-2">
                    {item.statut === "envoye" && (
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        En attente paiement
                      </Badge>
                    )}
                    {item.statut === "paye" && (
                      <Button size="sm" asChild>
                        <Link href={`/admin/devis/${item.id}`}>
                          <FileCheck className="mr-1 h-3 w-3" />
                          Traiter Askia
                        </Link>
                      </Button>
                    )}
                    {item.statut === "police_emise" && item.police_id && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/polices/${item.police_id}`}>
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Police
                        </Link>
                      </Button>
                    )}
                    {item.statut === "envoye" && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/devis/${item.id}`}>
                          <CreditCard className="mr-1 h-3 w-3" />
                          Détail
                        </Link>
                      </Button>
                    )}
                    {(item.statut === "paye" || item.statut === "police_emise") && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/devis/${item.id}`}>Détail</Link>
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
