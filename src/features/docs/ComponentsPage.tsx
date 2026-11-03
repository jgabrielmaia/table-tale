import { useState } from 'react';
import { PlayerIdentityFrame } from '@/components/identity/PlayerIdentityFrame';
import { FATE_CARDS } from '@/features/fate/cards';
import { GameCard } from '@/components/games/GameCard';
import { GameStatusBadge } from '@/components/games/GameStatusBadge';
import { Sidebar } from '@/components/layout/Sidebar';
import { AchievementCard } from '@/components/profile/AchievementCard';
import { ArcanaCard } from '@/components/lore/ArcanaCard';
import {
  Avatar, Badge, BrandSymbol, Button, Card, EmptyState, ErrorState, Icon, Input, LoadingState, Modal, ProgressBar, Select, Tabs, Textarea, useToast,
} from '@/components/ui';
import type { LibraryGame } from '@/types/domain';

const SAMPLE_GAME: LibraryGame = {
  id: 'demo', slug: 'dixit', title: 'Dixit', genre: 'Narrativo', complexity: 'Leve', description: '', coverUrl: null,
  minPlayers: 3, maxPlayers: 6, durationMinutes: 30, status: 'in_progress', isFavorite: true,
  owners: [{ userId: 'u', displayName: 'Gabriel Maia', avatarUrl: null, copies: 1, condition: 'good' }],
};

const SECTIONS = [
  { id: 'botoes', label: 'Botões' },
  { id: 'formularios', label: 'Formulários' },
  { id: 'feedback', label: 'Estados' },
  { id: 'dados', label: 'Dados' },
  { id: 'dominio', label: 'Domínio' },
];

/** Internal component documentation (/table-tale/ui) — a lightweight alternative to Storybook. */
export function ComponentsPage() {
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState('a');
  const { notify } = useToast();

  return (
    <div className="container lore-layout">
      <Sidebar label="Secções" items={SECTIONS} />
      <div>
        <p className="eyebrow">Sistema de design</p>
        <h1>Componentes</h1>
        <p className="lead">Componentes reutilizáveis da Table Tale com as suas variantes e estados.</p>

        <section id="botoes" className="docs-section" aria-labelledby="botoes-t">
          <h2 id="botoes-t">Botões</h2>
          <div className="docs-row">
            <Button variant="primary">Primário</Button>
            <Button variant="gold">Dourado</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="primary" loading loadingText="A guardar…">Guardar</Button>
            <Button variant="secondary" disabled>Desativado</Button>
            <Button variant="secondary" size="sm" icon={<Icon name="heart" />}>Pequeno com ícone</Button>
          </div>
        </section>

        <section id="formularios" className="docs-section" aria-labelledby="form-t">
          <h2 id="form-t">Formulários</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="E-mail" type="email" placeholder="nome@exemplo.pt" leadingIcon={<Icon name="mail" />} />
            <Input label="Com erro" defaultValue="invalido" error="Este e-mail não parece válido." />
            <Select label="Seleção" options={[{ value: 'a', label: 'Opção A' }, { value: 'b', label: 'Opção B' }]} hint="Texto de ajuda" />
            <Textarea label="Notas" optional rows={2} />
          </div>
          <div className="docs-row mt-4">
            <Tabs label="Exemplo" value={tab} onChange={setTab} items={[{ id: 'a', label: 'Separador A', content: <p>Conteúdo A</p> }, { id: 'b', label: 'Separador B', content: <p>Conteúdo B</p> }]} />
          </div>
          <div className="docs-row mt-4">
            <Button onClick={() => setModal(true)}>Abrir modal</Button>
            <Button onClick={() => notify('Notificação de sucesso')}>Toast</Button>
            <Button onClick={() => notify('Algo falhou', { tone: 'error' })}>Toast de erro</Button>
          </div>
          <Modal open={modal} title="Modal de exemplo" onClose={() => setModal(false)} footer={<Button variant="primary" onClick={() => setModal(false)}>Fechar</Button>}>
            <p>Foco preso no diálogo; Esc ou clique fora fecham.</p>
          </Modal>
        </section>

        <section id="feedback" className="docs-section" aria-labelledby="fb-t">
          <h2 id="fb-t">Estados</h2>
          <LoadingState label="A carregar…" />
          <LoadingState variant="lines" count={3} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <EmptyState compact title="Estado vazio" description="Mensagem amigável quando não há resultados." />
            <ErrorState compact message="Mensagem de erro com ação de recuperação." onRetry={() => notify('Nova tentativa')} />
          </div>
        </section>

        <section id="dados" className="docs-section" aria-labelledby="dados-t">
          <h2 id="dados-t">Dados</h2>
          <div className="docs-row">
            <Avatar name="Gabriel Maia" size="xs" />
            <Avatar name="Gabriel Maia" size="sm" />
            <Avatar name="Gabriel Maia" size="xl" />
            <Badge>Neutro</Badge>
            <Badge tone="progress">Em progresso</Badge>
            <Badge tone="success">Concluído</Badge>
            <Badge tone="accent" color="#22d3ee" icon={<BrandSymbol name="atom" />}>Arcanos</Badge>
            <GameStatusBadge status="completed" />
          </div>
          <div className="mt-4 max-w-md"><ProgressBar value={185} max={300} label="Progresso de exemplo" /></div>
          <h3 className="mt-6">Molduras de identidade sazonal</h3>
          {(['xl', 'sm', 'xs'] as const).map((size) => (
            <div className="docs-row mt-3" key={size}>
              {FATE_CARDS.map((c) => (
                <PlayerIdentityFrame key={c.id} cardId={c.id} size={size}>
                  <Avatar name="Gabriel Maia" size={size} decorative />
                </PlayerIdentityFrame>
              ))}
            </div>
          ))}
          <Card className="mt-4" title="Card" titleId="card-demo" description="Painel com cabeçalho e ações.">Conteúdo do card.</Card>
        </section>

        <section id="dominio" className="docs-section" aria-labelledby="dom-t">
          <h2 id="dom-t">Componentes de domínio</h2>
          <ul className="game-grid" role="list">
            <GameCard game={SAMPLE_GAME} onToggleFavorite={() => notify('Favorito alternado')} onStatusChange={() => notify('Estado alterado')} />
          </ul>
          <ul className="medal-grid mt-6" role="list">
            <AchievementCard achievement={{ id: '1', slug: 'x', name: 'Primeira Expedição', description: 'Regista a tua primeira sessão.', icon: 'compass', requirementType: 'sessions', requirementValue: 1, unlockedAt: new Date().toISOString(), progress: 1 }} />
            <AchievementCard achievement={{ id: '2', slug: 'y', name: 'Cronista da Mesa', description: 'Regista 5 sessões.', icon: 'scroll', requirementType: 'sessions', requirementValue: 5, unlockedAt: null, progress: 2 }} />
          </ul>
          <ul className="lore-grid lore-grid-4 mt-6" role="list">
            <ArcanaCard arcana={{ id: 'g', factionId: null, name: 'Geometria', slug: 'geometria', description: 'Precisão e padrão.', longDescription: 'Texto expandido.', symbol: 'geometry', color: '#22d3ee', imageUrl: null }} />
          </ul>
        </section>
      </div>
    </div>
  );
}
