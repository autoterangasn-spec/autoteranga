import { notFound } from "next/navigation";

import { getVehiculeForDevis } from "@/app/actions/devis";
import { DevisWizard } from "@/components/client/devis-wizard";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DevisPageProps {
  params: { id: string };
}

export default async function VehiculeDevisPage({ params }: DevisPageProps) {
  const { id } = params;
  const { data: vehicule, error } = await getVehiculeForDevis(id);

  if (error || !vehicule) {
    notFound();
  }

  if (!vehicule.type || !vehicule.annee) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Ce véhicule n&apos;a pas toutes les informations requises (type et
          année). Complétez la fiche véhicule avant de demander un devis.
        </AlertDescription>
      </Alert>
    );
  }

  return <DevisWizard vehicule={vehicule} />;
}
