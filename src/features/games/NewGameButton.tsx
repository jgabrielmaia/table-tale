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
}

/** "New game": adds a game to the catalogue by hand (the player becomes its owner) and straight onto the list they are on. */
export function NewGameButton({ addTo }: NewGameButtonProps) {
  const [open, setOpen] = useState(false);
  const { games } = useGames();
  const create = useCreateGame();
  const { notify } = useToast();
  const suggestions = useMemo(() => suggestCategories(games.map((g) => g.categories), []), [games]);

  const onCreate = async (values: Parameters<typeof create.mutateAsync>[0]['values'], categories: string[]) => {
    let game: { id: string; slug: string };
    try {
      game = await create.mutateAsync({ values, categories });
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

  return (
    <>
      <Button variant="secondary" icon={<Icon name="plus" />} onClick={() => setOpen(true)}>{t('newGame.button')}</Button>
      <NewGameModal open={open} suggestions={suggestions} onClose={() => setOpen(false)} onCreate={onCreate} />
    </>
  );
}
