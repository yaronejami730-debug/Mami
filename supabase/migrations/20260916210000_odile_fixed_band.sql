alter table public.settings
  add column odile_enabled boolean not null default true,
  add column odile_label text not null default 'Odile',
  add column odile_start text not null default '19:30',
  add column odile_end text not null default '23:00';
