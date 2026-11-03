import { supabase } from '@/lib/supabase';
import { unwrap } from '@/lib/errors';
import { t } from '@/i18n';
import type { FactionRow, LoreEntityRow } from '@/types/database';
import type { Arcana, Elemental, Faction, FactionLore, LoreEntity, LoreLink } from '@/types/domain';

const EMPTY_LORE: FactionLore = {
  member: '', color2: '#D4A85A', motto: '', latin: '', latinMeaning: '', priorities: '', keywords: [], worldview: [],
  values: [], personality: [], tensions: [], principle: '', chooseIf: [], visual: { palette: [], language: '', feeling: '' },
};

const mapFaction = (r: FactionRow): Faction => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  symbol: r.symbol,
  color: r.color,
  lore: { ...EMPTY_LORE, ...(r.lore as Partial<FactionLore>) },
});

const mapEntity = (r: LoreEntityRow): LoreEntity => ({
  id: r.id,
  factionId: r.faction_id,
  name: r.name,
  slug: r.slug,
  description: r.description,
  longDescription: r.long_description,
  symbol: r.symbol,
  color: r.color,
  imageUrl: r.image_url,
});

export interface LoreData {
  factions: Faction[];
  arcanas: Arcana[];
  elementals: Elemental[];
  links: LoreLink[];
}

export async function fetchFactions(): Promise<Faction[]> {
  const rows = unwrap(await supabase.from('factions').select('*').order('slug'), t('lore.err.factions')) as FactionRow[];
  return rows.map(mapFaction);
}

export async function fetchLore(): Promise<LoreData> {
  const [factions, arcanas, elementals, links] = await Promise.all([
    fetchFactions(),
    supabase.from('arcanas').select('*').order('sort_order'),
    supabase.from('elementals').select('*').order('sort_order'),
    supabase.from('arcana_elemental_links').select('arcana_id,elemental_id,relation,description'),
  ]);
  return {
    factions,
    arcanas: (unwrap(arcanas, t('lore.err.arcanas')) as LoreEntityRow[]).map(mapEntity),
    elementals: (unwrap(elementals, t('lore.err.elementals')) as LoreEntityRow[]).map(mapEntity),
    links: (unwrap(links, t('lore.err.links')) as { arcana_id: string; elemental_id: string; relation: LoreLink['relation']; description: string }[]).map(
      (l) => ({ arcanaId: l.arcana_id, elementalId: l.elemental_id, relation: l.relation, description: l.description }),
    ),
  };
}
