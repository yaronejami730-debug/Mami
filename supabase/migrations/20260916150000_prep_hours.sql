alter table public.settings
  add column shabbat_prep_hours int not null default 2,
  add column holiday_prep_hours int not null default 4;
