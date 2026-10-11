-- Run ONCE in Supabase SQL Editor, AFTER your existing schema. Safe to rerun.
create index if not exists idx_players_active on public.players(is_active, shirt_number);
create index if not exists idx_matches_pub on public.matches(is_published, kickoff_at);
create index if not exists idx_news_pub on public.news(status, published_at desc);
create index if not exists idx_lineup_players_lineup on public.lineup_players(lineup_id);

-- Only one current lineup: publishing a new one unsets the previous (enforced in the DB).
create or replace function public.single_current_lineup() returns trigger language plpgsql as $$
begin if new.is_current then update public.lineups set is_current=false where id<>new.id and is_current; end if; return new; end;$$;
drop trigger if exists single_current_lineup on public.lineups;
create trigger single_current_lineup after insert or update of is_current on public.lineups
  for each row when (new.is_current) execute function public.single_current_lineup();

-- Storage policies. FIRST create a PUBLIC bucket named pavo-media (Dashboard > Storage).
drop policy if exists "Public read pavo-media" on storage.objects;
create policy "Public read pavo-media" on storage.objects for select using (bucket_id='pavo-media');
drop policy if exists "Admins write pavo-media" on storage.objects;
create policy "Admins write pavo-media" on storage.objects for all to authenticated
  using (bucket_id='pavo-media' and public.is_admin()) with check (bucket_id='pavo-media' and public.is_admin());

-- Optional editable settings (is_public=true => visible to visitors). Replace with real info:
-- insert into public.site_settings(key,value,is_public) values
-- ('club','{"description_ar":"","description_en":"","mission_ar":"","mission_en":"","vision_ar":"","vision_en":""}',true),
-- ('contact','{"email":"","phone":""}',true),
-- ('social','{"instagram":"","facebook":"","x":"","youtube":""}',true)
-- on conflict (key) do update set value=excluded.value;
