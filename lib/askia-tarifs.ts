import type { VehiculeType } from "@/lib/vehicules";

/**
 * Tarification Askia calibrée sur documents réels (hardcodée, pas de parsing PDF).
 *
 * Références :
 * - conditionsParticuliereAuto — Ford Escape DK8967BG, Modou Sow, police 5723510AS000055
 * - Facture + Quittance — prime nette 47 111, TTC 58 035 (PACK 2 : RC + Bris de glaces)
 * - Captures TicAssur — primes nettes unitaires avant bonus (Ford DK8967BG)
 *
 * Véhicule étalon : VP CAT 1, puissance fiscale 17, essence, 1ère immat 2011, auto.
 * PACK 2 étalonné : prime nette 47 111 → TTC 58 035 (accessoire 3 000, FGA 908, TCA 7 016).
 */

/** Identifiants PACK Askia (noms réels du dropdown Gestassur / TicAssur). */
export type AskiaPackId =
  | "pack_1"
  | "pack_2"
  | "pack_3"
  | "pack_4"
  | "tr_franchise_250k"
  | "tr_franchise_150k"
  | "tr_franchise_100k"
  | "tr_franchise_50k";

/** Anciennes formules MVP — conservées pour les devis déjà en base. */
export type LegacyFormuleId = "tiers" | "tiers_plus" | "tous_risques";

export type FormuleAssurance = AskiaPackId | LegacyFormuleId;

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
  /** Libellé court affiché sur les cartes (ex. « PACK 2 »). */
  shortLabel: string;
}

/** Mapping anciennes formules → PACK Askia équivalent. */
export const LEGACY_FORMULE_MAP: Record<LegacyFormuleId, AskiaPackId> = {
  tiers: "pack_1",
  tiers_plus: "pack_2",
  tous_risques: "tr_franchise_250k",
};

const REFERENCE_ANNEE = 2011;
const REFERENCE_PUISSANCE = 17;
const DEFAULT_ACCESSOIRE = 3_000;
const FGA_RATE = 908 / 47_111;
const TCA_RATE = 0.14;
const RC_BONUS_COEF = 1.2;

const TYPE_COEFFICIENTS: Record<VehiculeType, number> = {
  auto: 1,
  moto: 0.52,
};

/** +1,5 % par année plus récente que l'étalon 2011 ; inverse pour les plus anciens. */
const AGE_RATE_PER_YEAR = 0.015;

export type GarantieId =
  | "rc"
  | "cedeao"
  | "bdg"
  | "incendie"
  | "vol"
  | "dr_recours"
  | "dr_avance_recours"
  | "securite_routiere"
  | "dommage"
  | "assistance";

interface GarantieDefinition {
  id: GarantieId;
  label: string;
  /** Prime nette étalon (2011, pf 17, auto) avant coef véhicule. */
  baseNette: number;
  /** Si false, prime fixe (ex. Cedeao). */
  scalesWithVehicle: boolean;
  /** Appliquer le coefficient bonus RC (malus 20 % sur l'étalon Ford). */
  rcBonus?: boolean;
}

const GARANTIE_CATALOG: Record<GarantieId, GarantieDefinition> = {
  rc: {
    id: "rc",
    label: "Responsabilité civile",
    baseNette: 30_259,
    scalesWithVehicle: true,
    rcBonus: true,
  },
  cedeao: {
    id: "cedeao",
    label: "CEDEAO",
    baseNette: 300,
    scalesWithVehicle: false,
  },
  bdg: {
    id: "bdg",
    label: "Bris de glaces",
    baseNette: 10_500,
    scalesWithVehicle: true,
  },
  incendie: {
    id: "incendie",
    label: "Incendie",
    baseNette: 2_500,
    scalesWithVehicle: true,
  },
  vol: {
    id: "vol",
    label: "Vol",
    baseNette: 1_400,
    scalesWithVehicle: true,
  },
  dr_recours: {
    id: "dr_recours",
    label: "Défense recours — Recours",
    baseNette: 2_625,
    scalesWithVehicle: true,
  },
  dr_avance_recours: {
    id: "dr_avance_recours",
    label: "Défense recours — Avance recours",
    baseNette: 6_563,
    scalesWithVehicle: true,
  },
  securite_routiere: {
    id: "securite_routiere",
    label: "Sécurité routière",
    baseNette: 3_282,
    scalesWithVehicle: true,
  },
  dommage: {
    id: "dommage",
    label: "Dommages tous accidents",
    baseNette: 18_500,
    scalesWithVehicle: true,
  },
  assistance: {
    id: "assistance",
    label: "Assistance Pack basique",
    baseNette: 5_819,
    scalesWithVehicle: false,
  },
};

/** Garanties incluses par PACK (assistance listée, non facturée sur l'étalon PACK 2 PDF). */
const PACK_GARANTIE_IDS: Record<AskiaPackId, GarantieId[]> = {
  pack_1: ["rc", "cedeao", "dr_recours", "assistance"],
  pack_2: ["rc", "cedeao", "bdg", "assistance"],
  pack_3: ["rc", "cedeao", "bdg", "dr_avance_recours", "assistance"],
  pack_4: [
    "rc",
    "cedeao",
    "bdg",
    "incendie",
    "vol",
    "dr_recours",
    "dr_avance_recours",
    "securite_routiere",
    "assistance",
  ],
  tr_franchise_250k: [
    "rc",
    "cedeao",
    "bdg",
    "incendie",
    "vol",
    "dr_recours",
    "dr_avance_recours",
    "securite_routiere",
    "dommage",
    "assistance",
  ],
  tr_franchise_150k: [
    "rc",
    "cedeao",
    "bdg",
    "incendie",
    "vol",
    "dr_recours",
    "dr_avance_recours",
    "securite_routiere",
    "dommage",
    "assistance",
  ],
  tr_franchise_100k: [
    "rc",
    "cedeao",
    "bdg",
    "incendie",
    "vol",
    "dr_recours",
    "dr_avance_recours",
    "securite_routiere",
    "dommage",
    "assistance",
  ],
  tr_franchise_50k: [
    "rc",
    "cedeao",
    "bdg",
    "incendie",
    "vol",
    "dr_recours",
    "dr_avance_recours",
    "securite_routiere",
    "dommage",
    "assistance",
  ],
};

/** Réduction dommage selon franchise (base = franchise 250 000 F). */
const FRANCHISE_DOMMAGE_COEF: Record<
  "tr_franchise_250k" | "tr_franchise_150k" | "tr_franchise_100k" | "tr_franchise_50k",
  number
> = {
  tr_franchise_250k: 1,
  tr_franchise_150k: 1.12,
  tr_franchise_100k: 1.25,
  tr_franchise_50k: 1.42,
};

/** PACK 2 étalon : assistance incluse mais non tarifée (alignement quittance Ford). */
const PACKS_SANS_ASSISTANCE_TARIFIEE: AskiaPackId[] = ["pack_2"];

export const ASKIA_PACKS: FormuleInfo[] = [
  {
    id: "pack_1",
    shortLabel: "PACK 1",
    label: "PACK 1 — RC · PT · DR",
    description:
      "Responsabilité civile, perte totale et défense recours, avec assistance.",
    garanties: [
      "Responsabilité civile + CEDEAO",
      "Perte totale (PT)",
      "Défense recours",
      "Assistance Pack basique",
    ],
  },
  {
    id: "pack_2",
    shortLabel: "PACK 2",
    label: "PACK 2 — RC · PT · DR · BDG",
    description:
      "Formule la plus souscrite : RC, bris de glaces et assistance. Calibrée sur police Ford DK8967BG.",
    garanties: [
      "Responsabilité civile + CEDEAO",
      "Bris de glaces (capital 250 000 F)",
      "Défense recours",
      "Assistance Pack basique",
    ],
  },
  {
    id: "pack_3",
    shortLabel: "PACK 3",
    label: "PACK 3 — RC · PT · DR · BDG · AR",
    description: "PACK 2 avec avance recours en cas de sinistre responsable.",
    garanties: [
      "Responsabilité civile + CEDEAO",
      "Bris de glaces",
      "Défense recours + Avance recours",
      "Assistance Pack basique",
    ],
  },
  {
    id: "pack_4",
    shortLabel: "PACK 4",
    label: "PACK 4 — Toutes options sauf dommage",
    description:
      "Couverture étendue : vol, incendie, sécurité routière, sans dommages collision.",
    garanties: [
      "Responsabilité civile + CEDEAO",
      "Bris de glaces, incendie, vol",
      "Défense recours + Avance recours",
      "Sécurité routière",
      "Assistance Pack basique",
    ],
  },
  {
    id: "tr_franchise_250k",
    shortLabel: "Tous risques 250k",
    label: "Tous risques — Franchise 250 000 F",
    description: "Protection maximale avec franchise dommage de 250 000 F.",
    garanties: [
      "Toutes garanties PACK 4",
      "Dommages tous accidents (franchise 250 000 F)",
      "Assistance Pack basique",
    ],
  },
  {
    id: "tr_franchise_150k",
    shortLabel: "Tous risques 150k",
    label: "Tous risques — Franchise 150 000 F",
    description: "Tous risques avec franchise dommage réduite à 150 000 F.",
    garanties: [
      "Toutes garanties PACK 4",
      "Dommages tous accidents (franchise 150 000 F)",
      "Assistance Pack basique",
    ],
  },
  {
    id: "tr_franchise_100k",
    shortLabel: "Tous risques 100k",
    label: "Tous risques — Franchise 100 000 F",
    description: "Tous risques avec franchise dommage de 100 000 F.",
    garanties: [
      "Toutes garanties PACK 4",
      "Dommages tous accidents (franchise 100 000 F)",
      "Assistance Pack basique",
    ],
  },
  {
    id: "tr_franchise_50k",
    shortLabel: "Tous risques 50k",
    label: "Tous risques — Franchise 50 000 F",
    description: "Franchise dommage minimale — prime la plus élevée.",
    garanties: [
      "Toutes garanties PACK 4",
      "Dommages tous accidents (franchise 50 000 F)",
      "Assistance Pack basique",
    ],
  },
];

/** @deprecated Utiliser ASKIA_PACKS — conservé pour imports existants. */
export const FORMULES_ASSURANCE = ASKIA_PACKS;

export interface PrimeLigneGarantie {
  id: GarantieId;
  label: string;
  primeNette: number;
}

export interface PrimeDetail {
  packId: AskiaPackId;
  primeNette: number;
  accessoire: number;
  fga: number;
  tca: number;
  primeTtc: number;
  lignes: PrimeLigneGarantie[];
}

export interface PrimeInput {
  type: VehiculeType;
  annee: number;
  /** Puissance fiscale (CV) — défaut 17 si absente. */
  puissanceFiscale?: number;
  formule: FormuleAssurance;
  accessoire?: number;
}

function roundFcfa(value: number): number {
  return Math.round(value);
}

export function normalizeFormuleId(formule: string): AskiaPackId | null {
  if (formule in LEGACY_FORMULE_MAP) {
    return LEGACY_FORMULE_MAP[formule as LegacyFormuleId];
  }
  if (formule in PACK_GARANTIE_IDS) {
    return formule as AskiaPackId;
  }
  return null;
}

export function isFormuleAssurance(value: string): value is FormuleAssurance {
  return normalizeFormuleId(value) !== null;
}

function vehicleCoefficient(input: {
  type: VehiculeType;
  annee: number;
  puissanceFiscale: number;
}): number {
  const puissanceCoef = input.puissanceFiscale / REFERENCE_PUISSANCE;
  const ageCoef = 1 + (input.annee - REFERENCE_ANNEE) * AGE_RATE_PER_YEAR;
  const clampedAgeCoef = Math.min(Math.max(ageCoef, 0.78), 1.35);
  return puissanceCoef * clampedAgeCoef * TYPE_COEFFICIENTS[input.type];
}

function garantiePrimeNette(
  garantie: GarantieDefinition,
  vehicleCoef: number,
  packId: AskiaPackId
): number {
  let prime = garantie.baseNette;

  if (garantie.scalesWithVehicle) {
    prime *= vehicleCoef;
  }

  if (garantie.id === "dommage" && packId in FRANCHISE_DOMMAGE_COEF) {
    prime *= FRANCHISE_DOMMAGE_COEF[packId as keyof typeof FRANCHISE_DOMMAGE_COEF];
  }

  if (garantie.rcBonus) {
    prime *= RC_BONUS_COEF;
  }

  return roundFcfa(prime);
}

function billedGarantieIds(packId: AskiaPackId): GarantieId[] {
  const ids = PACK_GARANTIE_IDS[packId];
  if (PACKS_SANS_ASSISTANCE_TARIFIEE.includes(packId)) {
    return ids.filter((id) => id !== "assistance");
  }
  return ids;
}

export function calculerPrimeDetail(input: PrimeInput): PrimeDetail {
  const packId = normalizeFormuleId(input.formule);
  if (!packId) {
    throw new Error(`Formule inconnue : ${input.formule}`);
  }

  const puissanceFiscale = input.puissanceFiscale ?? REFERENCE_PUISSANCE;
  const vehicleCoef = vehicleCoefficient({
    type: input.type,
    annee: input.annee,
    puissanceFiscale,
  });

  const lignes: PrimeLigneGarantie[] = billedGarantieIds(packId).map((id) => {
    const def = GARANTIE_CATALOG[id];
    return {
      id,
      label: def.label,
      primeNette: garantiePrimeNette(def, vehicleCoef, packId),
    };
  });

  const primeNette = lignes.reduce((sum, l) => sum + l.primeNette, 0);
  const accessoire = input.accessoire ?? DEFAULT_ACCESSOIRE;
  const fga = roundFcfa(primeNette * FGA_RATE);
  const tca = roundFcfa((primeNette + accessoire) * TCA_RATE);
  const primeTtc = primeNette + accessoire + fga + tca;

  return {
    packId,
    primeNette,
    accessoire,
    fga,
    tca,
    primeTtc,
    lignes,
  };
}

/** Retourne la prime TTC (FCFA). */
export function calculerPrime(input: PrimeInput): number {
  return calculerPrimeDetail(input).primeTtc;
}

export function getFormuleInfo(formule: FormuleAssurance): FormuleInfo {
  const packId = normalizeFormuleId(formule);
  const lookupId = packId ?? formule;
  const info = ASKIA_PACKS.find((p) => p.id === lookupId);
  if (!info) {
    throw new Error(`Formule inconnue : ${formule}`);
  }
  if (formule in LEGACY_FORMULE_MAP) {
    const legacy = formule as LegacyFormuleId;
    const legacyLabels: Record<LegacyFormuleId, string> = {
      tiers: "Tiers (legacy → PACK 1)",
      tiers_plus: "Tiers Plus (legacy → PACK 2)",
      tous_risques: "Tous risques (legacy → TR 250k)",
    };
    return { ...info, id: formule, label: legacyLabels[legacy] };
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
