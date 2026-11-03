-- A faction is decided by the Fate Draw card, never edited by the player.
create or replace function public.sync_profile_faction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from seasons s where s.id = new.season_id and s.is_active) then
    update profiles
       set faction_id = (select f.id from factions f where f.slug = new.faction)
     where id = new.player_id;
  end if;
  return new;
end;
$$;

create trigger player_card_identities_sync_faction
  after insert or update of faction on public.player_card_identities
  for each row execute function public.sync_profile_faction();

revoke update (faction_id) on public.profiles from authenticated;

update profiles p
   set faction_id = f.id
  from player_card_identities i
  join seasons s on s.id = i.season_id and s.is_active
  join factions f on f.slug = i.faction
 where i.player_id = p.id;
