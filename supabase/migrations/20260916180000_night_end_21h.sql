alter table public.settings alter column night_end set default '21:00';
update public.settings set night_end = '21:00' where id = true and night_end = '10:30';
