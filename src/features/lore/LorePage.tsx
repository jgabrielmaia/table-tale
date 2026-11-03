import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { LoreCollection, LoreLocked } from '@/components/identity/LoreCollection';
import { FactionPanel } from '@/components/lore/FactionPanel';
import { LoreTimeline } from '@/components/lore/LoreTimeline';
import { Emblem, EmblemPaths, Scenery } from '@/components/layout/Brand';
import { Sidebar } from '@/components/layout/Sidebar';
import { BrandSymbol, ErrorState, LoadingState } from '@/components/ui';
import { useFate } from '@/hooks/useFate';
import { useLore } from '@/hooks/useLore';
import { localizeFaction, useI18n } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { SYMBOLS, isSymbolName } from '@/lib/symbols';
import type { Faction } from '@/types/domain';

function BalanceFigure({ arcanos, elementais }: { arcanos: Faction; elementais: Faction }) {
  const { t, content } = useI18n();
  const medal = (f: Faction, cx: number) => (
    <g key={f.slug}>
      <circle cx={cx} cy={100} r={50} fill="#0B1E2D" stroke={f.color} strokeWidth={2} />
      <circle cx={cx} cy={100} r={42} fill="none" stroke={f.color} strokeOpacity={0.35} strokeDasharray="2 5" />
      <g
        transform={`translate(${cx - 24} 76)`}
        fill="none"
        stroke={f.color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: isSymbolName(f.symbol) ? SYMBOLS[f.symbol] : SYMBOLS.star }}
      />
      <text x={cx} y={180} textAnchor="middle" className="balance-name" fill={f.color}>{f.name}</text>
      <text x={cx} y={198} textAnchor="middle" className="balance-sub">
        {f.lore.priorities.replace(/\.$/, '').split(', ').map((w, i) => (
          <tspan key={w} x={cx} dy={i ? 13 : 0}>{w}</tspan>
        ))}
      </text>
    </g>
  );
  return (
    <figure className="balance">
      <svg viewBox="0 0 440 220" role="img" aria-labelledby="balance-title balance-desc">
        <title id="balance-title">{t('lore.balanceTitle')}</title>
        <desc id="balance-desc">
          {t('lore.balanceDesc', { arcanos: arcanos.lore.priorities.toLowerCase(), elementais: elementais.lore.priorities.toLowerCase() })}
        </desc>
        <path d="M115 100 H325" stroke="#D4A85A" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 6" />
        {medal(arcanos, 75)}
        {medal(elementais, 365)}
        <circle cx={220} cy={100} r={40} fill="#07131d" stroke="#D4A85A" strokeOpacity={0.7} />
        <svg x={188} y={68} width={64} height={64} viewBox="0 0 64 64"><EmblemPaths /></svg>
        <text x={220} y={165} textAnchor="middle" className="balance-sub">{t('lore.neutralBack')}</text>
      </svg>
      <figcaption>{content.lore.neutral}</figcaption>
    </figure>
  );
}

export function LorePage() {
  const { t, content } = useI18n();
  const L = content.lore;
  const { data, isLoading, isError, error, refetch } = useLore();
  const fate = useFate();

  const arcanosRaw = data?.factions.find((f) => f.slug === 'arcanos');
  const elementaisRaw = data?.factions.find((f) => f.slug === 'elementais');
  const arcanos = arcanosRaw ? localizeFaction(arcanosRaw) : undefined;
  const elementais = elementaisRaw ? localizeFaction(elementaisRaw) : undefined;

  return (
    <>
      <section className="hero hero-lore">
        <Scenery />
        <div className="container hero-lore-inner">
          <div className="hero-lore-emblem"><Emblem /></div>
          <p className="eyebrow eyebrow-light">{L.intro.title}</p>
          <h1>{t('nav.lore')}</h1>
          <p className="lead">{L.intro.text}</p>
          <p className="hero-note">{L.intro.note}</p>
        </div>
      </section>

      {isLoading ? (
        <div className="container section"><LoadingState label={t('lore.loading')} /></div>
      ) : isError || !arcanos || !elementais ? (
        <div className="container section">
          <ErrorState message={isError ? errorMessage(error) : t('lore.notLoaded')} onRetry={() => void refetch()} />
        </div>
      ) : (
        <div className="container lore-layout">
          <Sidebar label={t('lore.chaptersLabel')} items={L.chapters} />

          <div className="lore-content">
            <section id="identidade" className="lore-section" aria-labelledby="identidade-title">
              <p className="eyebrow">{t('lore.chapter', { n: 'I' })}</p>
              <h2 id="identidade-title">{t('lore.identityTitle')}</h2>
              <p className="section-intro">{L.choice.intro}</p>
              <blockquote className="central-question"><p>{L.choice.question}</p></blockquote>
              <div className="choice-grid">
                {[arcanos, elementais].map((f) => (
                  <article key={f.slug} className="choice-card" style={{ '--c': f.color } as CSSProperties} aria-labelledby={`choice-${f.slug}`}>
                    <span className="faction-sigil faction-sigil-sm"><BrandSymbol name={f.symbol} /></span>
                    <h3 id={`choice-${f.slug}`}>{t('lore.chooseIf', { name: f.name })}</h3>
                    <ul>{f.lore.chooseIf.map((c) => <li key={c}>{c}</li>)}</ul>
                    <p className="choice-latin" lang="la">{f.lore.latin}</p>
                  </article>
                ))}
              </div>
              <p className="muted center">{L.choice.answer}</p>

              {fate.state === 'loading' ? (
                <LoadingState label={t('common.loading')} />
              ) : fate.active ? (
                <LoreCollection active={fate.active} history={fate.history} />
              ) : (
                <LoreLocked history={fate.history} />
              )}
            </section>

            <section id="premissa" className="lore-section" aria-labelledby="premissa-title">
              <p className="eyebrow">{t('lore.chapter', { n: 'II' })}</p>
              <h2 id="premissa-title">{t('lore.premiseTitle')}</h2>
              <div className="origin-grid">
                <div className="prose">
                  <p className="dropcap">{L.premise[0]}</p>
                  <p>{L.premise[1]}</p>
                  <ul className="priorities" role="list">
                    {[arcanos, elementais].map((f) => (
                      <li key={f.slug} style={{ '--c': f.color } as CSSProperties}>
                        <strong>{f.name}:</strong> {f.lore.priorities.toLowerCase()}
                      </li>
                    ))}
                  </ul>
                  <p>{L.premise[2]}</p>
                  <p>{L.premise[3]}</p>
                </div>
                <BalanceFigure arcanos={arcanos} elementais={elementais} />
              </div>
              <h3 className="sub-title">{t('lore.readingPath')}</h3>
              <LoreTimeline label={t('lore.readingPathLabel')} steps={L.timeline.map((s, i) => ({ id: `t${i + 1}`, ...s }))} />
            </section>

            <FactionPanel faction={arcanos} chapter="III" />
            <FactionPanel faction={elementais} chapter="IV" />

            <section id="tensao" className="lore-section" aria-labelledby="tensao-title">
              <p className="eyebrow">{t('lore.chapter', { n: 'V' })}</p>
              <h2 id="tensao-title">{t('lore.tensionTitle')}</h2>
              <div className="prose">{L.tension.intro.map((p) => <p key={p}>{p}</p>)}</div>
              <div className="tension-wrap">
                <table className="tension-table" style={{ '--ca': arcanos.color, '--ce': elementais.color } as CSSProperties}>
                  <caption className="sr-only">{t('lore.tensionCaption')}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t('lore.tensionQuestion')}</th>
                      <th scope="col" className="t-arc"><BrandSymbol name={arcanos.symbol} />{t('lore.tensionArc')}</th>
                      <th scope="col" className="t-ele"><BrandSymbol name={elementais.symbol} />{t('lore.tensionEle')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {L.tension.rows.map(([q, a, e]) => (
                      <tr key={q}><th scope="row">{q}</th><td className="t-arc">{a}</td><td className="t-ele">{e}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="callout">{L.tension.outro}</p>

              <h3 className="sub-title">{t('lore.balanceHeading')}</h3>
              <p className="section-intro">{L.balance.lead}</p>
              <div className="without-grid">
                {[arcanos, elementais].map((f) => (
                  <p key={f.slug} className="without-card" style={{ '--c': f.color } as CSSProperties}>
                    <BrandSymbol name={f.symbol} />
                    <span>{f.slug === 'arcanos' ? L.balance.without.arcanos : L.balance.without.elementais}</span>
                  </p>
                ))}
              </div>
              <blockquote className="principle principle-neutral"><p>{L.balance.warning}</p></blockquote>
              <p className="muted">{L.balance.closing}</p>
            </section>

            <div className="lore-cta">
              <div>
                <p className="cta-title">{L.outro.title}</p>
                <p className="cta-text">{L.outro.text}</p>
              </div>
              <Link className="btn btn-primary" to="/library">{t('lore.exploreLibrary')}</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
