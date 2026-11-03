import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
}

/** WAI-ARIA tabs with roving focus (←/→, Home, End). */
export function Tabs({ items, value, onChange, label }: TabsProps) {
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const target = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    const item = items[target];
    if (!item) return;
    onChange(item.id);
    refs.current[target]?.focus();
  };

  const active = items.find((i) => i.id === value) ?? items[0];

  return (
    <div>
      <div className="tabs-list" role="tablist" aria-label={label}>
        {items.map((item, index) => (
          <button
            key={item.id}
            ref={(el) => { refs.current[index] = el; }}
            id={`${baseId}-tab-${item.id}`}
            className="tabs-trigger"
            role="tab"
            type="button"
            aria-selected={item.id === active?.id}
            aria-controls={`${baseId}-panel-${item.id}`}
            tabIndex={item.id === active?.id ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {active && (
        <div role="tabpanel" id={`${baseId}-panel-${active.id}`} aria-labelledby={`${baseId}-tab-${active.id}`} tabIndex={0} className="mt-4">
          {active.content}
        </div>
      )}
    </div>
  );
}
