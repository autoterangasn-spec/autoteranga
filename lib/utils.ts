import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR").format(amount) + " FCFA";
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("fr-FR");
}

export function normalizeStoragePath(fichierUrl: string): string {
  let path = fichierUrl.trim();

  // URL complète Supabase Storage
  const objectMatch = path.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/polices-documents\/(.+?)(?:\?|$)/);
  if (objectMatch) {
    path = decodeURIComponent(objectMatch[1]);
  }

  return path
    .replace(/^polices-documents\//, "")
    .replace(/^\//, "");
}

export function normalizeFilename(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .replace(/_/g, "-");
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  attestation: ["attestation"],
  quittance: ["quittance"],
  facture: ["facture"],
  conditions_particulieres: ["conditions", "particuliere", "particulieres"],
};

export function scoreFilenameMatch(
  storageName: string,
  referenceName: string,
  typeDocument?: string | null
): number {
  const storage = normalizeFilename(storageName);
  const reference = normalizeFilename(referenceName);

  if (storage === reference) return 100;
  if (storage.includes(reference) || reference.includes(storage)) return 85;

  const refStem = reference.replace(/\.pdf$/i, "");
  const storageStem = storage.replace(/\.pdf$/i, "");
  if (storageStem.includes(refStem) || refStem.includes(storageStem)) return 75;

  if (typeDocument && TYPE_KEYWORDS[typeDocument]) {
    const keywords = TYPE_KEYWORDS[typeDocument];
    if (keywords.every((kw) => storage.includes(normalizeFilename(kw)))) {
      return 70;
    }
    if (keywords.some((kw) => storage.includes(normalizeFilename(kw)))) {
      return 60;
    }
  }

  return 0;
}

export function buildStoragePathCandidates(
  fichierUrl: string,
  numPolice?: string
): string[] {
  const candidates = new Set<string>();
  const normalized = normalizeStoragePath(fichierUrl);

  if (normalized) {
    candidates.add(normalized);
  }

  const basename = normalized.split("/").pop();
  if (basename && numPolice) {
    candidates.add(`${numPolice}/${basename}`);
  }

  return Array.from(candidates);
}
