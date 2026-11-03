import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import { t } from '@/i18n';
import type { EventRow } from '@/types/database';
import type { EventItem } from '@/types/domain';

export async function fetchEvents(userId: string | null): Promise<EventItem[]> {
  const rows = unwrap(await supabase.from('events').select('*').order('event_date', { ascending: false }), t('events.err.load')) as EventRow[];
  let mine = new Set<string>();
  if (userId) {
    const joined = unwrap(
      await supabase.from('event_participants').select('event_id').eq('user_id', userId),
      t('events.err.joined'),
    ) as { event_id: string }[];
    mine = new Set(joined.map((j) => j.event_id));
  }
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    location: r.location,
    eventDate: r.event_date,
    imageUrl: r.image_url,
    isParticipating: mine.has(r.id),
  }));
}

export async function setParticipation(userId: string, eventId: string, participate: boolean): Promise<void> {
  if (participate) {
    unwrap(
      await supabase.from('event_participants').upsert({ user_id: userId, event_id: eventId }, { onConflict: 'event_id,user_id', ignoreDuplicates: true }),
      t('events.err.join'),
    );
  } else {
    unwrap(
      await supabase.from('event_participants').delete().eq('user_id', userId).eq('event_id', eventId),
      t('events.err.leave'),
    );
  }
}
