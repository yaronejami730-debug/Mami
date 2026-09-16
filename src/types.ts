export interface Person {
  id: string;
  name: string;
  color: string;
  email?: string;
}

export type Period = "matin" | "apres-midi" | "journee" | "personnalise" | "nuit" | "jusqua-chabbat";

export interface Presence {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD — date the slot starts on
  period: Period;
  startTime: string; // HH:MM
  endTime: string; // HH:MM — may be <= startTime, meaning it wraps past midnight
  mealForMamie: boolean;
  exceptional: boolean;
}

export interface Settings {
  morningStart: string;
  morningEnd: string;
  afternoonStart: string;
  afternoonEnd: string;
  nightStart: string;
  nightEnd: string;
  mamieName: string;
  medicationName: string;
  mealInstruction: string;
  daysShown: number[]; // 0=Sun ... 6=Sat
  cleaningLadyEnabled: boolean;
  cleaningLadyStart: string;
  cleaningLadyEnd: string;
  cleaningLadyNote: string;
  hebcalEnabled: boolean;
  hebcalGeonameId: string;
  shabbatPrepHours: number;
  holidayPrepHours: number;
  adminCode: string;
  odileEnabled: boolean;
  odileLabel: string;
  odileStart: string;
  odileEnd: string;
}

export interface AppState {
  people: Person[];
  presences: Presence[];
  settings: Settings;
}
