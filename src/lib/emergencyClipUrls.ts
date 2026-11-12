import { supabase } from '@/integrations/supabase/client';

export const EMERGENCY_BUCKET = 'emergency-streams';
/** Short lifetime so deleting a recording revokes shared links quickly. */
export const EMERGENCY_SIGNED_URL_EXPIRY = 3600; // 1 hour

/** Accepts a stored storage path or a legacy signed URL and returns the storage path. */
export function clipStoragePath(stored: string): string {
  const m = stored.match(/\/storage\/v1\/object\/sign\/emergency-streams\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : stored;
}

export async function signClipUrl(stored: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(EMERGENCY_BUCKET)
    .createSignedUrl(clipStoragePath(stored), EMERGENCY_SIGNED_URL_EXPIRY);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Replace stored paths with fresh short-lived signed URLs. */
export async function withFreshClipUrls<T extends { video_url: string }>(clips: T[]): Promise<T[]> {
  return Promise.all(
    clips.map(async (c) => ({ ...c, video_url: (await signClipUrl(c.video_url)) ?? '' })),
  );
}
