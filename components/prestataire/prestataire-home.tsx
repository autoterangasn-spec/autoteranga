"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface PrestataireHomeProps {
  userEmail?: string | null;
}

export function PrestataireHome({ userEmail }: PrestataireHomeProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="h-6 w-6" />
          </div>
          <CardTitle>Espace prestataire</CardTitle>
          <CardDescription>
            Bienvenue{userEmail ? `, ${userEmail}` : ""}. Cet espace sera
            disponible prochainement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3">
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
          <Button variant="link" asChild>
            <Link href="/login">Retour à la connexion</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
