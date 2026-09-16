import { useState } from "react";
import { useStore } from "../store";
import { dayName, formatDayLabel, isoWeekday, toISODate } from "../utils/date";
import { MY_PERSON_KEY } from "../constants";

const PALETTE = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ef4444", "#14b8a6", "#ec4899"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SimplePeriod = "matin" | "apres-midi" | "journee" | "nuit";

interface Props {
  date: Date;
  period: SimplePeriod;
  startTime: string;
  endTime: string;
  onClose: () => void;
}

const PERIOD_LABEL: Record<SimplePeriod, string> = {
  matin: "🟢 Matin",
  "apres-midi": "🔵 Après-midi",
  journee: "☀️ Journée",
  nuit: "🌙 Nuit",
};

export function QuickBookSheet({ date, period, startTime, endTime, onClose }: Props) {
  const { people, settings, addPerson, updatePerson, addPresence } = useStore();
  const isoDate = toISODate(date);

  const [personId, setPersonId] = useState<string | null>(() => {
    const saved = localStorage.getItem(MY_PERSON_KEY);
    return saved && people.some((p) => p.id === saved) ? saved : null;
  });
  const [meal, setMeal] = useState<boolean | null>(null);
  const [newName, setNewName] = useState("");
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [emailDraft, setEmailDraft] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);
  const [endOverride, setEndOverride] = useState(endTime);

  const finalEndTime = showAdjust ? endOverride : endTime;

  const selectedPerson = people.find((p) => p.id === personId);
  const mealQuestionApplies = period === "matin" || period === "journee";

  const selectPerson = (id: string) => {
    setPersonId(id);
    setEmailDraft("");
    localStorage.setItem(MY_PERSON_KEY, id);
  };

  const saveEmail = () => {
    const email = emailDraft.trim();
    if (EMAIL_RE.test(email) && personId) updatePerson(personId, { email });
  };

  const emailOk = !selectedPerson || !!selectedPerson.email || EMAIL_RE.test(emailDraft.trim());
  const mealAnswered = !mealQuestionApplies || meal !== null;
  const canValidate = personId !== null && emailOk && mealAnswered;

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
    if (!canValidate || !personId) return;
    saveEmail();

    addPresence({
      personId,
      date: isoDate,
      period,
      startTime,
      endTime: finalEndTime,
      mealForMamie: meal ?? false,
      exceptional: false,
    });

    const email = selectedPerson?.email || emailDraft.trim();
    if (email) {
      fetch("/api/send-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toEmail: email,
          toName: selectedPerson?.name ?? "",
          dayLabel: formatDayLabel(date),
          startTime,
          endTime: finalEndTime,
          periodEmoji: period === "nuit" ? "🌙" : "☀️",
        }),
      }).catch(() => {});
    }

    onClose();
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>Réserver ce créneau</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="quick-book-summary">
          <div className="quick-book-day">
            {dayName(isoWeekday(date))} {date.getDate()}
          </div>
          <div className="quick-book-slot">
            {PERIOD_LABEL[period]} — {startTime} → {finalEndTime}
          </div>
          {!showAdjust ? (
            <button className="text-btn more-options-btn" onClick={() => setShowAdjust(true)}>
              Je pars plus tôt ou je reste plus longtemps →
            </button>
          ) : (
            <div className="custom-time-row" style={{ marginTop: 10, justifyContent: "center" }}>
              <label>
                Heure de départ
                <input
                  type="time"
                  value={endOverride}
                  onChange={(e) => setEndOverride(e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="sheet-section">
          <h3>Qui êtes-vous ?</h3>
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

        {mealQuestionApplies && (
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

        <button className="validate-btn" disabled={!canValidate} onClick={handleValidate}>
          ✓ Valider
        </button>
      </div>
    </div>
  );
}
