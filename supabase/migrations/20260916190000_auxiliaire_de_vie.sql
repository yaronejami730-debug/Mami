alter table public.settings alter column cleaning_lady_end set default '12:00';
alter table public.settings alter column cleaning_lady_note set default
  'L''auxiliaire de vie (la dame qui lave Mamie) passe. Mamie ne peut pas ouvrir la porte elle-même : quelqu''un doit être présent. Ce créneau est variable selon son heure d''arrivée.';

update public.settings
  set cleaning_lady_end = '12:00'
  where id = true and cleaning_lady_end = '11:00';

update public.settings
  set cleaning_lady_note = 'L''auxiliaire de vie (la dame qui lave Mamie) passe. Mamie ne peut pas ouvrir la porte elle-même : quelqu''un doit être présent. Ce créneau est variable selon son heure d''arrivée.'
  where id = true and cleaning_lady_note = 'La femme de ménage passe. Mamie ne peut pas ouvrir la porte elle-même : quelqu''un doit être présent.';
