import { getMyVehicules } from "@/app/actions/vehicules";
import { VehiculeForm } from "@/components/client/vehicule-form";
import { VehiculeList } from "@/components/client/vehicule-list";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function ClientVehiculesPage() {
  const { data: vehicules, error } = await getMyVehicules();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes véhicules</h1>
        <p className="text-muted-foreground">
          Enregistrez vos véhicules pour publier une annonce vente/location ou
          préparer une souscription assurance.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Véhicules enregistrés</h2>
        <VehiculeList vehicules={vehicules ?? []} />
      </section>

      <VehiculeForm />
    </div>
  );
}
