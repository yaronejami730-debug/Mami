alter table public.settings alter column shabbat_prep_hours set default 3;
update public.settings set shabbat_prep_hours = 3 where id = true and shabbat_prep_hours = 2;
