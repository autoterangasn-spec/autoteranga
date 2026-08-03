import type { UserRole } from "@/lib/types/database";

export function getRedirectPathForRole(role: UserRole | null | undefined): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "prestataire":
      return "/prestataire";
    case "client":
    default:
      return "/client/vehicules";
  }
}
