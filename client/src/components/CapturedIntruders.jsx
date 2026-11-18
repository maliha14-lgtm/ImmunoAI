import { useState } from 'react';
import {
  ShieldAlert,
  Clock,
  Maximize2,
  Download,
  X,
  ExternalLink,
  Camera,
  RefreshCw
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const CapturedIntruders = () => {
  const { capturedIntruders, refreshSnapshots, backendStatus } = useSecurity();
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (typeof refreshSnapshots === 'function') {
      try {
        await refreshSnapshots();
      } catch (err) {
        console.error('Failed to sync snapshots', err);
      }
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  return (
    <div className="captured-intruders-card">
      {/* Header Bar */}
      <div className="intruders-header">
        <div className="intruders-title-group">
          <div className="intruders-icon-badge">
            <ShieldAlert size={18} className="text-orange" />
          </div>
          <div>
            <div className="intruders-title-row">
              <h3 className="intruders-title">Captured Intruders</h3>
              <span className="intruders-count-pill">{capturedIntruders.length} Detected</span>
            </div>
            <p className="intruders-subtitle">
              Recent intrusion snapshot log • Ready for Python backend integration
            </p>
          </div>
        </div>

        <div className="intruders-header-actions">
          <button
            className={`sync-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh snapshot cache from server"
            type="button"
          >
            <RefreshCw size={13} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Scrollable Snapshot Gallery (Contained for Single-Page Application Layout) */}
      <div className="intruders-gallery-scroll-container">
        <div className="intruders-gallery-grid">
          {capturedIntruders.length === 0 ? (
            <div className="empty-intruders-placeholder">
              <Camera size={28} className="text-muted" />
              <p>No intruder breaches captured yet.</p>
              <span>Ensure Protection Mode is ARMED to log detected intrusions.</span>
            </div>
          ) : (
            capturedIntruders.map((item) => (
              <div
                key={item.id}
                className="intruder-snapshot-card"
                onClick={() => setSelectedSnapshot(item)}
                role="button"
                tabIndex={0}
                title="Click to inspect detection metadata"
              >
                {/* Image Preview & Bounding Box Overlay */}
                <div className="snapshot-media-box">
                  <img
                    src={item.image}
                    alt={`Intruder detected at ${item.timestamp}`}
                    className="snapshot-img"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* AI Detection Pill Overlay */}
                  <div className="snapshot-ai-badge">
                    <span className="ai-dot-pulse"></span>
                    <span className="ai-badge-label">INTRUDER</span>
                    <span className="ai-badge-conf">{item.confidence}</span>
                  </div>

                  {/* Inspect Button Icon */}
                  <div className="snapshot-inspect-hint">
                    <Maximize2 size={13} />
                  </div>
                </div>

                {/* Snapshot Meta Details */}
                <div className="snapshot-card-meta">
                  <div className="snapshot-time-row">
                    <Clock size={11} className="time-icon" />
                    <span className="snapshot-time">{item.timestamp}</span>
                  </div>
                  <div className="snapshot-camera-name">{item.camera}</div>
                  <div className="snapshot-threat-pill">
                    <span>🚨 {item.threatLevel}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* High-Resolution Inspection Modal */}
      {selectedSnapshot && (
        <div className="modal-backdrop" onClick={() => setSelectedSnapshot(null)}>
          <div className="modal-content intruder-inspect-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="inspect-modal-title">
                <ShieldAlert size={18} className="text-red" />
                <h3>Intruder Detection Evidence #{selectedSnapshot.id}</h3>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setSelectedSnapshot(null)}
                type="button"
                aria-label="Close modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body inspect-modal-body">
              {/* Big Snapshot Frame */}
              <div className="inspect-image-wrapper">
                <img
                  src={selectedSnapshot.image}
                  alt="Captured Intruder Full Resolution"
                  className="inspect-big-img"
                />
                <div className="inspect-bounding-box-mock">
                  <span className="box-tag-large">
                    TARGET: INTRUDER ({selectedSnapshot.confidence})
                  </span>
                </div>
              </div>

              {/* Metadata Telemetry */}
              <div className="inspect-meta-panel">
                <div className="inspect-meta-grid">
                  <div className="inspect-meta-item">
                    <span className="meta-label">Capture Timestamp</span>
                    <span className="meta-value">{selectedSnapshot.timestamp}</span>
                  </div>
                  <div className="inspect-meta-item">
                    <span className="meta-label">Model Confidence</span>
                    <span className="meta-value text-red-bold">{selectedSnapshot.confidence}</span>
                  </div>
                  <div className="inspect-meta-item">
                    <span className="meta-label">Source Camera</span>
                    <span className="meta-value">{selectedSnapshot.camera}</span>
                  </div>
                  <div className="inspect-meta-item">
                    <span className="meta-label">Detection Model</span>
                    <span className="meta-value">{backendStatus?.model || 'ImmunoAICNN (PyTorch)'}</span>
                  </div>
                </div>

                <div className="inspect-incident-desc">
                  <strong>Incident Analysis:</strong>
                  <p>{selectedSnapshot.details}</p>
                </div>

                {/* Storage Telemetry Callout */}
                <div className="backend-integration-note">
                  <div className="note-header">
                    <ExternalLink size={13} />
                    <span>Evidence Storage Notice:</span>
                  </div>
                  <p>
                    Snapshots are securely stored in <code>server/snapshots/</code> and synchronized chronologically (newest first) with the defense hub.
                  </p>
                </div>

                {/* Modal Footer Actions */}
                <div className="inspect-footer-actions">
                  <a
                    href={selectedSnapshot.image}
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn-outline"
                    download={`intruder-${selectedSnapshot.id}.jpg`}
                  >
                    <Download size={14} />
                    <span>Download Snapshot</span>
                  </a>
                  <button
                    className="action-btn-primary"
                    onClick={() => setSelectedSnapshot(null)}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
