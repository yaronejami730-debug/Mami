alter table public.people add column night_only boolean not null default false;
update public.people set night_only = true where name = 'Yaron';
