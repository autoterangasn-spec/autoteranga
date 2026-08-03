export const MOIS_LABELS = [
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
] as const;

export function formatBdrPeriode(mois: number, annee: number): string {
  const label = MOIS_LABELS[mois - 1] ?? `Mois ${mois}`;
  return `${label} ${annee}`;
}
