import { useEffect, useRef, useState } from "react";
import { useStore } from "../store";
import {
  addDays,
  addDaysISO,
  dayName,
  formatDayLabel,
  isOvernight,
  isoWeekday,
  minutesToTime,
  startOfWeek,
  timeToMinutes,
  toISODate,
} from "../utils/date";
import { fetchHebcalEvents, type HebcalByDate } from "../hebcal";
import { AddPresenceSheet } from "./AddPresenceSheet";
import { QuickBookSheet } from "./QuickBookSheet";
import { MY_PERSON_KEY } from "../constants";

type SimplePeriod = "matin" | "apres-midi" | "journee" | "nuit";

interface MissingSlot {
  period: SimplePeriod;
  startTime: string;
  endTime: string;
  note?: string;
}

const DAY_START = 0; // minutes
const DAY_END = 24 * 60;
const PX_PER_MIN = 0.75;

function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < breakpoint
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}

function HourLines() {
  const hours = [];
  for (let h = 0; h <= 24; h++) hours.push(h);
  return (
    <div className="hour-lines">
      {hours.map((h) => (
        <div key={h} className="hour-line" style={{ top: (h * 60 - DAY_START) * PX_PER_MIN }}>
          <span>{h}h</span>
        </div>
      ))}
    </div>
  );
}

export function WeekGrid({ isAdmin }: { isAdmin: boolean }) {
  const { people, presences, settings, removePresence } = useStore();
  const myPersonId = typeof window !== "undefined" ? localStorage.getItem(MY_PERSON_KEY) : null;
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [addForDate, setAddForDate] = useState<Date | null>(null);
  const [quickBook, setQuickBook] = useState<{ date: Date } & MissingSlot | null>(null);
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"auto" | "week" | "day" | "liste">("liste");
  const showDayView = viewMode === "auto" ? isMobile : viewMode === "day";
  const showListView = viewMode === "liste";
  const scrollPaneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollPaneRef.current) return;
    const targetMinutes = 7 * 60;
    scrollPaneRef.current.scrollTop = Math.max(targetMinutes * PX_PER_MIN - 40, 0);
  }, []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const sorted = settings.daysShown.slice().sort((a, b) => a - b);
    const todayWd = ((new Date().getDay() + 6) % 7) + 1;
    const idx = sorted.indexOf(todayWd);
    return idx === -1 ? 0 : idx;
  });

  const days = settings.daysShown
    .slice()
    .sort((a, b) => a - b)
    .map((wd) => addDays(weekStart, wd - 1));

  const clampedIndex = Math.min(selectedDayIndex, Math.max(days.length - 1, 0));
  const visibleDays = showDayView ? days.slice(clampedIndex, clampedIndex + 1) : days;

  const goToPrevDay = () => {
    if (clampedIndex > 0) {
      setSelectedDayIndex(clampedIndex - 1);
    } else {
      setWeekStart((d) => addDays(d, -7));
      setSelectedDayIndex(Math.max(settings.daysShown.length - 1, 0));
    }
  };

  const goToNextDay = () => {
    if (clampedIndex < days.length - 1) {
      setSelectedDayIndex(clampedIndex + 1);
    } else {
      setWeekStart((d) => addDays(d, 7));
      setSelectedDayIndex(0);
    }
  };

  const gridHeight = (DAY_END - DAY_START) * PX_PER_MIN;

  const [hebcal, setHebcal] = useState<HebcalByDate>({});

  useEffect(() => {
    if (!settings.hebcalEnabled || days.length === 0) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeStart = days[0] < today ? days[0] : today;
    const weekEnd = addDays(days[days.length - 1], 1);
    const farAhead = addDays(today, 22);
    const rangeEnd = weekEnd > farAhead ? weekEnd : farAhead;
    const startISO = toISODate(rangeStart);
    const endISO = toISODate(rangeEnd);
    let cancelled = false;
    fetchHebcalEvents(startISO, endISO, settings.hebcalGeonameId)
      .then((data) => {
        if (!cancelled) setHebcal(data);
      })
      .catch(() => {
        if (!cancelled) setHebcal({});
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.hebcalEnabled, settings.hebcalGeonameId, toISODate(weekStart)]);

  const cleaningStart = settings.cleaningLadyEnabled ? timeToMinutes(settings.cleaningLadyStart) : null;
  const cleaningEnd = settings.cleaningLadyEnabled ? timeToMinutes(settings.cleaningLadyEnd) : null;

  const odileStart = settings.odileEnabled ? timeToMinutes(settings.odileStart) : null;
  const odileEnd = settings.odileEnabled ? timeToMinutes(settings.odileEnd) : null;

  const candleTimeFor = (iso: string): string | null => {
    const ev = (hebcal[iso] ?? []).find((e) => e.category === "candles");
    return ev ? ev.date.slice(11, 16) : null;
  };

  const havdalahTimeFor = (iso: string): string | null => {
    const ev = (hebcal[iso] ?? []).find((e) => e.category === "havdalah");
    return ev ? ev.date.slice(11, 16) : null;
  };

  const isFullyGreyedDay = (events: HebcalByDate[string]): boolean =>
    events.some(
      (ev) =>
        ev.yomtov ||
        (ev.category === "holiday" &&
          (ev.title.includes("Soukkot") || ev.title.includes("Souccot")) &&
          !ev.title.startsWith("Erev"))
    );

  const yomtovEndingFor = (iso: string): string | null => {
    const ev = (hebcal[iso] ?? []).find((e) => e.category === "holiday" && e.yomtov);
    return ev ? ev.title : null;
  };

  const erevFestivalFor = (iso: string): string | null => {
    const ev = (hebcal[iso] ?? []).find(
      (e) => e.category === "holiday" && e.subcat === "major" && e.title.startsWith("Erev ")
    );
    return ev ? ev.title.replace(/^Erev\s+/, "") : null;
  };

  const computeMissingSlots = (d: Date): MissingSlot[] => {
    const iso = toISODate(d);
    const events = hebcal[iso] ?? [];
    if (isFullyGreyedDay(events)) return [];

    const dayPresences = presences.filter((p) => p.date === iso);
    const prevIso = addDaysISO(iso, -1);
    const wrappedIn = presences.filter((p) => p.date === prevIso && isOvernight(p.startTime, p.endTime));
    const dayBlocks = [
      ...dayPresences.map((p) => ({
        start: timeToMinutes(p.startTime),
        end: isOvernight(p.startTime, p.endTime) ? 1440 : timeToMinutes(p.endTime),
      })),
      ...wrappedIn.map((p) => ({ start: 0, end: timeToMinutes(p.endTime) })),
    ];
    const covers = (start: number, end: number) => dayBlocks.some((b) => b.start <= start && b.end >= end);

    const candleTime = candleTimeFor(iso);
    const festivalName = erevFestivalFor(iso);
    const prepHours = festivalName ? settings.holidayPrepHours : settings.shabbatPrepHours;
    const prepCutoffMin = candleTime ? timeToMinutes(candleTime) - prepHours * 60 : null;
    const afternoonEndMin =
      prepCutoffMin !== null
        ? Math.min(timeToMinutes(settings.afternoonEnd), prepCutoffMin)
        : timeToMinutes(settings.afternoonEnd);
    const afternoonEndLabel = minutesToTime(afternoonEndMin);
    const afternoonClamped = prepCutoffMin !== null && afternoonEndMin === prepCutoffMin;

    const isSaturday = isoWeekday(d) === 6;
    const matinCovered = covers(timeToMinutes(settings.morningStart), timeToMinutes(settings.morningEnd));
    const apremCovered = covers(timeToMinutes(settings.afternoonStart), afternoonEndMin);
    const nuitCovered = dayPresences.some((p) => p.period === "nuit");

    const nextIso = addDaysISO(iso, 1);
    const nextCandle = candleTimeFor(nextIso);
    const nextFestival = erevFestivalFor(nextIso);
    const nextPrepHours = nextFestival ? settings.holidayPrepHours : settings.shabbatPrepHours;
    const nextCutoff = nextCandle ? timeToMinutes(nextCandle) - nextPrepHours * 60 : null;
    const nightEndMin = timeToMinutes(settings.nightEnd);
    const nuitEndMin = nextCutoff !== null && nextCutoff < nightEndMin ? nextCutoff : nightEndMin;
    const nuitEndLabel = minutesToTime(nuitEndMin);
    const nuitClamped = nextCutoff !== null && nuitEndMin === nextCutoff;
    const nuitNote = nuitClamped
      ? `À cause de ${nextFestival ?? "Chabbat"} le lendemain, on peut partir dès ${nuitEndLabel} au lieu de ${settings.nightEnd}.`
      : undefined;

    const slots: MissingSlot[] = [];

    if (isSaturday) {
      if (!nuitCovered) {
        slots.push({
          period: "nuit",
          startTime: havdalahTimeFor(iso) ?? settings.nightStart,
          endTime: nuitEndLabel,
          note: nuitNote,
        });
      }
      return slots;
    }

    if (!matinCovered || !apremCovered) {
      slots.push({
        period: "journee",
        startTime: settings.morningStart,
        endTime: afternoonEndLabel,
        note: afternoonClamped
          ? `À cause de ${festivalName ?? "Chabbat"} ce soir, il faut finir au plus tard à ${afternoonEndLabel} (${prepHours}h avant l'entrée).`
          : undefined,
      });
    }

    if (!nuitCovered) {
      slots.push({ period: "nuit", startTime: settings.nightStart, endTime: nuitEndLabel, note: nuitNote });
    }

    return slots;
  };

  if (!isAdmin) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingDays = Array.from({ length: 21 }, (_, i) => addDays(today, i)).filter((d) =>
      settings.daysShown.includes(isoWeekday(d))
    );
    const cards = upcomingDays.flatMap((d) => computeMissingSlots(d).map((slot) => ({ d, slot })));
    const periodLabel: Record<SimplePeriod, string> = {
      matin: "🟢 Créneau de jour",
      "apres-midi": "🔵 Créneau de jour",
      journee: "☀️ Créneau de jour",
      nuit: "🌙 Créneau de nuit",
    };

    return (
      <div className="week-view">
        <div className="simple-view">
          {cards.length === 0 && (
            <p className="list-empty" style={{ textAlign: "center", marginTop: 24 }}>
              🎉 Tout est complet pour l'instant !
            </p>
          )}
          {cards.map(({ d, slot }, i) => (
            <div key={`${toISODate(d)}-${slot.period}-${i}`} className="simple-card">
              <div className="simple-card-day">
                {slot.period === "nuit"
                  ? `Nuit de ${dayName(isoWeekday(d))} ${d.getDate()} à ${dayName(isoWeekday(addDays(d, 1)))}`
                  : `${dayName(isoWeekday(d))} ${d.getDate()}`}
              </div>
              <div className="simple-card-slot">
                {periodLabel[slot.period]} — {slot.startTime} → {slot.endTime}
              </div>
              {slot.note && <div className="simple-card-note">({slot.note})</div>}
              <button
                className="simple-card-btn"
                onClick={() => setQuickBook({ date: d, ...slot })}
              >
                Réserver ce créneau
              </button>
            </div>
          ))}
        </div>

        {quickBook && (
          <QuickBookSheet
            date={quickBook.date}
            period={quickBook.period}
            startTime={quickBook.startTime}
            endTime={quickBook.endTime}
            onClose={() => setQuickBook(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="week-view">
      <div className="view-toggle">
        <button
          className={`view-toggle-btn ${!showDayView && !showListView ? "selected" : ""}`}
          onClick={() => setViewMode("week")}
        >
          📅 Semaine
        </button>
        <button
          className={`view-toggle-btn ${showDayView ? "selected" : ""}`}
          onClick={() => setViewMode("day")}
        >
          📆 Jour
        </button>
        <button
          className={`view-toggle-btn ${showListView ? "selected" : ""}`}
          onClick={() => setViewMode("liste")}
        >
          📋 Liste
        </button>
      </div>

      {!showDayView && (
        <div className="week-nav">
          <button onClick={() => setWeekStart((d) => addDays(d, -7))}>← Semaine préc.</button>
          <span>{formatDayLabel(days[0])} — {formatDayLabel(days[days.length - 1])}</span>
          <button onClick={() => setWeekStart((d) => addDays(d, 7))}>Semaine suiv. →</button>
        </div>
      )}

      {showDayView && !showListView && visibleDays[0] && (
        <div className="day-nav">
          <button className="day-nav-arrow" onClick={goToPrevDay} aria-label="Jour précédent">
            ‹
          </button>
          <div className="day-nav-current">
            <span className="day-nav-name">{dayName(isoWeekday(visibleDays[0]))}</span>
            <span className="day-nav-date">{visibleDays[0].getDate()}</span>
          </div>
          <button className="day-nav-arrow" onClick={goToNextDay} aria-label="Jour suivant">
            ›
          </button>
        </div>
      )}

      {showListView && (
        <div className="list-view">
          {days
            .filter((d) => toISODate(d) >= toISODate(new Date()))
            .map((d) => {
            const iso = toISODate(d);
            const events = hebcal[iso] ?? [];
            const isHoliday = isFullyGreyedDay(events);
            const dayPresences = presences
              .filter((p) => p.date === iso)
              .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
            const candleTime = candleTimeFor(iso);

            const prevIso = addDaysISO(iso, -1);
            const wrappedInPresences = presences.filter(
              (p) => p.date === prevIso && isOvernight(p.startTime, p.endTime)
            );
            const dayBlocks = [
              ...dayPresences.map((p) => ({
                start: timeToMinutes(p.startTime),
                end: isOvernight(p.startTime, p.endTime) ? 1440 : timeToMinutes(p.endTime),
              })),
              ...wrappedInPresences.map((p) => ({ start: 0, end: timeToMinutes(p.endTime) })),
            ];
            const covers = (start: number, end: number) =>
              dayBlocks.some((b) => b.start <= start && b.end >= end);
            const festivalName = erevFestivalFor(iso);
            const prepHours = festivalName ? settings.holidayPrepHours : settings.shabbatPrepHours;
            const prepCutoffMin = candleTime ? timeToMinutes(candleTime) - prepHours * 60 : null;
            const afternoonEndForCheck =
              prepCutoffMin !== null
                ? Math.min(timeToMinutes(settings.afternoonEnd), prepCutoffMin)
                : timeToMinutes(settings.afternoonEnd);
            const isSaturday = isoWeekday(d) === 6;
            const matinCovered = covers(timeToMinutes(settings.morningStart), timeToMinutes(settings.morningEnd));
            const apremCovered = covers(timeToMinutes(settings.afternoonStart), afternoonEndForCheck);
            const nuitCovered = dayPresences.some((p) => p.period === "nuit");
            const dayComplete = isSaturday ? nuitCovered : matinCovered && apremCovered && nuitCovered;
            const journeeEndLabel = minutesToTime(afternoonEndForCheck);
            const tomorrowName = dayName(isoWeekday(addDays(d, 1)));
            const missing: string[] = [];
            if (isSaturday) {
              if (!nuitCovered) missing.push(`${havdalahTimeFor(iso) ?? settings.nightStart} → ${tomorrowName} ${settings.morningStart}`);
            } else {
              if (!matinCovered && !apremCovered) {
                missing.push(`${settings.morningStart} → ${journeeEndLabel}`);
              } else {
                if (!matinCovered) missing.push(`${settings.morningStart} → ${settings.morningEnd}`);
                if (!apremCovered) missing.push(`${settings.afternoonStart} → ${journeeEndLabel}`);
              }
              if (!nuitCovered) missing.push(`${settings.nightStart} → ${tomorrowName} ${settings.morningStart}`);
            }

            return (
              <div key={iso} className={`list-day-card ${isHoliday ? "holiday-day" : ""}`}>
                <div className="list-day-header">
                  <div>
                    <span className="list-day-name">{dayName(isoWeekday(d))}</span>
                    <span className="list-day-date">{d.getDate()}</span>
                  </div>
                  {isHoliday ? (
                    <span className="list-holiday-badge">🎉 Fête — rien à prendre</span>
                  ) : (
                    <button className="list-add-btn" onClick={() => setAddForDate(d)}>
                      + Ajouter
                    </button>
                  )}
                </div>

                {events.length > 0 && (
                  <div className="hebcal-chips" style={{ alignItems: "flex-start", marginBottom: 8 }}>
                    {events.map((ev, i) => (
                      <span
                        key={i}
                        className={`hebcal-chip ${ev.category === "candles" || ev.category === "havdalah" ? "time" : ""}`}
                      >
                        {ev.category === "candles" ? "🕯️ " : ev.category === "havdalah" ? "✨ " : ""}
                        {ev.title}
                      </span>
                    ))}
                  </div>
                )}

                {!isHoliday && (
                  <>
                    <div className="list-status-row">
                      <span className={`list-status-chip ${dayComplete ? "covered" : "uncovered"}`}>
                        {dayComplete
                          ? "✅ Planning complet"
                          : `⚠️ Planning incomplet — il manque : ${missing.join(", ")}`}
                      </span>
                    </div>

                    {dayPresences.length === 0 && wrappedInPresences.length === 0 && (
                      <p className="list-empty">Aucun créneau pris pour l'instant.</p>
                    )}

                    {wrappedInPresences.map((p) => {
                      const person = people.find((pp) => pp.id === p.personId);
                      const canReveal = isAdmin || p.personId === myPersonId;
                      return (
                        <div key={`${p.id}-wrap`} className="list-slot-row">
                          <span
                            className="list-slot-dot"
                            style={{ background: canReveal ? person?.color ?? "#94a3b8" : "#94a3b8" }}
                          />
                          <span className="list-slot-time">00:00–{p.endTime}</span>
                          <span className="list-slot-name">
                            {canReveal ? `${person?.name ?? "?"} (suite de la nuit)` : "Créneau pris"}
                          </span>
                          <span>🌙</span>
                        </div>
                      );
                    })}

                    {dayPresences.map((p) => {
                      const person = people.find((pp) => pp.id === p.personId);
                      const canReveal = isAdmin || p.personId === myPersonId;
                      const overnight = isOvernight(p.startTime, p.endTime);
                      return (
                        <div
                          key={p.id}
                          className="list-slot-row"
                          onClick={() => {
                            if (!canReveal) return;
                            if (confirm(`Supprimer la présence de ${person?.name} (${p.startTime}-${p.endTime}) ?`)) {
                              removePresence(p.id);
                            }
                          }}
                        >
                          <span
                            className="list-slot-dot"
                            style={{ background: canReveal ? person?.color ?? "#94a3b8" : "#94a3b8" }}
                          />
                          <span className="list-slot-time">
                            {p.startTime}–{overnight ? "minuit" : p.endTime}
                          </span>
                          <span className="list-slot-name">
                            {canReveal ? person?.name ?? "?" : "Créneau pris"}
                            {overnight ? ` (suite demain jusqu'à ${p.endTime})` : ""}
                          </span>
                          {p.period === "nuit" && <span>🌙</span>}
                          {p.mealForMamie && <span>🍽️</span>}
                          {p.exceptional && canReveal && <span title="Passage exceptionnel">⚡</span>}
                        </div>
                      );
                    })}

                    {settings.cleaningLadyEnabled && (
                      <div className="list-info-row">
                        🧑‍⚕️ Auxiliaire de vie ~{settings.cleaningLadyStart}-{settings.cleaningLadyEnd} (variable)
                      </div>
                    )}
                    {settings.odileEnabled && isoWeekday(d) !== 6 && (
                      <div className="list-info-row">
                        🧡 {settings.odileLabel} {settings.odileStart}-{settings.odileEnd}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!showListView && (
      <div ref={scrollPaneRef} className="grid-scroll-pane">
      <div
        className="week-grid"
        style={{ gridTemplateColumns: `56px repeat(${visibleDays.length}, 1fr)` }}
      >
        <div className="corner" />
        {visibleDays.map((d) => {
          const iso = toISODate(d);
          const events = hebcal[iso] ?? [];
          const isHoliday = isFullyGreyedDay(events);
          return (
            <div key={iso} className={`day-header ${isHoliday ? "holiday-day" : ""}`}>
              <span>{formatDayLabel(d)}</span>
              {isHoliday ? (
                <span className="holiday-lock" title="Jour de fête : toujours quelqu'un présent, pas besoin de créneau">
                  🎉
                </span>
              ) : (
                <button className="add-fab" onClick={() => setAddForDate(d)} aria-label="Ajouter">
                  +
                </button>
              )}
              {events.length > 0 && (
                <div className="hebcal-chips">
                  {events.map((ev, i) => (
                    <span
                      key={i}
                      className={`hebcal-chip ${ev.category === "candles" || ev.category === "havdalah" ? "time" : ""}`}
                    >
                      {ev.category === "candles" ? "🕯️ " : ev.category === "havdalah" ? "✨ " : ""}
                      {ev.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="hour-col" style={{ height: gridHeight }}>
          <HourLines />
        </div>

        {visibleDays.map((d) => {
          const iso = toISODate(d);
          const prevIso = addDaysISO(iso, -1);
          const isHoliday = isFullyGreyedDay(hebcal[iso] ?? []);

          const blocks = [
            ...presences
              .filter((p) => p.date === iso)
              .map((p) => ({
                p,
                top: timeToMinutes(p.startTime),
                bottom: isOvernight(p.startTime, p.endTime) ? 1440 : timeToMinutes(p.endTime),
                wrapped: false,
              })),
            ...presences
              .filter((p) => p.date === prevIso && isOvernight(p.startTime, p.endTime))
              .map((p) => ({ p, top: 0, bottom: timeToMinutes(p.endTime), wrapped: true })),
          ];

          const candleTime = candleTimeFor(iso);
          const candleMin = candleTime ? timeToMinutes(candleTime) : null;
          const festivalName = erevFestivalFor(iso);
          const prepHours = festivalName ? settings.holidayPrepHours : settings.shabbatPrepHours;
          const prepStart = candleMin !== null ? candleMin - prepHours * 60 : null;
          const prepLabel = festivalName ? `Prépa ${festivalName}` : "Prépa Chabbat";
          const shabbatPrepUncovered =
            prepStart !== null &&
            candleMin !== null &&
            !blocks.some((b) => b.top <= prepStart && b.bottom >= candleMin);

          const havdalahTime = havdalahTimeFor(iso);
          const havdalahMin = havdalahTime ? timeToMinutes(havdalahTime) : null;

          return (
            <div key={iso} className={`day-col ${isHoliday ? "holiday-day" : ""}`} style={{ height: gridHeight }}>
              <HourLines />

              {candleMin !== null && (
                <div
                  className="shabbat-grey-band"
                  style={{ top: candleMin * PX_PER_MIN, height: (1440 - candleMin) * PX_PER_MIN }}
                  title="Chabbat : quelqu'un est toujours là, pas besoin de créneau"
                />
              )}
              {havdalahMin !== null && (
                <div
                  className="shabbat-grey-band"
                  style={{ top: 0, height: havdalahMin * PX_PER_MIN }}
                  title="Chabbat : quelqu'un est toujours là, pas besoin de créneau"
                />
              )}

              {cleaningStart !== null && cleaningEnd !== null && (
                <div
                  className="cleaning-band"
                  style={{
                    top: (cleaningStart - DAY_START) * PX_PER_MIN,
                    height: (cleaningEnd - cleaningStart) * PX_PER_MIN,
                  }}
                  title={settings.cleaningLadyNote}
                >
                  🧑‍⚕️ Auxiliaire de vie (variable)
                </div>
              )}

              {odileStart !== null && odileEnd !== null && isoWeekday(d) !== 6 && (
                <div
                  className="odile-band"
                  style={{
                    top: (odileStart - DAY_START) * PX_PER_MIN,
                    height: (odileEnd - odileStart) * PX_PER_MIN,
                  }}
                  title={`${settings.odileLabel} est présente en fixe à cette heure`}
                >
                  🧡 {settings.odileLabel}
                </div>
              )}

              {prepStart !== null && candleMin !== null && (
                <div
                  className={`shabbat-band ${shabbatPrepUncovered ? "uncovered" : ""}`}
                  style={{
                    top: (prepStart - DAY_START) * PX_PER_MIN,
                    height: (candleMin - prepStart) * PX_PER_MIN,
                  }}
                  title={`Il faut quelqu'un pour préparer ${festivalName ?? "Chabbat"}, au moins ${prepHours}h avant l'allumage`}
                >
                  🕯️ {prepLabel}{shabbatPrepUncovered ? " ⚠️" : ""}
                </div>
              )}

              {blocks.map(({ p, top, bottom, wrapped }) => {
                const person = people.find((pp) => pp.id === p.personId);
                const pxTop = (top - DAY_START) * PX_PER_MIN;
                const height = (bottom - top) * PX_PER_MIN;
                const canReveal = isAdmin || p.personId === myPersonId;
                return (
                  <div
                    key={`${p.id}-${wrapped ? "wrap" : "main"}`}
                    className={`presence-block ${p.exceptional && canReveal ? "exceptional" : ""} ${
                      canReveal ? "" : "anonymous"
                    }`}
                    style={{
                      top: pxTop,
                      height: Math.max(height, 20),
                      background: canReveal ? person?.color ?? "#94a3b8" : undefined,
                    }}
                    onClick={() => {
                      if (!canReveal) return;
                      if (confirm(`Supprimer la présence de ${person?.name} (${p.startTime}-${p.endTime}) ?`)) {
                        removePresence(p.id);
                      }
                    }}
                  >
                    {canReveal ? (
                      <>
                        <span className="presence-name">{person?.name ?? "?"}</span>
                        <span className="presence-time">
                          {p.startTime}–{p.endTime}
                          {p.period === "nuit" ? " 🌙" : ""}
                          {wrapped ? " (suite)" : ""}
                        </span>
                        {p.mealForMamie && <span className="presence-meal">🍽️</span>}
                        {p.exceptional && (
                          <span className="presence-exceptional" title="Passage exceptionnel">
                            ⚡
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="presence-name">Créneau pris</span>
                        {p.mealForMamie && <span className="presence-meal">🍽️</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      </div>
      )}

      {addForDate &&
        (() => {
          const addForIso = toISODate(addForDate);
          const addForCandle = candleTimeFor(addForIso);
          const addForFestival = erevFestivalFor(addForIso);
          const addForPrepHours = addForFestival ? settings.holidayPrepHours : settings.shabbatPrepHours;
          const addForCutoff = addForCandle
            ? minutesToTime(timeToMinutes(addForCandle) - addForPrepHours * 60)
            : undefined;

          const nextIso = addDaysISO(addForIso, 1);
          const nextCandle = candleTimeFor(nextIso);
          const nextFestival = erevFestivalFor(nextIso);
          const nextPrepHours = nextFestival ? settings.holidayPrepHours : settings.shabbatPrepHours;
          const nextCutoff = nextCandle
            ? minutesToTime(timeToMinutes(nextCandle) - nextPrepHours * 60)
            : undefined;

          return (
            <AddPresenceSheet
              date={addForDate}
              candleTime={addForCandle ?? undefined}
              havdalahTime={havdalahTimeFor(addForIso) ?? undefined}
              endingFestivalName={yomtovEndingFor(addForIso) ?? undefined}
              prepCutoff={addForCutoff}
              festivalName={addForFestival ?? undefined}
              nextDayPrepCutoff={nextCutoff}
              nextDayFestivalName={nextFestival ?? undefined}
              nextDayCandleTime={nextCandle ?? undefined}
              onClose={() => setAddForDate(null)}
            />
          );
        })()}
    </div>
  );
}
