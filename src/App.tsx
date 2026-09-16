import { useState } from "react";
import { StoreContext, useStoreState } from "./store";
import { WeekGrid } from "./components/WeekGrid";
import { SettingsPanel } from "./components/SettingsPanel";
import { AdminUnlock } from "./components/AdminUnlock";
import { ADMIN_UNLOCK_KEY } from "./constants";
import "./App.css";

export default function App() {
  const store = useStoreState();
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminUnlock, setShowAdminUnlock] = useState(false);
  const [pendingSettingsAfterUnlock, setPendingSettingsAfterUnlock] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_UNLOCK_KEY) === "1");

  const unlock = () => {
    localStorage.setItem(ADMIN_UNLOCK_KEY, "1");
    setIsAdmin(true);
    setShowAdminUnlock(false);
    if (pendingSettingsAfterUnlock) {
      setShowSettings(true);
      setPendingSettingsAfterUnlock(false);
    }
  };

  const handleAdminButton = () => {
    if (isAdmin) {
      localStorage.removeItem(ADMIN_UNLOCK_KEY);
      setIsAdmin(false);
    } else {
      setPendingSettingsAfterUnlock(false);
      setShowAdminUnlock(true);
    }
  };

  const handleSettingsButton = () => {
    if (isAdmin) {
      setShowSettings(true);
    } else {
      setPendingSettingsAfterUnlock(true);
      setShowAdminUnlock(true);
    }
  };

  return (
    <StoreContext.Provider value={store}>
      <div className="app">
        <header className="app-header">
          <h1>📅 Planning famille</h1>
          <div className="header-buttons">
            <button className="admin-btn" onClick={handleAdminButton}>
              {isAdmin ? "🔓 Admin" : "🔐 Admin"}
            </button>
            <button className="settings-btn" onClick={handleSettingsButton}>
              ⚙️
            </button>
          </div>
        </header>
        <WeekGrid isAdmin={isAdmin} />
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {showAdminUnlock && (
          <AdminUnlock
            onUnlock={unlock}
            onClose={() => {
              setShowAdminUnlock(false);
              setPendingSettingsAfterUnlock(false);
            }}
          />
        )}
      </div>
    </StoreContext.Provider>
  );
}
