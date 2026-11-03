import { useId, useState, type CSSProperties } from 'react';
import { BrandSymbol } from '@/components/ui';
import type { LoreEntity } from '@/types/domain';

export interface LoreEntityCardProps {
  entity: LoreEntity;
  kicker: string;
  headingLevel?: 3 | 4;
}

/** Shared card for Arcanos and Elementais: symbol, colour, short text and expandable long text. */
export function LoreEntityCard({ entity, kicker, headingLevel = 4 }: LoreEntityCardProps) {
  const [open, setOpen] = useState(false);
  const storyId = useId();
  const Heading = headingLevel === 3 ? 'h3' : 'h4';
  return (
    <li className="lore-card element-card" style={{ '--c': entity.color } as CSSProperties}>
      {entity.imageUrl ? (
        <img src={entity.imageUrl} alt={`Ilustração de ${entity.name}`} className="mb-3 h-24 w-24 rounded-full object-cover" loading="lazy" />
      ) : (
        <span className="lore-symbol"><BrandSymbol name={entity.symbol} /></span>
      )}
      <p className="lore-kicker mt-3">{kicker}</p>
      <Heading>{entity.name}</Heading>
      <p className="lore-color"><span className="swatch" aria-hidden="true" />{entity.color.toUpperCase()}</p>
      <p className="element-keys">{entity.description}</p>
      {entity.longDescription && (
        <>
          <button type="button" className="btn-link mt-2" aria-expanded={open} aria-controls={storyId} onClick={() => setOpen((v) => !v)}>
            {open ? 'Recolher' : 'Ler mais'}
          </button>
          <div id={storyId} className="lore-story text-left" hidden={!open}>
            <p>{entity.longDescription}</p>
          </div>
        </>
      )}
    </li>
  );
}
