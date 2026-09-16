alter table public.settings alter column afternoon_end set default '20:00';
alter table public.settings alter column night_start set default '20:00';

update public.settings set afternoon_end = '20:00' where id = true and afternoon_end = '21:00';
update public.settings set night_start = '20:00' where id = true and night_start = '21:00';
