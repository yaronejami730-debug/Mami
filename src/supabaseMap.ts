import type { Person, Presence, Settings } from "./types";

export function rowToPerson(row: any): Person {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    email: row.email ?? undefined,
    nightOnly: row.night_only ?? false,
  };
}

export function personToRow(p: Person): Record<string, unknown> {
  return { id: p.id, name: p.name, color: p.color, email: p.email ?? null, night_only: p.nightOnly ?? false };
}

export function rowToPresence(row: any): Presence {
  return {
    id: row.id,
    personId: row.person_id,
    date: row.date,
    period: row.period,
    startTime: row.start_time,
    endTime: row.end_time,
    mealForMamie: row.meal_for_mamie,
    exceptional: row.exceptional,
  };
}

export function presenceToRow(p: Presence): Record<string, unknown> {
  return {
    id: p.id,
    person_id: p.personId,
    date: p.date,
    period: p.period,
    start_time: p.startTime,
    end_time: p.endTime,
    meal_for_mamie: p.mealForMamie,
    exceptional: p.exceptional,
  };
}

export function rowToSettings(row: any): Settings {
  return {
    morningStart: row.morning_start,
    morningEnd: row.morning_end,
    afternoonStart: row.afternoon_start,
    afternoonEnd: row.afternoon_end,
    nightStart: row.night_start,
    nightEnd: row.night_end,
    mamieName: row.mamie_name,
    medicationName: row.medication_name,
    mealInstruction: row.meal_instruction,
    daysShown: row.days_shown,
    cleaningLadyEnabled: row.cleaning_lady_enabled,
    cleaningLadyStart: row.cleaning_lady_start,
    cleaningLadyEnd: row.cleaning_lady_end,
    cleaningLadyNote: row.cleaning_lady_note,
    hebcalEnabled: row.hebcal_enabled,
    hebcalGeonameId: row.hebcal_geonameid,
    shabbatPrepHours: row.shabbat_prep_hours,
    holidayPrepHours: row.holiday_prep_hours,
    adminCode: row.admin_code,
    odileEnabled: row.odile_enabled,
    odileLabel: row.odile_label,
    odileStart: row.odile_start,
    odileEnd: row.odile_end,
  };
}

export function settingsToRow(s: Partial<Settings>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (s.morningStart !== undefined) row.morning_start = s.morningStart;
  if (s.morningEnd !== undefined) row.morning_end = s.morningEnd;
  if (s.afternoonStart !== undefined) row.afternoon_start = s.afternoonStart;
  if (s.afternoonEnd !== undefined) row.afternoon_end = s.afternoonEnd;
  if (s.nightStart !== undefined) row.night_start = s.nightStart;
  if (s.nightEnd !== undefined) row.night_end = s.nightEnd;
  if (s.mamieName !== undefined) row.mamie_name = s.mamieName;
  if (s.medicationName !== undefined) row.medication_name = s.medicationName;
  if (s.mealInstruction !== undefined) row.meal_instruction = s.mealInstruction;
  if (s.daysShown !== undefined) row.days_shown = s.daysShown;
  if (s.cleaningLadyEnabled !== undefined) row.cleaning_lady_enabled = s.cleaningLadyEnabled;
  if (s.cleaningLadyStart !== undefined) row.cleaning_lady_start = s.cleaningLadyStart;
  if (s.cleaningLadyEnd !== undefined) row.cleaning_lady_end = s.cleaningLadyEnd;
  if (s.cleaningLadyNote !== undefined) row.cleaning_lady_note = s.cleaningLadyNote;
  if (s.hebcalEnabled !== undefined) row.hebcal_enabled = s.hebcalEnabled;
  if (s.hebcalGeonameId !== undefined) row.hebcal_geonameid = s.hebcalGeonameId;
  if (s.shabbatPrepHours !== undefined) row.shabbat_prep_hours = s.shabbatPrepHours;
  if (s.holidayPrepHours !== undefined) row.holiday_prep_hours = s.holidayPrepHours;
  if (s.adminCode !== undefined) row.admin_code = s.adminCode;
  return row;
}
