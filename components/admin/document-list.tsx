import { DiotaliQr } from "@/components/admin/diotali-qr";
import { DocumentActions } from "@/components/admin/document-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PoliceDocument } from "@/lib/types/database";

const DOCUMENT_LABELS: Record<string, string> = {
  attestation: "Attestation d'assurance",
  conditions_particulieres: "Conditions particulières",
  quittance: "Quittance",
  facture: "Facture",
};

interface DocumentListProps {
  documents: PoliceDocument[];
  numPolice: string;
}

function getDocumentLabel(doc: PoliceDocument): string {
  if (doc.type_document) {
    return DOCUMENT_LABELS[doc.type_document] ?? doc.type_document;
  }
  return doc.fichier_url.split("/").pop() ?? "Document";
}

export function DocumentList({ documents, numPolice }: DocumentListProps) {
  const attestation = documents.find(
    (doc) => doc.type_document === "attestation"
  );

  return (
    <div className="space-y-6">
      {attestation?.diotali_url && attestation.num_attestation && (
        <DiotaliQr
          diotaliUrl={attestation.diotali_url}
          numAttestation={attestation.num_attestation}
        />
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Fichier</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucun document associé à cette police.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {getDocumentLabel(doc)}
                    {doc.num_attestation && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {doc.num_attestation}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                    {doc.fichier_url.split("/").pop()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DocumentActions
                      fichierUrl={doc.fichier_url}
                      documentLabel={getDocumentLabel(doc)}
                      numPolice={numPolice}
                      typeDocument={doc.type_document}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
