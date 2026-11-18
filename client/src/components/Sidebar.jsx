import {
  LayoutGrid,
  Video,
  Images,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const Sidebar = ({ activeTab = 'dashboard', onSelectTab, isExpanded, onToggleExpand }) => {
  const { protectionMode, dlTelemetry, activeEngine, switchEngine } = useSecurity();

  const navItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'stream', icon: Video, label: 'Watch Stream' },
    { id: 'snapshots', icon: Images, label: 'Snapshots' },
  ];

  return (
    <aside
      className={`app-sidebar ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      aria-label="Main Navigation"
    >
      {/* Top: Brand Logo + Collapse / Expand Toggle */}
      <div className="sidebar-top-header">
        <div
          className="sidebar-brand-box"
          onClick={() => onSelectTab && onSelectTab('dashboard')}
          role="button"
          tabIndex={0}
          title="ImmunoAI Dashboard"
        >
          <div className={`logo-ring ${protectionMode ? 'armed' : ''}`}>
            <img
              src="/logo/cropped_logo.png"
              alt="ImmunoAI"
              className="brand-logo-img"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/favicon-96x96.png';
              }}
            />
          </div>
          {isExpanded && (
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-title">ImmunoAI</span>
              <span className="sidebar-brand-sub">Intruder Defense</span>
            </div>
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleExpand}
          title={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
          type="button"
          aria-label={isExpanded ? 'Collapse Sidebar' : 'Expand Sidebar'}
        >
          {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Main Navigation Items (Only Dashboard & Watch Stream) */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-btn ${isActive ? 'active' : ''} ${isExpanded ? 'expanded-btn' : ''}`}
              onClick={() => onSelectTab && onSelectTab(item.id)}
              title={!isExpanded ? item.label : undefined}
              type="button"
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.8} className="nav-icon" />
              {isExpanded && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Live AI Inference Telemetry Box (Testing & Monitoring Widget) */}
      {isExpanded ? (
        <div className="sidebar-ai-telemetry-box" title="Live Deep Learning Inference Monitor">
          <div className="ai-telemetry-header">
            <div className="ai-pulse-dot-wrap">
              <span className={`ai-pulse-dot ${protectionMode ? 'active' : ''}`}></span>
              <span className="ai-telemetry-title">DL Inference</span>
            </div>
            <span className={`ai-telemetry-status ${protectionMode ? (dlTelemetry.is_intruder ? 'threat' : 'normal') : ''}`}>
              {protectionMode ? (dlTelemetry.is_intruder ? 'INTRUDER' : 'NORMAL') : 'STANDBY'}
            </span>
          </div>

          {/* Engine Selector (Dual Engine: YOLO vs Custom CNN) */}
          <div className="ai-engine-selector-bar">
            <button
              type="button"
              className={`ai-engine-pill ${activeEngine === 'yolo' ? 'active-yolo' : ''}`}
              onClick={() => switchEngine('yolo')}
              title="Version 1: Pretrained YOLOv8 (COCO) — 95%+ Accuracy & Bounding Boxes"
            >
              ⚡ YOLOv8 (Easy)
            </button>
            <button
              type="button"
              className={`ai-engine-pill ${activeEngine === 'custom' ? 'active-custom' : ''}`}
              onClick={() => switchEngine('custom')}
              title="Version 2: Custom ImmunoAICNN — Term Project Architecture"
            >
              🔬 Custom CNN
            </button>
          </div>

          <div className="ai-telemetry-body">
            <div className="ai-metric-row">
              <span className="ai-metric-label">Probability</span>
              <span className="ai-metric-value">{protectionMode ? `${dlTelemetry.confidence}%` : '0.0%'}</span>
            </div>

            <div className="ai-prob-bar-container" title="Probability Bar (Threshold at 50%)">
              <div
                className={`ai-prob-bar-fill ${dlTelemetry.is_intruder ? 'threat' : ''}`}
                style={{ width: `${protectionMode ? Math.min(100, Math.max(0, dlTelemetry.prob * 100)) : 0}%` }}
              ></div>
              <div className="ai-threshold-marker" title="50% Threshold Marker"></div>
            </div>

            <div className="ai-stats-grid">
              <div className="ai-stat-item">
                <span className="stat-k">Logit</span>
                <span className="stat-v">{protectionMode ? (dlTelemetry.logit > 0 ? `+${dlTelemetry.logit}` : dlTelemetry.logit) : '0'}</span>
              </div>
              <div className="ai-stat-item">
                <span className="stat-k">Frames</span>
                <span className={`stat-v ${dlTelemetry.consecutive_frames > 0 ? 'highlight' : ''}`}>
                  {dlTelemetry.consecutive_frames}/{dlTelemetry.required_frames || 3}
                </span>
              </div>
              <div className="ai-stat-item">
                <span className="stat-k">Latency</span>
                <span className="stat-v">{dlTelemetry.inference_ms}ms</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="sidebar-collapsed-ai-badge"
          onClick={() => switchEngine()}
          title={`Engine: ${activeEngine.toUpperCase()} | Click to toggle | Prob: ${dlTelemetry.confidence}%`}
        >
          <Cpu size={16} className={protectionMode ? 'text-orange' : 'text-muted'} />
          <span className="collapsed-engine-tag">{activeEngine.toUpperCase()}</span>
          <span className="collapsed-prob-text">{protectionMode ? `${Math.round(dlTelemetry.confidence)}%` : 'OFF'}</span>
        </div>
      )}
    </aside>
  );
};
