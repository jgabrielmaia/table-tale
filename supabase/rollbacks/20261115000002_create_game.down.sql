-- Rollback of 20261115000002_create_game.sql
-- Games added by hand stay in the catalogue; only the way to add them goes away. Deploy the previous app version first.

drop function public.create_game(text, text, int, int, int, text[]);
