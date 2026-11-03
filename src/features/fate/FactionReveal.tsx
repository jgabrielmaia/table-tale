import { FACTIONS, type FateCardData } from './cards';

interface PanelProps {
  card: FateCardData;
}

/** Screen 04: faction and individual card identity. */
export function FactionReveal({ card, onContinue }: PanelProps & { onContinue: () => void }) {
  const faction = FACTIONS[card.faction];
  return (
    <>
      <p className="fate-eyebrow">{card.numeral ? `${card.numeral} · ` : ''}{faction.name}</p>
      <h2 className="fate-card-title">{card.title}</h2>
      <h3 className="fate-headline">{faction.headline}</h3>
      <p className="fate-motto">{faction.motto}</p>
      <p className="fate-line">{faction.line}</p>
      <p className="fate-desc">{card.description}</p>
      <div className="fate-actions">
        <button type="button" className="fate-btn fate-btn--primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  );
}
