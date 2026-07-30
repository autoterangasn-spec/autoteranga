export type UserRole = "client" | "prestataire" | "admin";

export type DocumentType =
  | "conditions_particulieres"
  | "quittance"
  | "facture"
  | "attestation";

export interface Profile {
  id: string;
  auth_user_id: string | null;
  telephone: string;
  nom: string | null;
  prenoms: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
}

export interface Vehicule {
  id: string;
  user_id: string | null;
  immatriculation: string;
  numero_chassis: string | null;
  marque: string | null;
  modele: string | null;
  genre: string | null;
  energie: string | null;
  puissance_fiscale: number | null;
  nombre_places: number | null;
  carte_grise_url: string | null;
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
  created_at: string;
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
