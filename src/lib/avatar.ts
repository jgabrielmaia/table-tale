import type { User } from '@supabase/supabase-js';

const asHttps = (v: unknown): string | null => (typeof v === 'string' && v.startsWith('https://') && v.length <= 2048 ? v : null);

function fromMeta(meta: Record<string, unknown> | null | undefined): string | null {
  if (!meta) return null;
  const picture = meta.picture;
  const nested = typeof picture === 'object' && picture !== null ? ((picture as { data?: { url?: unknown } }).data?.url) : undefined;
  return asHttps(meta.avatar_url) ?? asHttps(picture) ?? asHttps(nested);
}

/** Profile picture supplied by the sign-in provider (Google, GitHub, ...), if any. */
export function providerAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null;
  const fromIdentities = (user.identities ?? []).map((i) => fromMeta(i.identity_data)).find(Boolean) ?? null;
  return fromMeta(user.user_metadata) ?? fromIdentities;
}
