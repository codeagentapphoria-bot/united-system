import { getSupabase, BIMS_BUCKET } from '../config/supabase.js';

/**
 * Upload a buffer to Supabase Storage and return the public URL.
 */
export async function uploadToSupabase(buffer, storagePath, contentType) {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(BIMS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BIMS_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Delete a single file from Supabase Storage given its public URL.
 */
export async function deleteFromSupabase(publicUrl) {
  const storagePath = extractStoragePath(publicUrl);
  if (!storagePath) return;

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BIMS_BUCKET).remove([storagePath]);
  if (error) console.error(`Supabase delete failed: ${error.message}`);
}

/**
 * Delete multiple files from Supabase Storage given their public URLs.
 */
export async function deleteMultipleFromSupabase(publicUrls) {
  const paths = publicUrls
    .map(extractStoragePath)
    .filter(Boolean);

  if (paths.length === 0) return;

  const supabase = getSupabase();
  const { error } = await supabase.storage.from(BIMS_BUCKET).remove(paths);
  if (error) console.error(`Supabase batch delete failed: ${error.message}`);
}

/**
 * Extract the storage path from a Supabase public URL.
 * e.g. https://xxx.supabase.co/storage/v1/object/public/bims-uploads/users/123-photo.jpg
 *   → users/123-photo.jpg
 */
function extractStoragePath(publicUrl) {
  if (!publicUrl) return null;
  const marker = `/storage/v1/object/public/${BIMS_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}
