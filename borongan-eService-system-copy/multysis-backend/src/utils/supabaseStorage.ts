import { getSupabase, ESERVICE_BUCKET } from '../config/supabase';

/**
 * Upload a buffer to Supabase Storage and return the public URL.
 */
export async function uploadToSupabase(
  buffer: Buffer,
  storagePath: string,
  contentType: string
): Promise<string> {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(ESERVICE_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(ESERVICE_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Delete a single file from Supabase Storage given its public URL.
 */
export async function deleteFromSupabase(publicUrl: string): Promise<void> {
  const storagePath = extractStoragePath(publicUrl);
  if (!storagePath) return;

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(ESERVICE_BUCKET).remove([storagePath]);
  if (error) console.error(`Supabase delete failed: ${error.message}`);
}

/**
 * Delete multiple files from Supabase Storage given their public URLs.
 */
export async function deleteMultipleFromSupabase(publicUrls: string[]): Promise<void> {
  const paths = publicUrls
    .map(extractStoragePath)
    .filter((p): p is string => p !== null);

  if (paths.length === 0) return;

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(ESERVICE_BUCKET).remove(paths);
  if (error) console.error(`Supabase batch delete failed: ${error.message}`);
}

/**
 * Extract the storage path from a Supabase public URL.
 */
function extractStoragePath(publicUrl: string): string | null {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${ESERVICE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
