import { getMyDevis } from "@/app/actions/devis";
import { DevisList } from "@/components/client/devis-list";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default async function ClientDevisPage() {
  const { data: devis, error } = await getMyDevis();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes devis assurance</h1>
        <p className="text-muted-foreground">
          Suivez l&apos;état de vos demandes de devis et souscriptions.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DevisList devis={devis ?? []} />
    </div>
  );
}
