import type { VehiculeType } from "@/lib/vehicules";

/**
 * Formules Askia simplifiées pour le MVP.
 * À remplacer par l'API tarifaire Askia / tables CIMA quand disponibles.
 */
export type FormuleAssurance = "tiers" | "tiers_plus" | "tous_risques";

export type DevisStatut =
  | "brouillon"
  | "envoye"
  | "accepte"
  | "refuse"
  | "paye"
  | "police_emise";

export interface FormuleInfo {
  id: FormuleAssurance;
  label: string;
  description: string;
  garanties: string[];
}

export const FORMULES_ASSURANCE: FormuleInfo[] = [
  {
    id: "tiers",
    label: "Tiers",
    description:
      "Responsabilité civile obligatoire et défense recours. Couverture minimale exigée par la loi.",
    garanties: [
      "Responsabilité civile",
      "Défense et recours",
    ],
  },
  {
    id: "tiers_plus",
    label: "Tiers Plus",
    description:
      "Tiers étendu avec vol, incendie et bris de glace. Bon rapport qualité-prix pour un usage quotidien.",
    garanties: [
      "Responsabilité civile",
      "Vol et incendie",
      "Bris de glace",
      "Défense et recours",
    ],
  },
  {
    id: "tous_risques",
    label: "Tous risques",
    description:
      "Protection maximale incluant les dommages à votre véhicule, même en cas de faute.",
    garanties: [
      "Responsabilité civile",
      "Vol, incendie, bris de glace",
      "Dommages tous accidents",
      "Catastrophes naturelles",
    ],
  },
];

/** Référence calibrée sur police AA617SE — auto ~2019, TTC 35 002 FCFA (Tiers Plus). */
const REFERENCE_YEAR = 2019;
const BASE_AUTO_TIERS_PLUS = 35_002;

const FORMULE_COEFFICIENTS: Record<FormuleAssurance, number> = {
  tiers: 0.72,
  tiers_plus: 1,
  tous_risques: 1.38,
};

const TYPE_COEFFICIENTS: Record<VehiculeType, number> = {
  auto: 1,
  moto: 0.52,
};

/**
 * Ajustement âge véhicule par rapport à l'année de référence (2019).
 * Véhicule plus récent → prime légèrement plus élevée ; plus ancien → réduction.
 */
function ageCoefficient(annee: number): number {
  const delta = REFERENCE_YEAR - annee;
  const factor = 1 + delta * 0.012;
  return Math.min(Math.max(factor, 0.75), 1.35);
}

function roundToHundred(value: number): number {
  return Math.round(value / 100) * 100;
}

export interface PrimeInput {
  type: VehiculeType;
  annee: number;
  formule: FormuleAssurance;
}

/**
 * Calcul MVP de la prime TTC (FCFA).
 *
 * Formule : base_auto_tiers_plus × coef_formule × coef_type × coef_âge
 *
 * Exemple auto 2019 Tiers Plus → 35 002 FCFA (référence AA617SE)
 * Exemple auto 2019 Tiers → ~25 200 FCFA
 * Exemple auto 2019 Tous risques → ~48 300 FCFA
 */
export function calculerPrime(input: PrimeInput): number {
  const { type, annee, formule } = input;

  const raw =
    BASE_AUTO_TIERS_PLUS *
    FORMULE_COEFFICIENTS[formule] *
    TYPE_COEFFICIENTS[type] *
    ageCoefficient(annee);

  return roundToHundred(raw);
}

export function getFormuleInfo(formule: FormuleAssurance): FormuleInfo {
  const info = FORMULES_ASSURANCE.find((f) => f.id === formule);
  if (!info) {
    throw new Error(`Formule inconnue : ${formule}`);
  }
  return info;
}

export const DEVIS_STATUT_LABELS: Record<DevisStatut, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  paye: "Payé",
  police_emise: "Police émise",
};
