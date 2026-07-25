import { randomUUID } from "node:crypto";

import { serverEnv } from "./env";
import { extForImageType, type SniffedImageType } from "./magic-bytes";
import { supabaseAdmin } from "./supabase";

export interface StoredPhoto {
  path: string;
  signedUrl: string | null;
}

// Long enough for the team to act on the lead from the notification email.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Upload a sniffed transom photo to the private bucket and return a signed URL. */
export async function uploadQuotePhoto(
  bytes: Uint8Array,
  type: SniffedImageType,
): Promise<StoredPhoto> {
  const admin = supabaseAdmin();
  const bucket = serverEnv.storageBucket();
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${randomUUID()}.${extForImageType(type)}`;

  const { error } = await admin.storage.from(bucket).upload(path, bytes, {
    contentType: type,
    upsert: false,
  });
  if (error) throw new Error(`photo upload failed: ${error.message}`);

  const { data } = await admin.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return { path, signedUrl: data?.signedUrl ?? null };
}
