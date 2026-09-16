alter table public.settings alter column afternoon_end set default '21:00';
update public.settings set afternoon_end = '21:00' where id = true and afternoon_end = '20:00';
