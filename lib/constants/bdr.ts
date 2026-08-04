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

/** Référence type BDR Askia (ex. N°57232026002, format HP). */
export function formatBdrReference(mois: number, annee: number): string {
  const mm = String(mois).padStart(2, "0");
  return `N°5723${annee}${mm}002`;
}
