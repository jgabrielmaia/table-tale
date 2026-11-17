import { useMemo, useState } from 'react';
import { Button, Icon, useToast } from '@/components/ui';
import { useCreateGame, useGames } from '@/hooks/useGames';
import { t } from '@/i18n';
import { errorMessage } from '@/lib/errors';
import { suggestCategories } from './categories';
import { NewGameModal } from './NewGameModal';

export interface NewGameButtonProps {
  /** Puts the new game where the player is adding games: a community shelf or their own library. */
  addTo: (gameId: string) => Promise<unknown>;
  /** Games already on that shelf or in that library, so a matching title says so instead of offering to add it. */
  alreadyHere?: Set<string>;
}

/** "New game": adds a game to the catalogue by hand (the player becomes its owner) and straight onto the list they are on. */
export function NewGameButton({ addTo, alreadyHere }: NewGameButtonProps) {
  const [open, setOpen] = useState(false);
  const { games } = useGames();
  const create = useCreateGame();
  const { notify } = useToast();
  const suggestions = useMemo(() => suggestCategories(games.map((g) => g.categories), []), [games]);

  const onCreate = async (values: Parameters<typeof create.mutateAsync>[0]['values'], categories: string[], cover: File | null | undefined) => {
    let game: { id: string; slug: string };
    try {
      game = await create.mutateAsync({ values, categories, cover: cover ?? null });
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
      throw e;
    }
    try {
      await addTo(game.id);
      notify(t('newGame.added', { title: values.title }));
    } catch (e) {
      // The game exists now: it is in the catalogue to pick, so the form can close.
      notify(t('newGame.createdNotAdded', { title: values.title, reason: errorMessage(e) }), { tone: 'error' });
    }
  };

  const onAddExisting = async (gameId: string) => {
    try {
      await addTo(gameId);
      notify(t('newGame.added', { title: games.find((g) => g.id === gameId)?.title ?? '' }));
    } catch (e) {
      notify(errorMessage(e), { tone: 'error' });
      throw e;
    }
  };

  return (
    <>
      <Button variant="secondary" icon={<Icon name="plus" />} onClick={() => setOpen(true)}>{t('newGame.button')}</Button>
      <NewGameModal
        open={open}
        suggestions={suggestions}
        catalogue={games}
        alreadyHere={alreadyHere}
        onClose={() => setOpen(false)}
        onSubmit={onCreate}
        onAddExisting={onAddExisting}
      />
    </>
  );
}
