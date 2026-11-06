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
          <div className="timeline-body">
            <p className="timeline-era">
              <span>{step.marker}</span>
              <span className="timeline-marker" aria-hidden="true"><BrandSymbol name={step.symbol} /></span>
            </p>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
