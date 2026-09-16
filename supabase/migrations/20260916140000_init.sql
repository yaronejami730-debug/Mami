create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#64748b',
  email text,
  created_at timestamptz not null default now()
);

create table public.settings (
  id boolean primary key default true,
  morning_start text not null default '10:30',
  morning_end text not null default '14:00',
  afternoon_start text not null default '14:00',
  afternoon_end text not null default '20:00',
  night_start text not null default '21:00',
  night_end text not null default '10:30',
  mamie_name text not null default 'Mamie',
  medication_name text not null default 'Navalgone',
  meal_instruction text not null default 'Si vous donnez à manger à Mamie le midi, pensez à lui donner le cachet du midi, qui se trouve dans le pilulier, dans le tiroir, case « midi ».',
  days_shown int[] not null default '{1,2,3,4,5,6,7}',
  cleaning_lady_enabled boolean not null default true,
  cleaning_lady_start text not null default '10:00',
  cleaning_lady_end text not null default '11:00',
  cleaning_lady_note text not null default 'La femme de ménage passe. Mamie ne peut pas ouvrir la porte elle-même : quelqu''un doit être présent.',
  hebcal_enabled boolean not null default true,
  hebcal_geonameid text not null default '2988507',
  constraint settings_singleton check (id)
);
insert into public.settings (id) values (true);

create table public.presences (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete cascade,
  date date not null,
  period text not null check (period in ('matin', 'apres-midi', 'journee', 'personnalise', 'nuit', 'jusqua-chabbat')),
  start_time text not null,
  end_time text not null,
  meal_for_mamie boolean not null default false,
  exceptional boolean not null default false,
  created_at timestamptz not null default now()
);
create index presences_date_idx on public.presences(date);

insert into public.people (name, color) values
  ('Fabrice', '#22c55e'),
  ('Eric', '#3b82f6'),
  ('Dominique', '#f59e0b'),
  ('Norbert', '#a855f7'),
  ('David', '#ef4444'),
  ('Jérémy', '#14b8a6'),
  ('Yaron', '#ec4899'),
  ('Déborah', '#0ea5e9'),
  ('Johan', '#84cc16'),
  ('Geoffrey', '#f97316'),
  ('Dan', '#6366f1'),
  ('Solal', '#e11d48'),
  ('Jonas', '#22c55e'),
  ('Jessica', '#3b82f6'),
  ('Myriam', '#f59e0b');

alter table public.people enable row level security;
alter table public.settings enable row level security;
alter table public.presences enable row level security;

create policy "open access" on public.people for all using (true) with check (true);
create policy "open access" on public.settings for all using (true) with check (true);
create policy "open access" on public.presences for all using (true) with check (true);

alter publication supabase_realtime add table public.people;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.presences;
