import { ShieldAlert, Volume2, VolumeX, CheckCircle, Clock } from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const IntruderAlertBanner = () => {
  const { activeAlert, dismissAlert, isMutedState, toggleMute, alertCountdown } = useSecurity();

  if (!activeAlert) return null;

  return (
    <aside className="floating-intruder-alert" aria-label="Security Emergency Alert">
      <div className="alert-content-box">
        {/* Sleek Glowing Shield Indicator */}
        <div className="alert-flashing-icon">
          <ShieldAlert size={22} />
        </div>

        {/* Informational Group */}
        <div className="alert-text-group">
          <div className="alert-head-line">
            <span className="danger-pill">HIGH ALERT</span>
            <span className="alert-head-title">INTRUDER CONFIRMED</span>
            <span className="alert-time-tag">{activeAlert.timestamp}</span>
            <span className="alert-countdown-pill" title="Auto-acknowledges to resume surveillance">
              <Clock size={11} />
              Auto-acknowledge: {alertCountdown}s
            </span>
          </div>

          <div className="alert-details">
            Unauthorized individual identified via <strong>{activeAlert.cameraName || 'Attached System Camera'}</strong>.
          </div>

          <div className="alert-meta-chips">
            <span className="alert-chip confidence-chip">
              Confidence: <strong>{activeAlert.confidence}%</strong>
            </span>
            <span className="alert-chip location-chip">
              Zone: <strong>{activeAlert.location || 'Monitored Perimeter'}</strong>
            </span>
          </div>
        </div>

        {/* Quick Response Actions */}
        <div className="alert-actions-group">
          <button
            className={`alert-btn mute-btn ${isMutedState ? 'is-muted' : ''}`}
            onClick={toggleMute}
            title={isMutedState ? 'Unmute Siren Audio' : 'Silence Siren Audio'}
            type="button"
          >
            {isMutedState ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{isMutedState ? 'Unmute' : 'Silence'}</span>
          </button>

          <button
            className="alert-btn dismiss-btn"
            onClick={() => dismissAlert(false)}
            title="Acknowledge Threat and Dismiss Alert (or wait for auto-dismiss in 5s)"
            type="button"
          >
            <CheckCircle size={14} />
            <span>Acknowledge ({alertCountdown}s)</span>
          </button>
        </div>
      </div>

      {/* 5-Second Linear Countdown Progress Bar */}
      <div className="alert-countdown-bar-container">
        <div
          className="alert-countdown-bar-fill"
          style={{ width: `${Math.max(0, (alertCountdown / 5) * 100)}%` }}
        ></div>
      </div>
    </aside>
  );
};
