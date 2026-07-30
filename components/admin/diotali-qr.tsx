"use client";

import QRCode from "react-qr-code";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DiotaliQrProps {
  diotaliUrl: string;
  numAttestation: string;
}

export function DiotaliQr({ diotaliUrl, numAttestation }: DiotaliQrProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg">Vérification QR Diotali</CardTitle>
        <CardDescription>
          Attestation {numAttestation} — scannez pour vérifier sur Diotali.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-lg bg-white p-4">
          <QRCode value={diotaliUrl} size={160} />
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-medium">URL Diotali</p>
          <a
            href={diotaliUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary hover:underline"
          >
            {diotaliUrl}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
