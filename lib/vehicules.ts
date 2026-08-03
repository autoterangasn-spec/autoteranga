const PLATE_REGEX = /^[A-Z]{2}-?\d{3}-?[A-Z]{2}$/i;

export type VehiculeType = "auto" | "moto";

export function normalizeImmatriculation(raw: string): string {
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  const match = cleaned.match(/^([A-Z]{2})-?(\d{3})-?([A-Z]{2})$/);
  if (!match) return cleaned;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function isValidImmatriculation(raw: string): boolean {
  const normalized = raw.replace(/\s+/g, "").toUpperCase();
  return PLATE_REGEX.test(normalized);
}

export const VEHICULE_TYPE_LABELS: Record<VehiculeType, string> = {
  auto: "Automobile",
  moto: "Moto",
};
