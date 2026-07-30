"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { DaysBadge } from "@/components/admin/days-badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VueExpirationProchaine } from "@/lib/types/database";
import { formatDate } from "@/lib/utils";

type UrgencyFilter = "all" | "critical" | "warning" | "ok";

interface ExpirationTableProps {
  rows: VueExpirationProchaine[];
}

function matchesUrgency(days: number, filter: UrgencyFilter): boolean {
  if (filter === "all") return true;
  if (filter === "critical") return days < 7;
  if (filter === "warning") return days >= 7 && days < 15;
  return days >= 15;
}

export function ExpirationTable({ rows }: ExpirationTableProps) {
  const [search, setSearch] = useState("");
  const [urgency, setUrgency] = useState<UrgencyFilter>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.immatriculation.toLowerCase().includes(query) ||
        (row.nom ?? "").toLowerCase().includes(query) ||
        row.num_police.toLowerCase().includes(query) ||
        (row.num_attestation ?? "").toLowerCase().includes(query);

      return (
        matchesSearch && matchesUrgency(row.jours_restants, urgency)
      );
    });
  }, [rows, search, urgency]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher immatriculation, nom, n° police..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={urgency}
          onValueChange={(value) => setUrgency(value as UrgencyFilter)}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrer par urgence" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="critical">Critique (&lt; 7 jours)</SelectItem>
            <SelectItem value="warning">Attention (&lt; 15 jours)</SelectItem>
            <SelectItem value="ok">OK (&ge; 15 jours)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Immatriculation</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>N° police</TableHead>
              <TableHead>N° attestation</TableHead>
              <TableHead>Expiration</TableHead>
              <TableHead>Jours restants</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aucune police trouvée pour ces critères.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.immatriculation}
                  </TableCell>
                  <TableCell>{row.nom ?? "—"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/polices/${row.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {row.num_police}
                    </Link>
                  </TableCell>
                  <TableCell>{row.num_attestation ?? "—"}</TableCell>
                  <TableCell>{formatDate(row.date_expiration)}</TableCell>
                  <TableCell>
                    <DaysBadge days={row.jours_restants} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} police{filtered.length !== 1 ? "s" : ""} affichée
        {filtered.length !== 1 ? "s" : ""} sur {rows.length}
      </p>
    </div>
  );
}
