import { useState } from "react";
import { useStore } from "../store";

interface Props {
  onUnlock: () => void;
  onClose: () => void;
}

export function AdminUnlock({ onUnlock, onClose }: Props) {
  const { settings } = useStore();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (code === settings.adminCode) {
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet admin-unlock-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>🔐 Administrateur</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p>Entrez le code d'accès pour voir les noms sur le planning et modifier les paramètres.</p>
        <input
          autoFocus
          type="password"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Code d'accès"
        />
        {error && <span className="email-invalid">Code incorrect</span>}
        <button className="validate-btn" onClick={submit} style={{ marginTop: 12 }}>
          Déverrouiller
        </button>
      </div>
    </div>
  );
}
