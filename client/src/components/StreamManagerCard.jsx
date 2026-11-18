import { useState } from 'react';
import {
  Video,
  Radio,
  Plus,
  Trash2,
  CheckCircle2,
  Smartphone,
  Laptop,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Play
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const StreamManagerCard = () => {
  const {
    streamList,
    activeStreamId,
    setActiveStreamId,
    addRemoteStream,
    removeStream,
    activeStream,
  } = useSecurity();

  const [isAddingStream, setIsAddingStream] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Form State
  const [streamName, setStreamName] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [streamLocation, setStreamLocation] = useState('Local Network (Wi-Fi)');
  const [formError, setFormError] = useState('');

  // Handle Preset Fill
  const handleUsePreset = (type) => {
    if (type === 'mobile') {
      setStreamName('Mobile Phone IP Cam');
      setStreamUrl('http://192.168.1.50:8080/video');
      setStreamLocation('Mobile Device (Wi-Fi)');
      setFormError('');
    } else if (type === 'test') {
      setStreamName('Public Surveillance Test Stream');
      setStreamUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      setStreamLocation('Cloud Test Feed');
      setFormError('');
    }
  };

  const handleSaveStream = (e) => {
    e.preventDefault();
    if (!streamUrl.trim()) {
      setFormError('Please enter a valid stream URL or IP address.');
      return;
    }

    // Validate URL format (http, https, rtsp, or IP)
    const trimmed = streamUrl.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('rtsp://')) {
      setFormError('Stream URL must start with http://, https://, or rtsp://');
      return;
    }

    addRemoteStream({
      name: streamName.trim() || 'Remote Network Camera',
      url: trimmed,
      location: streamLocation.trim() || 'Network Stream',
    });

    // Reset and close
    setStreamName('');
    setStreamUrl('');
    setFormError('');
    setIsAddingStream(false);
  };

  return (
    <div className="smart-card stream-manager-card-wide">
      {/* Top Header Row */}
      <div className="stream-mgr-header">
        <div className="stream-mgr-title-group">
          <div className="stream-mgr-icon-badge">
            <Radio size={18} className="text-orange" />
          </div>
          <div>
            <div className="stream-mgr-title-row">
              <h3 className="stream-mgr-title">Stream & Feed Manager</h3>
              <span className="stream-count-pill">{streamList.length} Available</span>
            </div>
            <p className="stream-mgr-subtitle">
              Manage local camera or connect remote IP surveillance streams
            </p>
          </div>
        </div>

        <div className="stream-mgr-header-actions">
          <button
            className="stream-help-btn"
            onClick={() => setShowHelp(!showHelp)}
            title="How to connect mobile camera"
            type="button"
          >
            <HelpCircle size={14} />
            <span>Mobile Guide</span>
          </button>

          <button
            className={`add-stream-toggle-btn ${isAddingStream ? 'active' : ''}`}
            onClick={() => {
              setIsAddingStream(!isAddingStream);
              setFormError('');
            }}
            type="button"
          >
            {isAddingStream ? <X size={13} /> : <Plus size={13} />}
            <span>{isAddingStream ? 'Cancel' : 'Add Stream'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Mobile Setup Guide */}
      {showHelp && (
        <div className="stream-help-accordion">
          <div className="help-box-header">
            <Smartphone size={16} className="text-orange" />
            <strong>How to stream from your Mobile Phone:</strong>
          </div>
          <ol className="help-steps-list">
            <li>
              <strong>Install an IP Cam App:</strong> Download <code>IP Webcam</code> (Android) or <code>DroidCam</code> / <code>EpocCam</code> (iOS/Android) from Play Store / App Store.
            </li>
            <li>
              <strong>Connect to Same Wi-Fi:</strong> Ensure your phone and this computer are connected to the <strong>same Wi-Fi router</strong> or hotspot.
            </li>
            <li>
              <strong>Start Server:</strong> In the mobile app, tap <em>"Start server"</em> at the bottom. The phone will display an IP address (e.g. <code>http://192.168.1.15:8080</code>).
            </li>
            <li>
              <strong>Add Feed:</strong> Click <em>"+ Add Stream"</em>, enter the URL with <code>/video</code> (e.g. <code>http://192.168.1.15:8080/video</code>), and click <em>Save Stream</em>!
            </li>
          </ol>
        </div>
      )}

      {/* Expandable Add Remote Stream Form */}
      {isAddingStream && (
        <form className="add-stream-form-box" onSubmit={handleSaveStream}>
          <div className="form-head-row">
            <strong>Add New Network Surveillance Stream</strong>
            <div className="preset-chips">
              <span className="preset-label">Quick Presets:</span>
              <button
                type="button"
                className="preset-pill-btn"
                onClick={() => handleUsePreset('mobile')}
              >
                📱 Mobile IP Cam
              </button>
              <button
                type="button"
                className="preset-pill-btn"
                onClick={() => handleUsePreset('test')}
              >
                🧪 Online Test Stream
              </button>
            </div>
          </div>

          <div className="form-inputs-grid">
            <div className="input-field-group">
              <label>Stream Name</label>
              <input
                type="text"
                placeholder="e.g. Mobile Phone Front Cam, Backyard IP"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
              />
            </div>

            <div className="input-field-group">
              <label>Stream URL / IP Address</label>
              <input
                type="text"
                placeholder="http://192.168.X.X:8080/video or .mp4"
                value={streamUrl}
                onChange={(e) => {
                  setStreamUrl(e.target.value);
                  setFormError('');
                }}
              />
            </div>
          </div>

          {formError && <div className="stream-form-error">{formError}</div>}

          <div className="form-btn-actions">
            <button
              type="button"
              className="stream-btn-secondary"
              onClick={() => setIsAddingStream(false)}
            >
              Cancel
            </button>
            <button type="submit" className="stream-btn-primary">
              <Plus size={13} />
              <span>Save & Activate Stream</span>
            </button>
          </div>
        </form>
      )}

      {/* Stream List (Available Sources) */}
      <div className="streams-selection-list">
        {streamList.map((stream) => {
          const isActive = stream.id === activeStreamId;
          const isLocal = stream.type === 'local';

          return (
            <div
              key={stream.id}
              className={`stream-item-card ${isActive ? 'is-active' : ''}`}
              onClick={() => setActiveStreamId(stream.id)}
            >
              <div className="stream-item-left">
                <div className={`stream-type-icon ${isActive ? 'active-icon' : ''}`}>
                  {isLocal ? <Laptop size={16} /> : <Smartphone size={16} />}
                </div>

                <div className="stream-info-text">
                  <div className="stream-name-line">
                    <strong className="stream-name">{stream.name}</strong>
                    <span className={`stream-type-badge ${isLocal ? 'local' : 'remote'}`}>
                      {isLocal ? 'Hardware' : 'Remote IP'}
                    </span>
                  </div>
                  <span className="stream-meta-line">
                    {isLocal ? 'Local System Webcam' : stream.url}
                  </span>
                </div>
              </div>

              <div className="stream-item-right" onClick={(e) => e.stopPropagation()}>
                {isActive ? (
                  <span className="active-feed-pill">
                    <span className="live-dot-green"></span>
                    <span>ACTIVE FEED</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="switch-feed-btn"
                    onClick={() => setActiveStreamId(stream.id)}
                    title="Switch surveillance player to this stream"
                  >
                    <Play size={11} />
                    <span>Switch</span>
                  </button>
                )}

                {/* Allow removing custom streams (cannot remove default hardware camera) */}
                {!stream.isDefault && (
                  <button
                    type="button"
                    className="remove-stream-btn"
                    onClick={() => removeStream(stream.id)}
                    title="Remove stream from list"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
