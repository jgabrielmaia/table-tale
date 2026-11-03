import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { BrandSymbol } from '@/components/ui';
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
      <p className="eyebrow">Capítulo {chapter}</p>
      <header className="faction-hero">
        <span className="faction-sigil"><BrandSymbol name={faction.symbol} /></span>
        <div>
          <h2 id={`${faction.slug}-title`}>Os {faction.name}</h2>
          <p className="faction-motto">{lore.motto}</p>
          <p className="faction-latin"><span lang="la">{lore.latin}</span> — {lore.latinMeaning}</p>
        </div>
      </header>
      <ul className="keyword-list" role="list" aria-label="Palavras-chave">
        {lore.keywords.map((k) => <li key={k}>{k}</li>)}
      </ul>

      <h3 className="sub-title">Visão de mundo</h3>
      <div className="prose">{lead && <p>{lead}</p>}</div>
      <button type="button" className="btn-link" aria-expanded={open} aria-controls={storyId} onClick={() => setOpen((v) => !v)}>
        {open ? 'Recolher' : 'Ler a visão completa'}
      </button>
      <div className="lore-story" id={storyId} hidden={!open}>
        {more.map((p) => <p key={p}>{p}</p>)}
        <p className="story-label">Personalidade</p>
        {lore.personality.map((p) => <p key={p}>{p}</p>)}
      </div>

      <h3 className="sub-title">Valores centrais</h3>
      <ul className="value-grid" role="list">
        {lore.values.map(([name, text]) => (
          <li key={name} className="value-card"><h4>{name}</h4><p>{text}</p></li>
        ))}
      </ul>

      <h3 className="sub-title">Virtudes e contradições</h3>
      <ul className="vr-list" role="list">
        {lore.tensions.map(([virtue, risk]) => (
          <li key={virtue}>
            <p className="vr-virtue"><span>Virtude</span>{virtue}</p>
            <p className="vr-risk"><span>Risco</span>{risk}</p>
          </li>
        ))}
      </ul>

      <blockquote className="principle">
        <p>{lore.principle}</p>
        <footer>Princípio {lore.member}</footer>
      </blockquote>

      <div className="visual-id">
        <h3 className="sub-title">Expressão visual</h3>
        <ul className="palette" role="list">
          {lore.visual.palette.map(([color, name]) => (
            <li key={name}><span className="swatch-lg" style={{ '--sw': color } as CSSProperties} aria-hidden="true" />{name}</li>
          ))}
        </ul>
        <dl className="lore-traits">
          <div><dt>Linguagem</dt><dd>{lore.visual.language}</dd></div>
          <div><dt>Sensação</dt><dd>{lore.visual.feeling}</dd></div>
        </dl>
      </div>
      {children}
    </section>
  );
}
