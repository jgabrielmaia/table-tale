import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArcanaCard } from '@/components/lore/ArcanaCard';
import { ElementalCard } from '@/components/lore/ElementalCard';
import { FactionPanel } from '@/components/lore/FactionPanel';
import { LoreTimeline } from '@/components/lore/LoreTimeline';
import { Emblem, EmblemPaths, Scenery } from '@/components/layout/Brand';
import { Sidebar } from '@/components/layout/Sidebar';
import { BrandSymbol, Button, ButtonLink, ErrorState, Icon, LoadingState, useToast } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useLore } from '@/hooks/useLore';
import { useProfile } from '@/hooks/useProfile';
import { errorMessage } from '@/lib/errors';
import { SYMBOLS, isSymbolName } from '@/lib/symbols';
import type { Faction } from '@/types/domain';
import { loreContent as L } from './content';

function BalanceFigure({ arcanos, elementais }: { arcanos: Faction; elementais: Faction }) {
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
        <title id="balance-title">Duas filosofias, um mundo</title>
        <desc id="balance-desc">
          De um lado os Arcanos — {arcanos.lore.priorities.toLowerCase()} Do outro os Elementais — {elementais.lore.priorities.toLowerCase()} Ao centro, o emblema de Table Tale, que pertence igualmente a ambos.
        </desc>
        <path d="M115 100 H325" stroke="#D4A85A" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="4 6" />
        {medal(arcanos, 75)}
        {medal(elementais, 365)}
        <circle cx={220} cy={100} r={40} fill="#07131d" stroke="#D4A85A" strokeOpacity={0.7} />
        <svg x={188} y={68} width={64} height={64} viewBox="0 0 64 64"><EmblemPaths /></svg>
        <text x={220} y={165} textAnchor="middle" className="balance-sub">O verso neutro</text>
      </svg>
      <figcaption>{L.neutral}</figcaption>
    </figure>
  );
}

export function LorePage() {
  const { data, isLoading, isError, error, refetch } = useLore();
  const { user } = useAuth();
  const { profile, update } = useProfile();
  const { notify } = useToast();

  const arcanos = data?.factions.find((f) => f.slug === 'arcanos');
  const elementais = data?.factions.find((f) => f.slug === 'elementais');
  const myFaction = profile.data?.factionId ?? null;

  const choose = (faction: Faction) =>
    update.mutate(
      { factionId: faction.id },
      {
        onSuccess: () => notify(`Agora és ${faction.lore.member}. ${faction.lore.latin}.`, { icon: 'sparkle' }),
        onError: (e) => notify(errorMessage(e), { tone: 'error' }),
      },
    );

  return (
    <>
      <section className="hero hero-lore">
        <Scenery />
        <div className="container hero-lore-inner">
          <div className="hero-lore-emblem"><Emblem /></div>
          <p className="eyebrow eyebrow-light">{L.intro.title}</p>
          <h1>Arcanos &amp; Elementais</h1>
          <p className="lead">{L.intro.text}</p>
          <p className="hero-note">{L.intro.note}</p>
        </div>
      </section>

      {isLoading ? (
        <div className="container section"><LoadingState label="A abrir o códice…" /></div>
      ) : isError || !arcanos || !elementais ? (
        <div className="container section">
          <ErrorState
            message={isError ? errorMessage(error) : 'As facções ainda não foram carregadas. Corre o seed da base de dados.'}
            onRetry={() => void refetch()}
          />
        </div>
      ) : (
        <div className="container lore-layout">
          <Sidebar label="Capítulos" items={L.chapters.map((c) => ({ id: c.id, label: c.label }))} />

          <div className="lore-content">
              <section id="escolha" className="lore-section" aria-labelledby="escolha-title">
                <p className="eyebrow">Capítulo I</p>
                <h2 id="escolha-title">A tua escolha</h2>
                <p className="section-intro">{L.choice.intro}</p>
                <blockquote className="central-question"><p>{L.choice.question}</p></blockquote>
                <div className="choice-grid">
                  {[arcanos, elementais].map((f) => {
                    const chosen = myFaction === f.id;
                    return (
                      <article key={f.slug} className={`choice-card${chosen ? ' chosen' : ''}`} style={{ '--c': f.color } as CSSProperties} aria-labelledby={`choice-${f.slug}`}>
                        <span className="faction-sigil faction-sigil-sm"><BrandSymbol name={f.symbol} /></span>
                        <h3 id={`choice-${f.slug}`}>Escolhe os {f.name} se acreditas que:</h3>
                        <ul>{f.lore.chooseIf.map((c) => <li key={c}>{c}</li>)}</ul>
                        <p className="choice-latin" lang="la">{f.lore.latin}</p>
                        {user ? (
                          <Button
                            variant={chosen ? 'secondary' : 'primary'}
                            aria-pressed={chosen}
                            loading={update.isPending && update.variables?.factionId === f.id}
                            onClick={() => !chosen && choose(f)}
                            icon={chosen ? <Icon name="check" /> : undefined}
                          >
                            {chosen ? 'A tua facção' : `Declarar-me ${f.lore.member}`}
                          </Button>
                        ) : (
                          <ButtonLink to="/login" state={{ from: '/lore' }} variant="secondary">Entrar para escolher</ButtonLink>
                        )}
                      </article>
                    );
                  })}
                </div>
                <p className="muted center">{L.choice.answer}</p>
              </section>

            <section id="premissa" className="lore-section" aria-labelledby="premissa-title">
                <p className="eyebrow">Capítulo II</p>
              <h2 id="premissa-title">Premissa do conflito</h2>
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
              <h3 className="sub-title">Percurso de leitura</h3>
              <LoreTimeline
                label="Percurso de leitura do códice"
                steps={[
                  { id: 't1', marker: 'I', title: 'A tua escolha', text: 'Começa pela filosofia que melhor representa a tua forma de ver o mundo.', symbol: 'compass' },
                  { id: 't2', marker: 'II', title: 'Duas filosofias', text: 'Conhecimento e fundamento: duas formas legítimas de ver o mundo.', symbol: 'scroll' },
                  { id: 't3', marker: 'III · IV', title: 'Arcanos e Elementais', text: 'Valores, virtudes, riscos e a expressão visual de cada facção.', symbol: 'constellation' },
                  { id: 't4', marker: 'V', title: 'O ponto de tensão', text: 'Onde as prioridades se cruzam — e porque cada lado precisa do outro.', symbol: 'shield' },
                ]}
              />
            </section>

            <FactionPanel faction={arcanos} chapter="III">
              <h3 className="sub-title">Expressões Arcanas</h3>
              <ul className="lore-grid lore-grid-4" role="list">
                {(data?.arcanas ?? []).map((a) => <ArcanaCard key={a.id} arcana={a} />)}
              </ul>
            </FactionPanel>

            <FactionPanel faction={elementais} chapter="IV">
              <h3 className="sub-title">As forças naturais</h3>
              <ul className="lore-grid lore-grid-4" role="list">
                {(data?.elementals ?? []).map((e) => <ElementalCard key={e.id} elemental={e} />)}
              </ul>
            </FactionPanel>

            <section id="tensao" className="lore-section" aria-labelledby="tensao-title">
              <p className="eyebrow">Capítulo V</p>
              <h2 id="tensao-title">O ponto de tensão</h2>
              <div className="prose">{L.tension.intro.map((p) => <p key={p}>{p}</p>)}</div>
              <div className="tension-wrap">
                <table className="tension-table" style={{ '--ca': arcanos.color, '--ce': elementais.color } as CSSProperties}>
                  <caption className="sr-only">Perspetivas Arcana e Elemental sobre as questões centrais</caption>
                  <thead>
                    <tr>
                      <th scope="col">Questão</th>
                      <th scope="col" className="t-arc"><BrandSymbol name={arcanos.symbol} />Perspetiva Arcana</th>
                      <th scope="col" className="t-ele"><BrandSymbol name={elementais.symbol} />Perspetiva Elemental</th>
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

              <h3 className="sub-title">Equilíbrio entre as facções</h3>
              <p className="section-intro">{L.balance.lead}</p>
              <div className="without-grid">
                {[arcanos, elementais].map((f) => (
                  <p key={f.slug} className="without-card" style={{ '--c': f.color } as CSSProperties}>
                    <BrandSymbol name={f.symbol} />
                    <span>{L.balance.without[f.slug]}</span>
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
              <Link className="btn btn-primary" to="/library">Explorar a biblioteca</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
