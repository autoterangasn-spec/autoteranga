"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { createVehicule } from "@/app/actions/vehicules";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VehiculeType } from "@/lib/vehicules";

export function VehiculeForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<VehiculeType>("auto");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    formData.set("type", type);

    startTransition(async () => {
      const result = await createVehicule(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccess("Véhicule enregistré avec succès.");
      formRef.current?.reset();
      setType("auto");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enregistrer un véhicule</CardTitle>
        <CardDescription>
          Pour une annonce de vente ou de location, renseignez marque, modèle,
          année et photos — la carte grise n&apos;est pas obligatoire. Pour une
          souscription assurance, la carte grise vous sera demandée à
          l&apos;étape devis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="marque">Marque</Label>
              <Input
                id="marque"
                name="marque"
                placeholder="Toyota"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modele">Modèle</Label>
              <Input
                id="modele"
                name="modele"
                placeholder="Prado Land Cruiser"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annee">Année</Label>
              <Input
                id="annee"
                name="annee"
                type="number"
                min={1980}
                max={2030}
                step={1}
                placeholder="2019"
                pattern="\d{4}"
                title="Année à 4 chiffres (1980–2030)"
                required
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="immatriculation">Immatriculation</Label>
              <Input
                id="immatriculation"
                name="immatriculation"
                placeholder="AA-617-SE ou DK-8967-BG"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicule-type">Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as VehiculeType)}
                disabled={isPending}
              >
                <SelectTrigger id="vehicule-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automobile</SelectItem>
                  <SelectItem value="moto">Moto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Diesel manuel climatisé, 4 cylindres, en bon état…"
              disabled={isPending}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prix_achat">Prix (FCFA, optionnel)</Label>
            <Input
              id="prix_achat"
              name="prix_achat"
              type="number"
              min={0}
              step={1}
              placeholder="12000000"
              disabled={isPending}
            />
            <p className="text-sm text-muted-foreground">
              Indiquez le prix de vente ou de location mensuelle pour votre
              annonce.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos">Photos du véhicule</Label>
            <Input
              id="photos"
              name="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={isPending}
            />
            <p className="text-sm text-muted-foreground">
              Ajoutez une ou plusieurs photos (JPEG, PNG ou WebP, max 5 Mo
              chacune). Recommandé pour les annonces vente/location — comme sur
              Facebook Marketplace.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="carte_grise">
              Carte grise (optionnel — requis uniquement pour la souscription
              assurance)
            </Label>
            <Input
              id="carte_grise"
              name="carte_grise"
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              disabled={isPending}
            />
            <p className="text-sm text-muted-foreground">
              Vous pouvez publier une annonce sans carte grise : les photos
              suffisent pour la vente ou la location. La carte grise ne sera
              demandée que lors de la souscription assurance (étape devis).
            </p>
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enregistrer le véhicule
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
