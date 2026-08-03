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
          Saisissez l&apos;immatriculation sénégalaise (ex. AA-617-SE) et
          téléversez la carte grise.
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="immatriculation">Immatriculation</Label>
              <Input
                id="immatriculation"
                name="immatriculation"
                placeholder="AA-617-SE"
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
            <Label htmlFor="carte_grise">Carte grise (PDF ou image)</Label>
            <Input
              id="carte_grise"
              name="carte_grise"
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              required
              disabled={isPending}
            />
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
