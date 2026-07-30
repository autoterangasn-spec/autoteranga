import type { Metadata } from "next";
import "./globals.css";

import { AuthHashHandler } from "@/components/auth/auth-hash-handler";

export const metadata: Metadata = {
  title: "Autoteranga Admin",
  description: "Dashboard admin — marketplace assurance auto Sénégal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthHashHandler />
        {children}
      </body>
    </html>
  );
}
