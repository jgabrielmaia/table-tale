import { BrandSymbol } from '@/components/ui';

export interface LoreTimelineStep {
  id: string;
  marker: string;
  title: string;
  text: string;
  symbol: string;
}

/** Ordered reading path. Used for the S1 narrative arc (it does not invent historical events). */
export function LoreTimeline({ steps, label }: { steps: LoreTimelineStep[]; label: string }) {
  return (
    <ol className="timeline" aria-label={label}>
      {steps.map((step) => (
        <li key={step.id} className="timeline-item">
          <span className="timeline-marker"><BrandSymbol name={step.symbol} /></span>
          <div className="timeline-body">
            <p className="timeline-era">{step.marker}</p>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
