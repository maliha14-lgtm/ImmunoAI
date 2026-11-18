import { Settings as SettingsIcon } from 'lucide-react';

export const SettingsView = () => {
  return (
    <div className="settings-view-container">
      <div className="settings-card">
        <div className="settings-header-icon-box">
          <SettingsIcon size={32} className="settings-main-icon" />
        </div>
        <h2 className="settings-title">Settings</h2>
        <p className="settings-subtitle">
          ImmunoAI system configuration, Deep Learning model parameters, and alert thresholds will be configured here.
        </p>
      </div>
    </div>
  );
};
