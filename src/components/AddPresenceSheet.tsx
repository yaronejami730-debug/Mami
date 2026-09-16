import { useMemo, useState } from "react";
import { useStore } from "../store";
import type { Period } from "../types";
import { addDays, addDaysISO, dayName, formatDayLabel, isoWeekday, timeToMinutes, toISODate } from "../utils/date";
import { MY_PERSON_KEY } from "../constants";

const PALETTE = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#ec4899"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  date: Date;
  candleTime?: string;
  havdalahTime?: string;
  prepCutoff?: string;
  festivalName?: string;
  nextDayPrepCutoff?: string;
  nextDayFestivalName?: string;
  nextDayCandleTime?: string;
  endingFestivalName?: string;
  onClose: () => void;
}

const CLAMPABLE_PERIODS: Period[] = ["matin", "apres-midi", "journee", "personnalise"];

export function AddPresenceSheet({
  date,
  candleTime,
  havdalahTime,
  prepCutoff,
  festivalName,
  nextDayPrepCutoff,
  nextDayFestivalName,
  nextDayCandleTime,
  endingFestivalName,
  onClose,
}: Props) {
  const { people, settings, addPerson, updatePerson, addPresence, findOverlap } = useStore();
  const isoDate = toISODate(date);

  const [personId, setPersonId] = useState<string | null>(() => {
    const saved = localStorage.getItem(MY_PERSON_KEY);
    return saved && people.some((p) => p.id === saved) ? saved : null;
  });
  const [period, setPeriod] = useState<Period | null>(() => {
    const saved = people.find((p) => p.id === personId);
    return saved?.nightOnly ? "nuit" : null;
  });
  const [meal, setMeal] = useState<boolean | null>(null);
  const [newName, setNewName] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [customStart, setCustomStart] = useState("14:00");
  const [customEnd, setCustomEnd] = useState("16:00");
  const [exceptional, setExceptional] = useState<boolean | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [nightEndOverride, setNightEndOverride] = useState<string | null>(null);
  const [wantsEarlyDeparture, setWantsEarlyDeparture] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(false);

  const selectedPerson = people.find((p) => p.id === personId);

  const selectPerson = (id: string) => {
    setPersonId(id);
    setEmailDraft("");
    localStorage.setItem(MY_PERSON_KEY, id);
  };

  const saveEmail = () => {
    const email = emailDraft.trim();
    if (EMAIL_RE.test(email) && personId) updatePerson(personId, { email });
  };

  const nominalRange = useMemo(() => {
    if (period === "matin") return { start: settings.morningStart, end: settings.morningEnd };
    if (period === "apres-midi") return { start: settings.afternoonStart, end: settings.afternoonEnd };
    if (period === "journee") return { start: settings.morningStart, end: settings.afternoonEnd };
    if (period === "personnalise") return { start: customStart, end: customEnd };
    if (period === "nuit") {
      const defaultEnd = selectedPerson?.nightOnly ? settings.morningStart : settings.nightEnd;
      return { start: havdalahTime ?? settings.nightStart, end: nightEndOverride ?? defaultEnd };
    }
    if (period === "jusqua-chabbat" && candleTime) return { start: settings.afternoonStart, end: candleTime };
    return null;
  }, [period, settings, customStart, customEnd, candleTime, havdalahTime, nightEndOverride, selectedPerson]);

  const activeFestivalName = period === "nuit" ? nextDayFestivalName : festivalName;

  const range = useMemo(() => {
    if (!nominalRange) return null;
    if (period && CLAMPABLE_PERIODS.includes(period) && prepCutoff) {
      const cutoffMin = timeToMinutes(prepCutoff);
      const startMin = timeToMinutes(nominalRange.start);
      const endMin = timeToMinutes(nominalRange.end);
      if (endMin > cutoffMin && cutoffMin > startMin) {
        return { start: nominalRange.start, end: prepCutoff };
      }
    }
    if (period === "nuit" && nextDayPrepCutoff) {
      const cutoffMin = timeToMinutes(nextDayPrepCutoff);
      const endMin = timeToMinutes(nominalRange.end);
      if (endMin > cutoffMin) {
        return { start: nominalRange.start, end: nextDayPrepCutoff };
      }
    }
    return nominalRange;
  }, [nominalRange, period, prepCutoff, nextDayPrepCutoff]);

  const wasClamped = range !== null && nominalRange !== null && range.end !== nominalRange.end;

  const conflict = useMemo(() => {
    if (!range) return undefined;
    return findOverlap(isoDate, range.start, range.end);
  }, [range, isoDate, findOverlap]);

  const conflictPerson = conflict ? people.find((p) => p.id === conflict.personId) : undefined;

  const mealQuestionApplies = period === "matin" || period === "journee";
  const mealAnswered = !mealQuestionApplies || meal !== null;

  const exceptionalQuestionApplies = period === "personnalise";
  const exceptionalAnswered = !exceptionalQuestionApplies || exceptional !== null;

  const emailOk = !selectedPerson || !!selectedPerson.email || EMAIL_RE.test(emailDraft.trim());

  const canValidate =
    period !== null &&
    personId !== null &&
    emailOk &&
    mealAnswered &&
    exceptionalAnswered &&
    !conflict &&
    range !== null &&
    (period === "nuit" || timeToMinutes(range.start) < timeToMinutes(range.end));

  const handleAddPerson = () => {
    const name = newName.trim();
    if (!name) return;
    const color = PALETTE[people.length % PALETTE.length];
    const p = addPerson(name, color);
    selectPerson(p.id);
    setNewName("");
    setShowAddPerson(false);
  };

  const handleValidate = () => {
    if (!canValidate || !range || !personId || !period) return;
    saveEmail();

    const dates = repeatWeeks ? [0, 1, 2, 3].map((n) => addDaysISO(isoDate, n * 7)) : [isoDate];
    const skipped: string[] = [];

    for (const d of dates) {
      if (d !== isoDate && findOverlap(d, range.start, range.end)) {
        skipped.push(d);
        continue;
      }
      addPresence({
        personId,
        date: d,
        period,
        startTime: range.start,
        endTime: range.end,
        mealForMamie: meal ?? false,
        exceptional: period === "personnalise" ? exceptional ?? false : false,
      });
    }

    if (skipped.length > 0) {
      alert(
        `Créneau ajouté, mais ${skipped.length} semaine(s) sautée(s) car déjà occupée(s) : ${skipped.join(", ")}. Vous pouvez les ajouter séparément.`
      );
    }
    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Ajouter une présence</h2>
          <span className="sheet-date">{formatDayLabel(date)}</span>
          <button className="sheet-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="sheet-section">
          <h3>Vous êtes disponible plutôt la journée ou la nuit ?</h3>
          {selectedPerson?.nightOnly && (
            <p className="approx-note" style={{ marginBottom: 10 }}>
              🌙 {selectedPerson.name} travaille la journée — seule la nuit est proposée.
            </p>
          )}
          <div className="option-grid">
            {!selectedPerson?.nightOnly && (
              <button
                className={`option-btn ${period === "journee" ? "selected" : ""}`}
                onClick={() => setPeriod("journee")}
              >
                ☀️ Journée
                <span>{settings.morningStart} → {settings.afternoonEnd}</span>
              </button>
            )}
            <button
              className={`option-btn ${period === "nuit" ? "selected" : ""}`}
              onClick={() => setPeriod("nuit")}
            >
              🌙 Nuit
              <span>
                {havdalahTime ? (
                  <>
                    Sortie de {endingFestivalName ?? "Chabbat"} ({havdalahTime}) → {dayName(isoWeekday(addDays(date, 1)))}{" "}
                    env. {settings.nightEnd}
                  </>
                ) : (
                  <>
                    {settings.nightStart} → env. {settings.nightEnd} (lendemain)
                  </>
                )}
              </span>
            </button>
          </div>

          {period === "nuit" && !selectedPerson?.nightOnly && !wantsEarlyDeparture && (
            <button
              className="text-btn more-options-btn"
              onClick={() => setWantsEarlyDeparture(true)}
            >
              Je ne suis pas disponible toute la journée de demain →
            </button>
          )}

          {period === "nuit" && !selectedPerson?.nightOnly && wantsEarlyDeparture && (
            <div className="clamp-warning">
              ⚠️ Par défaut vous n'êtes pas disponible de toute la journée de demain (24h) — précisez une heure de
              départ plus tôt.
              <div className="custom-time-row" style={{ marginTop: 8 }}>
                <label>
                  Départ le lendemain (approximatif)
                  <input
                    autoFocus
                    type="time"
                    value={nightEndOverride ?? settings.nightEnd}
                    onChange={(e) => setNightEndOverride(e.target.value)}
                  />
                </label>
              </div>
              {!wasClamped && (
                <p className="approx-note">
                  ⏰ Techniquement le créneau va jusqu'à 21h, mais vous ne finissez pas forcément à 21h pile : en
                  pratique c'est souvent entre 19h30 et 20h30 (parfois jusqu'à 21h), selon l'heure d'arrivée de la
                  relève. C'est juste une précaution pour que {settings.mamieName} ne reste jamais seule.
                </p>
              )}
            </div>
          )}

          {!selectedPerson?.nightOnly && !showMoreOptions && period !== "personnalise" && period !== "matin" && period !== "apres-midi" && period !== "jusqua-chabbat" && (
            <button className="text-btn more-options-btn" onClick={() => setShowMoreOptions(true)}>
              Pas disponible toute la journée ? Créneau matin/après-midi →
            </button>
          )}

          {!selectedPerson?.nightOnly && (showMoreOptions || period === "matin" || period === "apres-midi" || period === "personnalise" || period === "jusqua-chabbat") && (
            <div className="option-grid" style={{ marginTop: 10 }}>
              <button
                className={`option-btn ${period === "matin" ? "selected" : ""}`}
                onClick={() => setPeriod("matin")}
              >
                🟢 Matin
                <span>{settings.morningStart} → {settings.morningEnd}</span>
              </button>
              <button
                className={`option-btn ${period === "apres-midi" ? "selected" : ""}`}
                onClick={() => setPeriod("apres-midi")}
              >
                🔵 Après-midi
                <span>{settings.afternoonStart} → {settings.afternoonEnd}</span>
              </button>
              <button
                className={`option-btn ${period === "personnalise" ? "selected" : ""}`}
                onClick={() => setPeriod("personnalise")}
              >
                🟠 Créneau personnalisé
                <span>Choisissez vos horaires</span>
              </button>
              {candleTime && (
                <button
                  className={`option-btn ${period === "jusqua-chabbat" ? "selected" : ""}`}
                  onClick={() => setPeriod("jusqua-chabbat")}
                >
                  🕯️ Jusqu'à l'allumage
                  <span>{settings.afternoonStart} → {candleTime}</span>
                </button>
              )}
            </div>
          )}

          {period === "personnalise" && (
            <div className="custom-time-row">
              <label>
                De
                <input
                  type="time"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                />
              </label>
              <label>
                À
                <input
                  type="time"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        {wasClamped && range && (
          <div className="clamp-warning">
            {selectedPerson ? `${selectedPerson.name}, vous` : "Vous"} pourrez partir à partir de{" "}
            <strong>{range.end}</strong> car {activeFestivalName ?? "Chabbat"} commence à{" "}
            {(period === "nuit" ? nextDayCandleTime : candleTime) ?? "l'heure de l'allumage"} — une relève vous
            relèvera directement.
          </div>
        )}

        {conflict && conflictPerson && (
          <div className="conflict-warning">
            <strong>⚠️ Ce créneau est déjà occupé</strong>
            <p>
              {conflictPerson.name} est prévu·e de {conflict.startTime} à {conflict.endTime}.
            </p>
            <p>Choisissez un autre créneau.</p>
          </div>
        )}

        <div className="sheet-section">
          <h3>Qui sera présent ?</h3>
          <div className="people-grid">
            {people.map((p) => (
              <button
                key={p.id}
                className={`person-btn ${personId === p.id ? "selected" : ""}`}
                style={{ "--person-color": p.color } as React.CSSProperties}
                onClick={() => selectPerson(p.id)}
              >
                <span className="dot" /> {p.name}
              </button>
            ))}
            {!showAddPerson && (
              <button className="person-btn add" onClick={() => setShowAddPerson(true)}>
                ➕ Ajouter une personne
              </button>
            )}
          </div>
          {showAddPerson && (
            <div className="add-person-row">
              <input
                autoFocus
                placeholder="Prénom"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
              />
              <button onClick={handleAddPerson}>Ajouter</button>
            </div>
          )}
          {selectedPerson && !selectedPerson.email && (
            <div className="email-required">
              <label>
                Email de {selectedPerson.name} (obligatoire, une seule fois)
                <input
                  type="email"
                  placeholder="prenom@exemple.com"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  onBlur={saveEmail}
                  onKeyDown={(e) => e.key === "Enter" && saveEmail()}
                />
              </label>
              {emailDraft.trim() !== "" && !EMAIL_RE.test(emailDraft.trim()) && (
                <span className="email-invalid">Email invalide</span>
              )}
            </div>
          )}
        </div>

        {(period === "matin" || period === "journee") && (
          <div className="sheet-section">
            <h3>Est-ce que vous faites à manger pour {settings.mamieName} ?</h3>
            <div className="option-grid two">
              <button
                className={`option-btn ${meal === true ? "selected" : ""}`}
                onClick={() => setMeal(true)}
              >
                ✅ Oui
              </button>
              <button
                className={`option-btn ${meal === false ? "selected" : ""}`}
                onClick={() => setMeal(false)}
              >
                ❌ Non
              </button>
            </div>
            {meal === true && (
              <div className="meal-note">
                <strong>🗒️ Consigne repas</strong>
                <p>{settings.mealInstruction}</p>
              </div>
            )}
          </div>
        )}

        {period === "personnalise" && (
          <div className="sheet-section">
            <h3>Vous venez exceptionnellement ?</h3>
            <div className="option-grid two">
              <button
                className={`option-btn ${exceptional === true ? "selected" : ""}`}
                onClick={() => setExceptional(true)}
              >
                ☑️ Oui
              </button>
              <button
                className={`option-btn ${exceptional === false ? "selected" : ""}`}
                onClick={() => setExceptional(false)}
              >
                ☐ Non, créneau habituel
              </button>
            </div>
          </div>
        )}

        {period && (
          <div className="sheet-section">
            <h3>Répéter ce créneau les prochaines semaines ?</h3>
            <div className="option-grid two">
              <button
                className={`option-btn ${!repeatWeeks ? "selected" : ""}`}
                onClick={() => setRepeatWeeks(false)}
              >
                Juste cette semaine
              </button>
              <button
                className={`option-btn ${repeatWeeks ? "selected" : ""}`}
                onClick={() => setRepeatWeeks(true)}
              >
                Répéter 4 semaines
                <span>Modifiable après</span>
              </button>
            </div>
          </div>
        )}

        <button className="validate-btn" disabled={!canValidate} onClick={handleValidate}>
          ✓ Valider
        </button>
      </div>
    </div>
  );
}
