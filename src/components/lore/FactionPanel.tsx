import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { BrandSymbol } from '@/components/ui';
import { t } from '@/i18n';
import type { Faction } from '@/types/domain';

export interface FactionPanelProps {
  faction: Faction;
  chapter: string;
  children?: ReactNode;
}

/** Full presentation of a faction from the S1 source of truth. */
export function FactionPanel({ faction, chapter, children }: FactionPanelProps) {
  const [open, setOpen] = useState(false);
  const storyId = useId();
  const { lore } = faction;
  const [lead, ...more] = lore.worldview;
  const style = { '--c': faction.color, '--c2': lore.color2 } as CSSProperties;

  return (
    <section id={faction.slug} className="lore-section faction" style={style} aria-labelledby={`${faction.slug}-title`}>
      <p className="eyebrow">{t('lore.chapter', { n: chapter })}</p>
      <header className="faction-hero">
        <span className="faction-sigil"><BrandSymbol name={faction.symbol} /></span>
        <div>
          <h2 id={`${faction.slug}-title`}>{t('lore.factionTitle', { name: faction.name })}</h2>
          <p className="faction-motto">{lore.motto}</p>
          <p className="faction-latin"><span lang="la">{lore.latin}</span> — {lore.latinMeaning}</p>
        </div>
      </header>
      <ul className="keyword-list" role="list" aria-label={t('lore.keywords')}>
        {lore.keywords.map((k) => <li key={k}>{k}</li>)}
      </ul>

      <h3 className="sub-title">{t('lore.worldview')}</h3>
      <div className="prose">{lead && <p>{lead}</p>}</div>
      <button type="button" className="btn-link" aria-expanded={open} aria-controls={storyId} onClick={() => setOpen((v) => !v)}>
        {open ? t('lore.collapse') : t('lore.readMore')}
      </button>
      <div className="lore-story" id={storyId} hidden={!open}>
        {more.map((p) => <p key={p}>{p}</p>)}
        <p className="story-label">{t('lore.personality')}</p>
        {lore.personality.map((p) => <p key={p}>{p}</p>)}
      </div>

      <h3 className="sub-title">{t('lore.values')}</h3>
      <ul className="value-grid" role="list">
        {lore.values.map(([name, text]) => (
          <li key={name} className="value-card"><h4>{name}</h4><p>{text}</p></li>
        ))}
      </ul>

      <h3 className="sub-title">{t('lore.virtues')}</h3>
      <ul className="vr-list" role="list">
        {lore.tensions.map(([virtue, risk]) => (
          <li key={virtue}>
            <p className="vr-virtue"><span>{t('lore.virtue')}</span>{virtue}</p>
            <p className="vr-risk"><span>{t('lore.risk')}</span>{risk}</p>
          </li>
        ))}
      </ul>

      <blockquote className="principle">
        <p>{lore.principle}</p>
        <footer>{t('lore.principle', { member: lore.member })}</footer>
      </blockquote>

      <div className="visual-id">
        <h3 className="sub-title">{t('lore.visual')}</h3>
        <ul className="palette" role="list">
          {lore.visual.palette.map(([color, name]) => (
            <li key={name}><span className="swatch-lg" style={{ '--sw': color } as CSSProperties} aria-hidden="true" />{name}</li>
          ))}
        </ul>
        <dl className="lore-traits">
          <div><dt>{t('lore.language')}</dt><dd>{lore.visual.language}</dd></div>
          <div><dt>{t('lore.feeling')}</dt><dd>{lore.visual.feeling}</dd></div>
        </dl>
      </div>
      {children}
    </section>
  );
}
