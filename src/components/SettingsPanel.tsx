import { useState } from "react";
import { useStore } from "../store";

const WEEKDAYS = [
  { wd: 1, label: "Lun" },
  { wd: 2, label: "Mar" },
  { wd: 3, label: "Mer" },
  { wd: 4, label: "Jeu" },
  { wd: 5, label: "Ven" },
  { wd: 6, label: "Sam" },
  { wd: 7, label: "Dim" },
];

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { people, settings, updateSettings, addPerson, removePerson } = useStore();
  const [newPersonName, setNewPersonName] = useState("");

  const toggleDay = (wd: number) => {
    const has = settings.daysShown.includes(wd);
    const next = has ? settings.daysShown.filter((d) => d !== wd) : [...settings.daysShown, wd];
    updateSettings({ daysShown: next });
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet settings-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>⚙️ Paramètres</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="sheet-section">
          <h3>Personnes</h3>
          <div className="people-list">
            {people.map((p) => (
              <div key={p.id} className="people-list-row">
                <span className="dot" style={{ background: p.color }} />
                <span className="grow">{p.name}</span>
                <button className="text-btn danger" onClick={() => removePerson(p.id)}>
                  Supprimer
                </button>
              </div>
            ))}
          </div>
          <div className="add-person-row">
            <input
              placeholder="Prénom"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newPersonName.trim()) {
                  addPerson(newPersonName.trim(), "#64748b");
                  setNewPersonName("");
                }
              }}
            />
            <button
              onClick={() => {
                if (newPersonName.trim()) {
                  addPerson(newPersonName.trim(), "#64748b");
                  setNewPersonName("");
                }
              }}
            >
              Ajouter
            </button>
          </div>
        </div>

        <div className="sheet-section">
          <h3>Horaires</h3>
          <div className="settings-grid">
            <label>
              Matin – début
              <input
                type="time"
                value={settings.morningStart}
                onChange={(e) => updateSettings({ morningStart: e.target.value })}
              />
            </label>
            <label>
              Matin – fin
              <input
                type="time"
                value={settings.morningEnd}
                onChange={(e) => updateSettings({ morningEnd: e.target.value })}
              />
            </label>
            <label>
              Après-midi – début
              <input
                type="time"
                value={settings.afternoonStart}
                onChange={(e) => updateSettings({ afternoonStart: e.target.value })}
              />
            </label>
            <label>
              Après-midi – fin
              <input
                type="time"
                value={settings.afternoonEnd}
                onChange={(e) => updateSettings({ afternoonEnd: e.target.value })}
              />
            </label>
            <label>
              Nuit – début
              <input
                type="time"
                value={settings.nightStart}
                onChange={(e) => updateSettings({ nightStart: e.target.value })}
              />
            </label>
            <label>
              Nuit – fin (lendemain)
              <input
                type="time"
                value={settings.nightEnd}
                onChange={(e) => updateSettings({ nightEnd: e.target.value })}
              />
            </label>
          </div>
        </div>

        <div className="sheet-section">
          <h3>Auxiliaire de vie (dame qui lave Mamie)</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.cleaningLadyEnabled}
              onChange={(e) => updateSettings({ cleaningLadyEnabled: e.target.checked })}
            />
            Afficher le créneau auxiliaire de vie tous les jours
          </label>
          {settings.cleaningLadyEnabled && (
            <>
              <div className="settings-grid">
                <label>
                  Début (au plus tôt)
                  <input
                    type="time"
                    value={settings.cleaningLadyStart}
                    onChange={(e) => updateSettings({ cleaningLadyStart: e.target.value })}
                  />
                </label>
                <label>
                  Fin (au plus tard)
                  <input
                    type="time"
                    value={settings.cleaningLadyEnd}
                    onChange={(e) => updateSettings({ cleaningLadyEnd: e.target.value })}
                  />
                </label>
              </div>
              <label className="full-label">
                Consigne
                <textarea
                  rows={2}
                  value={settings.cleaningLadyNote}
                  onChange={(e) => updateSettings({ cleaningLadyNote: e.target.value })}
                />
              </label>
            </>
          )}
        </div>

        <div className="sheet-section">
          <h3>Calendrier hébraïque</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.hebcalEnabled}
              onChange={(e) => updateSettings({ hebcalEnabled: e.target.checked })}
            />
            Afficher Shabbat / fêtes / jeûnes (via hebcal.com)
          </label>
          {settings.hebcalEnabled && (
            <>
              <label className="full-label">
                Ville (geonameid hebcal.com)
                <input
                  value={settings.hebcalGeonameId}
                  onChange={(e) => updateSettings({ hebcalGeonameId: e.target.value })}
                />
              </label>
              <div className="settings-grid">
                <label>
                  Prépa Chabbat (h avant allumage)
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={settings.shabbatPrepHours}
                    onChange={(e) => updateSettings({ shabbatPrepHours: Number(e.target.value) })}
                  />
                </label>
                <label>
                  Prépa fêtes (h avant allumage)
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={settings.holidayPrepHours}
                    onChange={(e) => updateSettings({ holidayPrepHours: Number(e.target.value) })}
                  />
                </label>
              </div>
            </>
          )}
        </div>

        <div className="sheet-section">
          <h3>Jours affichés</h3>
          <div className="days-toggle">
            {WEEKDAYS.map(({ wd, label }) => (
              <button
                key={wd}
                className={`day-toggle-btn ${settings.daysShown.includes(wd) ? "selected" : ""}`}
                onClick={() => toggleDay(wd)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-section">
          <h3>Repas / médicament</h3>
          <label className="full-label">
            Nom
            <input
              value={settings.mamieName}
              onChange={(e) => updateSettings({ mamieName: e.target.value })}
            />
          </label>
          <label className="full-label">
            Médicament / consigne
            <input
              value={settings.medicationName}
              onChange={(e) => updateSettings({ medicationName: e.target.value })}
            />
          </label>
          <label className="full-label">
            Texte consigne repas
            <textarea
              rows={4}
              value={settings.mealInstruction}
              onChange={(e) => updateSettings({ mealInstruction: e.target.value })}
            />
          </label>
        </div>

        <div className="sheet-section">
          <h3>Présence fixe (Odile)</h3>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.odileEnabled}
              onChange={(e) => updateSettings({ odileEnabled: e.target.checked })}
            />
            Afficher le créneau fixe tous les soirs (sauf samedi)
          </label>
          {settings.odileEnabled && (
            <div className="settings-grid">
              <label>
                Nom
                <input
                  value={settings.odileLabel}
                  onChange={(e) => updateSettings({ odileLabel: e.target.value })}
                />
              </label>
              <label>
                Début
                <input
                  type="time"
                  value={settings.odileStart}
                  onChange={(e) => updateSettings({ odileStart: e.target.value })}
                />
              </label>
              <label>
                Fin
                <input
                  type="time"
                  value={settings.odileEnd}
                  onChange={(e) => updateSettings({ odileEnd: e.target.value })}
                />
              </label>
            </div>
          )}
        </div>

        <div className="sheet-section">
          <h3>Administrateur</h3>
          <label className="full-label">
            Code d'accès admin
            <input
              value={settings.adminCode}
              onChange={(e) => updateSettings({ adminCode: e.target.value })}
            />
          </label>
          <p className="admin-note">
            Ce code débloque la vue avec les noms des personnes sur le planning. Sans lui, seul "créneau pris"
            est visible. Pas une vraie sécurité (visible en base) — juste un filtre d'usage normal.
          </p>
        </div>
      </div>
    </div>
  );
}
