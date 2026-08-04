"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, FileText, LayoutDashboard, LogOut, Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

interface ClientShellProps {
  children: React.ReactNode;
  userEmail?: string | null;
}

export function ClientShell({ children, userEmail }: ClientShellProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Autoteranga</p>
              <p className="text-xs text-muted-foreground">Espace client</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            <Button variant="ghost" asChild>
              <Link href="/client/vehicules" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Mes véhicules
              </Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/client/devis" className="gap-2">
                <FileText className="h-4 w-4" />
                Mes devis
              </Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userEmail}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-2 md:inline-flex"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/client/vehicules">Mes véhicules</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/client/devis">Mes devis</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
