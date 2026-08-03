"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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
import { createClient } from "@/lib/supabase/client";
import {
  getAuthCallbackUrl,
  getSupabaseConfigError,
} from "@/lib/supabase/env";
import { getProfileForAuthUser } from "@/lib/supabase/profile";
import { getRedirectPathForRole } from "@/lib/supabase/routing";
import type { UserRole } from "@/lib/types/database";

type AuthMode = "login" | "signup";

interface AuthFormProps {
  initialMode?: AuthMode;
}

export function AuthForm({ initialMode = "login" }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telephone, setTelephone] = useState("");
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [role, setRole] = useState<UserRole>("client");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() => {
    if (errorParam === "unauthorized") {
      return "Accès refusé pour cette zone.";
    }
    if (errorParam === "auth") {
      return "Erreur d'authentification. Veuillez réessayer.";
    }
    if (errorParam === "config") {
      return "Configuration Supabase manquante. Vérifiez les variables d'environnement.";
    }
    if (errorParam === "otp_expired") {
      return "Le lien de confirmation a expiré. Réinscrivez-vous ou demandez un nouvel email de confirmation.";
    }
    return null;
  });

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      const message = signInError?.message?.toLowerCase() ?? "";
      if (message.includes("invalid api key") || message.includes("api key")) {
        setError(
          "Clé Supabase invalide. Vérifiez NEXT_PUBLIC_SUPABASE_ANON_KEY."
        );
      } else {
        setError("Email ou mot de passe incorrect.");
      }
      setLoading(false);
      return;
    }

    const { profile, error: profileError } = await getProfileForAuthUser(
      supabase,
      data.user
    );

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError(
        profileError ??
          "Profil introuvable. Contactez le support ou réessayez après inscription."
      );
      setLoading(false);
      return;
    }

    const target = redirect ?? getRedirectPathForRole(profile.role);
    router.push(target);
    router.refresh();
  }

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!telephone.trim()) {
      setError("Le numéro de téléphone est obligatoire.");
      setLoading(false);
      return;
    }

    const configError = getSupabaseConfigError();
    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
        data: {
          telephone: telephone.trim(),
          nom: nom.trim() || null,
          prenoms: prenoms.trim() || null,
          role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError("Inscription impossible. Réessayez.");
      setLoading(false);
      return;
    }

    if (data.session) {
      const { profile, error: profileError } = await getProfileForAuthUser(
        supabase,
        data.user
      );

      if (profileError || !profile) {
        const { error: insertError } = await supabase.from("profiles").insert({
          auth_user_id: data.user.id,
          email: data.user.email,
          telephone: telephone.trim(),
          nom: nom.trim() || null,
          prenoms: prenoms.trim() || null,
          role,
        });

        if (insertError) {
          setError(
            `Profil non créé : ${insertError.message}. Exécutez supabase/sprint1-client-vehicules.sql.`
          );
          setLoading(false);
          return;
        }
      }

      router.push(getRedirectPathForRole(role));
      router.refresh();
      return;
    }

    setSuccess(
      "Compte créé. Vérifiez votre email pour confirmer l'inscription, puis connectez-vous."
    );
    setLoading(false);
    setMode("login");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Autoteranga</CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Connectez-vous pour accéder à votre espace."
            : "Créez votre compte client ou prestataire."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 flex rounded-lg border p-1">
          <Button
            type="button"
            variant={mode === "login" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccess(null);
            }}
          >
            Connexion
          </Button>
          <Button
            type="button"
            variant={mode === "signup" ? "default" : "ghost"}
            className="flex-1"
            onClick={() => {
              setMode("signup");
              setError(null);
              setSuccess(null);
            }}
          >
            Inscription
          </Button>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="space-y-4"
        >
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

          {mode === "signup" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    autoComplete="family-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prenoms">Prénom(s)</Label>
                  <Input
                    id="prenoms"
                    value={prenoms}
                    onChange={(e) => setPrenoms(e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  type="tel"
                  placeholder="+221 77 123 45 67"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  required
                  autoComplete="tel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Type de compte</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as UserRole)}
                >
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="prestataire">Prestataire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        {mode === "login" && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode("signup")}
            >
              S&apos;inscrire
            </button>
            {" · "}
            <Link
              href="/inscription"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Page inscription
            </Link>
          </p>
        )}

        {mode === "signup" && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Se connecter
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
