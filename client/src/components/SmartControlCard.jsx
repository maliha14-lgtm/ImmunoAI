import {
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Activity,
  Thermometer,
  ChevronLeft,
  ChevronRight,
  Snowflake,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';
import { useNetworkStatus } from '../services/networkService';

// Card 2: Sound (Alarm siren toggle)
export const SoundCard = () => {
  const { isMutedState, toggleMute } = useSecurity();
  const isSoundOn = !isMutedState;

  return (
    <div
      className={`smart-card ${isSoundOn ? 'is-active' : ''}`}
      onClick={toggleMute}
      role="button"
      tabIndex={0}
      title="Toggle Alarm Siren Audio Alerts"
    >
      <div className="card-top-row">
        <div className="card-icon-title">
          {isSoundOn ? (
            <Volume2 size={18} className="card-icon text-orange" />
          ) : (
            <VolumeX size={18} className="card-icon text-muted" />
          )}
        </div>
        <span className={`status-tag ${isSoundOn ? 'active' : ''}`}>
          {isSoundOn ? 'On' : 'Mute'}
        </span>
      </div>

      <div className="card-main-info">
        <div className="card-device-name">Alarm Sound</div>
        <div className="card-subtext">
          {isSoundOn ? 'Siren alerts active on breach' : 'Audio alarm silenced'}
        </div>
      </div>

      {/* Pill Toggle Switch */}
      <div className="card-bottom-toggle">
        <div className={`switch-pill ${isSoundOn ? 'checked' : ''}`}>
          <div className="switch-thumb"></div>
        </div>
      </div>
    </div>
  );
};

// Card 3: Real Wi-Fi Status (Live telemetry - NO BUTTON)
export const WifiStatusCard = () => {
  const network = useNetworkStatus();
  const isOnline = network.isOnline;

  return (
    <div
      className={`smart-card static-info-card ${!isOnline ? 'is-offline' : ''}`}
      title={isOnline ? 'Live Wi-Fi Telemetry' : 'Wi-Fi Disconnected'}
    >
      <div className="card-top-row">
        <div className="card-icon-title">
          {isOnline ? (
            <Wifi size={18} className="card-icon text-green" />
          ) : (
            <WifiOff size={18} className="card-icon text-muted" />
          )}
        </div>
        <span className={`status-tag ${isOnline ? 'active' : ''} flex-center gap-1`}>
          {isOnline ? (
            <>
              <CheckCircle2 size={11} />
              <span>Connected</span>
            </>
          ) : (
            <>
              <XCircle size={11} />
              <span>Offline</span>
            </>
          )}
        </span>
      </div>

      <div className="card-main-info">
        <div className="card-device-name">Wi-Fi Status</div>
        <div className="card-subtext">
          {isOnline
            ? `Online • ${network.rtt}ms latency`
            : 'Wi-Fi Off • Disconnected'}
        </div>
      </div>

      {/* Real Dynamic Signal Bars */}
      <div className="card-bottom-static-indicator">
        <div className="signal-bars-indicator">
          <span className={`sig-bar bar-1 ${isOnline && network.signalBars >= 1 ? 'active' : ''}`}></span>
          <span className={`sig-bar bar-2 ${isOnline && network.signalBars >= 2 ? 'active' : ''}`}></span>
          <span className={`sig-bar bar-3 ${isOnline && network.signalBars >= 3 ? 'active' : ''}`}></span>
          <span className={`sig-bar bar-4 ${isOnline && network.signalBars >= 4 ? 'active' : ''}`}></span>
        </div>
        <span className="static-pill-badge">
          {isOnline ? `${network.signalDbm} dBm • Strong` : '0 dBm • Inactive'}
        </span>
      </div>
    </div>
  );
};

// Card 4: Real Wi-Fi Speed & Latency (Hidden completely when Wi-Fi is OFF)
export const WifiSpeedCard = () => {
  const network = useNetworkStatus();
  const isOnline = network.isOnline;

  return (
    <div
      className={`smart-card static-info-card ${!isOnline ? 'is-offline' : ''}`}
      title="Real-Time Network Bandwidth & Latency"
    >
      <div className="card-top-row">
        <div className="card-icon-title">
          <Activity size={18} className={`card-icon ${isOnline ? 'text-orange' : 'text-muted'}`} />
        </div>
        {/* Only show speed badge when Wi-Fi is connected */}
        {isOnline ? (
          <span className="status-tag active">{network.downlink} Mbps</span>
        ) : (
          <span className="status-tag">Off</span>
        )}
      </div>

      <div className="card-main-info">
        <div className="card-device-name">Wi-Fi Speed</div>
        <div className="card-subtext">
          {/* Hide latency details when Wi-Fi is off */}
          {isOnline
            ? `Latency: ${network.rtt}ms • Low Jitter`
            : 'Wi-Fi Off • Telemetry Paused'}
        </div>
      </div>

      {/* Speed Metrics: Only rendered when Wi-Fi is ON */}
      {isOnline ? (
        <div className="card-bottom-telemetry">
          <span className="speed-pill download">↓ {network.downlink} Mbps</span>
          <span className="speed-pill upload">↑ {(network.downlink * 0.35).toFixed(1)} Mbps</span>
        </div>
      ) : (
        <div className="card-bottom-telemetry offline-notice">
          <span className="offline-pill">No Network Activity</span>
        </div>
      )}
    </div>
  );
};

// Card 5: Temperature (Climate Control)
export const ClimateControlCard = () => {
  const { smartDevices, setClimateTemp } = useSecurity();
  const device = smartDevices.climate || { temp: 24, status: true, mode: 'Cold', autoTurnOn: '20:00 PM', autoTurnOff: '18:00 PM' };

  return (
    <div className="smart-card climate-card climate-card-wide">
      <div className="card-top-row">
        <div className="card-icon-title">
          <Thermometer size={18} className="card-icon" />
        </div>
        <span className={`status-tag ${device.status ? 'active' : ''}`}>
          {device.status ? 'On' : 'Off'}
        </span>
      </div>

      <div className="card-device-name">Climate Control</div>

      {/* Center Temp Display with Chevrons */}
      <div className="climate-temp-picker">
        <button
          className="temp-chevron-btn"
          onClick={() => setClimateTemp(-1)}
          title="Decrease Temperature"
          type="button"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="temp-number">
          <span>{device.temp}</span>
          <span className="temp-unit">°C</span>
        </div>
        <button
          className="temp-chevron-btn"
          onClick={() => setClimateTemp(1)}
          title="Increase Temperature"
          type="button"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Climate Details Rows */}
      <div className="climate-meta">
        <div className="climate-row">
          <span className="meta-label">Mode</span>
          <span className="meta-val flex-center">
            <span>{device.mode}</span>
            <Snowflake size={12} className="meta-sub-icon" />
          </span>
        </div>
        <div className="climate-row">
          <span className="meta-label">Auto turn on</span>
          <span className="meta-val">{device.autoTurnOn}</span>
        </div>
        <div className="climate-row">
          <span className="meta-label">Auto turn off</span>
          <span className="meta-val">{device.autoTurnOff}</span>
        </div>
      </div>
    </div>
  );
};

// Backward-compatible default export if needed
export const SmartControlCard = ({ deviceKey }) => {
  if (deviceKey === 'climate') {
    return <ClimateControlCard />;
  }
  return null;
};
