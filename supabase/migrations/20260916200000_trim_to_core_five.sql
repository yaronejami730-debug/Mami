-- Remove the duplicate/no-email "Yaron" row (superseded by "yarone" which already has an email set)
delete from public.people where name = 'Yaron' and email is null;

-- Normalize casing on the surviving row
update public.people set name = 'Yaron' where name = 'yarone';

-- Keep only the working group of five for now: Fabrice, Eric, Dominique, Norbert, Yaron
delete from public.people
  where name not in ('Fabrice', 'Eric', 'Dominique', 'Norbert', 'Yaron');
