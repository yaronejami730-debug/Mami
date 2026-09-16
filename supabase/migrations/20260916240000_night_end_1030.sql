alter table public.settings alter column night_end set default '10:30';
update public.settings set night_end = '10:30' where id = true and night_end = '21:00';
