import { Shield, ShieldAlert } from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const ProtectionCard = () => {
  const { protectionMode, toggleProtectionMode, activeAlert } = useSecurity();

  return (
    <div
      className={`smart-card protection-card ${protectionMode ? 'is-active armed-glow' : ''} ${
        activeAlert ? 'alert-danger-pulse' : ''
      }`}
      onClick={toggleProtectionMode}
      role="button"
      tabIndex={0}
      title="Toggle ImmunoAI Protection Mode (Intruder Detection ARMED / Standby)"
    >
      <div className="card-top-row">
        <div className="card-icon-title">
          {protectionMode ? (
            <ShieldAlert size={20} className="card-icon armed-icon" />
          ) : (
            <Shield size={20} className="card-icon" />
          )}
        </div>
        <span className={`status-tag ${protectionMode ? 'armed-tag' : ''}`}>
          {protectionMode ? 'ARMED' : 'Standby'}
        </span>
      </div>

      <div className="card-main-info">
        <div className="card-device-name">Protection Mode</div>
        <div className="card-subtext">
          {protectionMode ? 'Intruder Detection Active' : 'Standby • Protection Off'}
        </div>
      </div>

      {/* Pill Toggle Switch */}
      <div className="card-bottom-toggle">
        <div className={`switch-pill ${protectionMode ? 'checked' : ''}`}>
          <div className="switch-thumb"></div>
        </div>
      </div>
    </div>
  );
};
