import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { AppState, Person, Presence, Settings } from "./types";
import { addDaysISO, timeToMinutes } from "./utils/date";
import { supabase } from "./supabaseClient";
import { personToRow, presenceToRow, rowToPerson, rowToPresence, rowToSettings, settingsToRow } from "./supabaseMap";

const FALLBACK_SETTINGS: Settings = {
  morningStart: "10:30",
  morningEnd: "14:00",
  afternoonStart: "14:00",
  afternoonEnd: "20:00",
  nightStart: "20:00",
  nightEnd: "21:00",
  mamieName: "Mamie",
  medicationName: "Navalgone",
  mealInstruction:
    "Si vous donnez à manger à Mamie le midi, pensez à lui donner le cachet du midi, qui se trouve dans le pilulier, dans le tiroir, case « midi ».",
  daysShown: [1, 2, 3, 4, 5, 6, 7],
  cleaningLadyEnabled: true,
  cleaningLadyStart: "10:00",
  cleaningLadyEnd: "12:00",
  cleaningLadyNote:
    "L'auxiliaire de vie (la dame qui lave Mamie) passe. Mamie ne peut pas ouvrir la porte elle-même : quelqu'un doit être présent. Ce créneau est variable selon son heure d'arrivée.",
  hebcalEnabled: true,
  hebcalGeonameId: "2988507",
  shabbatPrepHours: 3,
  holidayPrepHours: 4,
  adminCode: "yaron2026",
  odileEnabled: true,
  odileLabel: "Odile",
  odileStart: "19:30",
  odileEnd: "23:00",
};

function toSegments(date: string, start: string, end: string) {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (e <= s) {
    return [
      { date, start: s, end: 1440 },
      { date: addDaysISO(date, 1), start: 0, end: e },
    ];
  }
  return [{ date, start: s, end: e }];
}

interface StoreApi extends AppState {
  loading: boolean;
  addPerson: (name: string, color: string, email?: string) => Person;
  updatePerson: (id: string, partial: Partial<Omit<Person, "id">>) => void;
  removePerson: (id: string) => void;
  addPresence: (p: Omit<Presence, "id">) => void;
  removePresence: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
  findOverlap: (date: string, start: string, end: string) => Presence | undefined;
}

export const StoreContext = createContext<StoreApi | null>(null);

export function useStoreState(): StoreApi {
  const [people, setPeople] = useState<Person[]>([]);
  const [presences, setPresences] = useState<Presence[]>([]);
  const [settings, setSettings] = useState<Settings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);
  const presencesRef = useRef<Presence[]>([]);
  presencesRef.current = presences;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [peopleRes, presencesRes, settingsRes] = await Promise.all([
        supabase.from("people").select("*").order("name"),
        supabase.from("presences").select("*"),
        supabase.from("settings").select("*").eq("id", true).maybeSingle(),
      ]);
      if (cancelled) return;
      if (peopleRes.data) setPeople(peopleRes.data.map(rowToPerson));
      if (presencesRes.data) setPresences(presencesRes.data.map(rowToPresence));
      if (settingsRes.data) setSettings(rowToSettings(settingsRes.data));
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel("planning-mamie-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setPeople((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
        } else {
          const person = rowToPerson(payload.new);
          setPeople((prev) => {
            const exists = prev.some((p) => p.id === person.id);
            return exists ? prev.map((p) => (p.id === person.id ? person : p)) : [...prev, person];
          });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "presences" }, (payload) => {
        if (payload.eventType === "DELETE") {
          setPresences((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
        } else {
          const presence = rowToPresence(payload.new);
          setPresences((prev) => {
            const exists = prev.some((p) => p.id === presence.id);
            return exists ? prev.map((p) => (p.id === presence.id ? presence : p)) : [...prev, presence];
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, (payload) => {
        setSettings(rowToSettings(payload.new));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const addPerson = (name: string, color: string, email?: string) => {
    const person: Person = { id: crypto.randomUUID(), name, color, email };
    setPeople((prev) => [...prev, person]);
    supabase
      .from("people")
      .insert(personToRow(person))
      .then(({ error }) => error && console.error("addPerson failed", error));
    return person;
  };

  const updatePerson = (id: string, partial: Partial<Omit<Person, "id">>) => {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, ...partial } : p)));
    supabase
      .from("people")
      .update(partial)
      .eq("id", id)
      .then(({ error }) => error && console.error("updatePerson failed", error));
  };

  const removePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setPresences((prev) => prev.filter((p) => p.personId !== id));
    supabase
      .from("people")
      .delete()
      .eq("id", id)
      .then(({ error }) => error && console.error("removePerson failed", error));
  };

  const addPresence = (p: Omit<Presence, "id">) => {
    const presence: Presence = { ...p, id: crypto.randomUUID() };
    setPresences((prev) => [...prev, presence]);
    supabase
      .from("presences")
      .insert(presenceToRow(presence))
      .then(({ error }) => error && console.error("addPresence failed", error));
  };

  const removePresence = (id: string) => {
    setPresences((prev) => prev.filter((p) => p.id !== id));
    supabase
      .from("presences")
      .delete()
      .eq("id", id)
      .then(({ error }) => error && console.error("removePresence failed", error));
  };

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...partial }));
    supabase
      .from("settings")
      .update(settingsToRow(partial))
      .eq("id", true)
      .then(({ error }) => error && console.error("updateSettings failed", error));
  };

  const findOverlap = (date: string, start: string, end: string) => {
    const newSegments = toSegments(date, start, end);
    return presencesRef.current.find((p) => {
      const existingSegments = toSegments(p.date, p.startTime, p.endTime);
      return newSegments.some((ns) =>
        existingSegments.some((es) => ns.date === es.date && ns.start < es.end && es.start < ns.end)
      );
    });
  };

  return {
    people,
    presences,
    settings,
    loading,
    addPerson,
    updatePerson,
    removePerson,
    addPresence,
    removePresence,
    updateSettings,
    findOverlap,
  };
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreContext.Provider");
  return ctx;
}
