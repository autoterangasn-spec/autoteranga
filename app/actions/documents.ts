"use server";

import { createClient } from "@/lib/supabase/server";
import {
  buildStoragePathCandidates,
  normalizeStoragePath,
  scoreFilenameMatch,
} from "@/lib/utils";

const BUCKET = "polices-documents";

async function trySignedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  return null;
}

async function resolveStoragePath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fichierUrl: string,
  numPolice: string,
  typeDocument?: string | null
): Promise<string | null> {
  const candidates = buildStoragePathCandidates(fichierUrl, numPolice);

  for (const path of candidates) {
    const url = await trySignedUrl(supabase, path);
    if (url) return path;
  }

  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(numPolice);

  if (listError || !files?.length) {
    return null;
  }

  const referenceName =
    normalizeStoragePath(fichierUrl).split("/").pop() ?? fichierUrl;

  let bestPath: string | null = null;
  let bestScore = 0;

  for (const file of files) {
    if (!file.name || file.name.endsWith("/")) continue;

    const score = scoreFilenameMatch(file.name, referenceName, typeDocument);
    if (score > bestScore) {
      bestScore = score;
      bestPath = `${numPolice}/${file.name}`;
    }
  }

  if (bestPath && bestScore >= 60) {
    return bestPath;
  }

  return null;
}

export async function getSignedDocumentUrl(
  fichierUrl: string,
  numPolice?: string,
  typeDocument?: string | null
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { url: null, error: "Session expirée. Reconnectez-vous." };
  }

  if (!numPolice) {
    return { url: null, error: "Numéro de police manquant." };
  }

  const resolvedPath = await resolveStoragePath(
    supabase,
    fichierUrl,
    numPolice,
    typeDocument
  );

  if (!resolvedPath) {
    return {
      url: null,
      error: `Fichier introuvable dans ${BUCKET}/${numPolice}/`,
    };
  }

  const url = await trySignedUrl(supabase, resolvedPath);

  if (!url) {
    return {
      url: null,
      error: "Accès refusé au storage. Exécutez supabase/storage-policies.sql",
    };
  }

  return { url, error: null };
}
