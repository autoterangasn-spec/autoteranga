export type UserRole = "client" | "prestataire" | "admin";

export type DocumentType =
  | "conditions_particulieres"
  | "quittance"
  | "facture"
  | "attestation";

export type StatutPaiementAskia = "en_attente" | "avis_recette_recu";
export type MoyenPaiement = "wave" | "om";
export type BordereauStatut = "brouillon" | "envoye" | "solde";
export type AssuranceTransactionStatut = "en_attente" | "confirme" | "echoue";

export interface Profile {
  id: string;
  auth_user_id: string | null;
  telephone: string;
  nom: string | null;
  prenoms: string | null;
  email: string | null;
  adresse: string | null;
  role: UserRole;
  created_at: string;
}

export type VehiculeType = "auto" | "moto";

export type FormuleAssurance = "tiers" | "tiers_plus" | "tous_risques";
export type DevisStatut =
  | "brouillon"
  | "envoye"
  | "accepte"
  | "refuse"
  | "paye"
  | "police_emise";

export interface DevisAssurance {
  id: string;
  vehicule_id: string;
  formule: FormuleAssurance;
  prime_calculee: number;
  statut: DevisStatut;
  carte_grise_url: string | null;
  police_id: string | null;
  num_police: string | null;
  num_attestation: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface DevisWithVehicule extends DevisAssurance {
  vehicules: Vehicule | null;
}

export interface Vehicule {
  id: string;
  user_id: string | null;
  immatriculation: string;
  type: VehiculeType | null;
  numero_chassis: string | null;
  marque: string | null;
  modele: string | null;
  annee: number | null;
  description: string | null;
  prix_achat: number | null;
  genre: string | null;
  energie: string | null;
  puissance_fiscale: number | null;
  nombre_places: number | null;
  carte_grise_url: string | null;
  photos_urls: string[] | null;
  created_at: string;
}

export interface AssuranceClient {
  id: string;
  vehicule_id: string | null;
  num_client_gestassur: string | null;
  nom: string | null;
  prenoms: string | null;
  adresse: string | null;
  cellulaire: string | null;
  point_vente_code: string | null;
  point_vente_nom: string | null;
  created_at: string;
}

export interface Police {
  id: string;
  vehicule_id: string | null;
  assurance_client_id: string | null;
  num_police: string;
  num_facture: string | null;
  num_avenant: string | null;
  type_mouvement: string | null;
  categorie: string | null;
  date_emission: string | null;
  date_effet: string | null;
  date_expiration: string;
  prime_nette: number | null;
  accessoire: number | null;
  fga: number | null;
  tca: number | null;
  prime_ttc: number | null;
  statut: "active" | "expiree" | "resiliee";
  statut_paiement_askia: StatutPaiementAskia | null;
  avis_recette_url: string | null;
  commission_autoteranga: number | null;
  source_plateforme: boolean | null;
  date_souscription: string | null;
  created_at: string;
}

export interface AssuranceTransaction {
  id: string;
  police_id: string | null;
  devis_id: string | null;
  montant_prime: number;
  moyen_paiement: MoyenPaiement;
  reference_paiement: string | null;
  statut: AssuranceTransactionStatut;
  created_at: string;
}

export interface MarketplaceTransaction {
  id: string;
  profile_id: string | null;
  montant: number;
  type_operation: string | null;
  reference_paiement: string | null;
  statut: string;
  created_at: string;
}

export interface BordereauReglement {
  id: string;
  mois: number;
  annee: number;
  total_primes: number;
  total_commission: number;
  statut: BordereauStatut;
  avis_recette_url: string | null;
  created_at: string;
  created_by: string | null;
}

export interface BordereauLigne {
  id: string;
  bordereau_id: string;
  police_id: string | null;
  n_police: string;
  immatriculation: string;
  montant_prime: number;
  commission: number;
  date_souscription: string | null;
  moyen_paiement: MoyenPaiement | null;
}

export interface BordereauWithLignes extends BordereauReglement {
  bordereau_lignes: BordereauLigne[];
}

export interface PoliceDocument {
  id: string;
  police_id: string | null;
  type_document: DocumentType | null;
  num_attestation: string | null;
  cle_securite: string | null;
  fichier_url: string;
  fichier_hash: string | null;
  diotali_url: string | null;
  qr_code_data: string | null;
  created_at: string;
}

export interface VueExpirationProchaine {
  id: string;
  immatriculation: string;
  nom: string | null;
  num_police: string;
  num_attestation: string | null;
  date_expiration: string;
  jours_restants: number;
}

export interface PoliceWithRelations extends Police {
  vehicules: Vehicule | null;
  assurance_clients: AssuranceClient | null;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      vehicules: {
        Row: Vehicule;
        Insert: Partial<Vehicule>;
        Update: Partial<Vehicule>;
        Relationships: [];
      };
      assurance_clients: {
        Row: AssuranceClient;
        Insert: Partial<AssuranceClient>;
        Update: Partial<AssuranceClient>;
        Relationships: [];
      };
      polices: {
        Row: Police;
        Insert: Partial<Police>;
        Update: Partial<Police>;
        Relationships: [];
      };
      police_documents: {
        Row: PoliceDocument;
        Insert: Partial<PoliceDocument>;
        Update: Partial<PoliceDocument>;
        Relationships: [];
      };
      assurance_transactions: {
        Row: AssuranceTransaction;
        Insert: Partial<AssuranceTransaction>;
        Update: Partial<AssuranceTransaction>;
        Relationships: [];
      };
      marketplace_transactions: {
        Row: MarketplaceTransaction;
        Insert: Partial<MarketplaceTransaction>;
        Update: Partial<MarketplaceTransaction>;
        Relationships: [];
      };
      bordereaux_reglement: {
        Row: BordereauReglement;
        Insert: Partial<BordereauReglement>;
        Update: Partial<BordereauReglement>;
        Relationships: [];
      };
      bordereau_lignes: {
        Row: BordereauLigne;
        Insert: Partial<BordereauLigne>;
        Update: Partial<BordereauLigne>;
        Relationships: [];
      };
      devis_assurance: {
        Row: DevisAssurance;
        Insert: Partial<DevisAssurance>;
        Update: Partial<DevisAssurance>;
        Relationships: [];
      };
    };
    Views: {
      vue_expirations_prochaines: {
        Row: VueExpirationProchaine;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
