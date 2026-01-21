import type { SupabaseClient } from "npm:@supabase/supabase-js";

export async function ensureBucket(client: SupabaseClient, bucket: string) {
  const { data } = await client.storage.getBucket(bucket);
  if (data) return;
  const { error } = await client.storage.createBucket(bucket, { public: false });
  if (error && !error.message?.includes("already exists")) {
    throw new Error(`Failed to ensure bucket ${bucket}: ${error.message}`);
  }
}

export async function uploadToBucket(
  client: SupabaseClient,
  bucket: string,
  file: File,
  path: string,
) {
  await ensureBucket(client, bucket);
  const { error } = await client.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  const { data, error: signedError } = await client.storage.from(bucket).createSignedUrl(
    path,
    60 * 60 * 24 * 365,
  );
  if (signedError || !data?.signedUrl) {
    throw new Error(signedError?.message ?? "Failed to create signed URL");
  }
  return { path, url: data.signedUrl };
}

export async function signedUrlFromBucket(
  client: SupabaseClient,
  bucket: string,
  path: string,
) {
  await ensureBucket(client, bucket);
  const sanitizedPath = path.replace(/[\\]/g, "");
  const { data, error } = await client.storage.from(bucket).createSignedUrl(
    sanitizedPath,
    60 * 60 * 24 * 365,
  );
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Unable to sign URL");
  }
  return data.signedUrl;
}

export function sanitizeFileName(name: string) {
  const base = name?.split("/").pop()?.split("\\").pop() ?? "upload";
  return base.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-");
}
