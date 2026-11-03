import { ButtonLink, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="container section">
      <h1 className="sr-only">Página não encontrada</h1>
      <EmptyState
        headingLevel={2}
        title="Esta página não consta do mapa"
        description="O caminho que seguiste perdeu-se no Véu. Regressa à biblioteca para continuar a explorar."
        action={<ButtonLink to="/library" variant="primary">Voltar à biblioteca</ButtonLink>}
      />
    </div>
  );
}
