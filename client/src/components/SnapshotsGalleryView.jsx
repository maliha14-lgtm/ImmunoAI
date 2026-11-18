import { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Clock,
  Maximize2,
  Download,
  X,
  Camera,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const SnapshotsGalleryView = () => {
  const { capturedIntruders, refreshSnapshots, backendStatus } = useSecurity();
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'older'

  // Trigger snapshot reload from server disk
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
    }, 450);
  };

  // Filter snapshots based on search query and date category
  const filteredSnapshots = useMemo(() => {
    return capturedIntruders.filter((item) => {
      // Date filter matching
      if (dateFilter === 'today') {
        if (!item.timestamp?.toLowerCase().includes('today')) return false;
      } else if (dateFilter === 'yesterday') {
        if (!item.timestamp?.toLowerCase().includes('yesterday')) return false;
      } else if (dateFilter === 'older') {
        if (
          item.timestamp?.toLowerCase().includes('today') ||
          item.timestamp?.toLowerCase().includes('yesterday')
        ) {
          return false;
        }
      }

      // Search query matching
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchCam = item.camera?.toLowerCase().includes(q);
      const matchTime = item.timestamp?.toLowerCase().includes(q);
      const matchConf = item.confidence?.toLowerCase().includes(q);
      const matchFile = item.filename?.toLowerCase().includes(q);
      const matchDetails = item.details?.toLowerCase().includes(q);
      return matchCam || matchTime || matchConf || matchFile || matchDetails;
    });
  }, [capturedIntruders, searchQuery, dateFilter]);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    let today = 0;
    let yesterday = 0;
    let older = 0;
    capturedIntruders.forEach((item) => {
      const ts = item.timestamp?.toLowerCase() || '';
      if (ts.includes('today')) today++;
      else if (ts.includes('yesterday')) yesterday++;
      else older++;
    });
    return { all: capturedIntruders.length, today, yesterday, older };
  }, [capturedIntruders]);

  return (
    <div className="snapshots-gallery-view-container">
      {/* Compact Toolbar Bar (Search + Refresh Sync Button + Filter Chips) */}
      <div className="snapshots-toolbar-bar">
        <div className="snapshots-search-group">
          {/* Search input */}
          <div className="snapshots-search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search by camera, timestamp, filename, confidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="snapshots-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Refresh button directly alongside the searchbar */}
          <button
            className={`snapshots-sync-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Re-read snapshot files directly from server disk"
            type="button"
            disabled={isRefreshing}
          >
            <RefreshCw size={14} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Disk'}</span>
          </button>

          <span className="snapshots-total-badge" title="Total snapshots stored on server disk">
            {capturedIntruders.length} Snapshots
          </span>
        </div>

        {/* Date Filter Chips */}
        <div className="snapshots-filter-chips">
          <button
            type="button"
            className={`filter-chip ${dateFilter === 'all' ? 'active' : ''}`}
            onClick={() => setDateFilter('all')}
          >
            <span>All</span>
            <span className="chip-count">{counts.all}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${dateFilter === 'today' ? 'active' : ''}`}
            onClick={() => setDateFilter('today')}
          >
            <span>Today</span>
            <span className="chip-count">{counts.today}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${dateFilter === 'yesterday' ? 'active' : ''}`}
            onClick={() => setDateFilter('yesterday')}
          >
            <span>Yesterday</span>
            <span className="chip-count">{counts.yesterday}</span>
          </button>
          <button
            type="button"
            className={`filter-chip ${dateFilter === 'older' ? 'active' : ''}`}
            onClick={() => setDateFilter('older')}
          >
            <span>Older</span>
            <span className="chip-count">{counts.older}</span>
          </button>
        </div>
      </div>

      {/* Open Grid of All Snapshots */}
      <div className="snapshots-open-grid-container">
        {filteredSnapshots.length === 0 ? (
          <div className="snapshots-empty-panel">
            <Camera size={36} className="text-muted" />
            <h4>No Intruder Snapshots Found</h4>
            <p>
              {searchQuery || dateFilter !== 'all'
                ? 'No snapshot records matched your active filter criteria.'
                : 'No intruder intrusions have been recorded on disk yet. Arm Protection Mode to capture threats.'}
            </p>
            {(searchQuery || dateFilter !== 'all') && (
              <button
                type="button"
                className="btn-reset-filters"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('all');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="snapshots-open-grid">
            {filteredSnapshots.map((item, index) => (
              <div
                key={item.id || index}
                className="open-snapshot-card"
                onClick={() => setSelectedSnapshot(item)}
                role="button"
                tabIndex={0}
                title="Click to inspect detection telemetry and full image"
              >
                {/* Media Preview Thumbnail */}
                <div className="open-snapshot-media">
                  <img
                    src={item.image}
                    alt={`Intruder detected at ${item.timestamp}`}
                    className="open-snapshot-img"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src =
                        'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80';
                    }}
                  />

                  {/* Top Overlay Badges */}
                  <div className="open-snapshot-badges">
                    <div className="open-ai-pill">
                      <span className="ai-dot-pulse"></span>
                      <span className="ai-label">INTRUDER</span>
                      <span className="ai-confidence">{item.confidence}</span>
                    </div>

                    <div className="open-quick-actions">
                      <a
                        href={item.image}
                        download={item.filename || `intruder-${item.id}.jpg`}
                        className="quick-icon-btn"
                        title="Download snapshot"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download size={13} />
                      </a>
                      <div className="quick-icon-btn" title="Inspect full resolution">
                        <Maximize2 size={13} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Information */}
                <div className="open-snapshot-body">
                  <div className="open-snapshot-time-row">
                    <div className="open-time-tag">
                      <Clock size={12} className="text-muted" />
                      <span>{item.timestamp}</span>
                    </div>
                    <span className="open-threat-tag">🚨 {item.threatLevel || 'Confirmed'}</span>
                  </div>

                  <div className="open-snapshot-cam-row">
                    <span className="open-cam-name">{item.camera}</span>
                  </div>

                  {item.filename && (
                    <div className="open-filename-code" title={item.filename}>
                      {item.filename}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* High-Resolution Inspection Modal */}
      {selectedSnapshot && (
        <div className="modal-backdrop" onClick={() => setSelectedSnapshot(null)}>
          <div
            className="modal-content intruder-inspect-modal wide-inspect-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="inspect-modal-title">
                <ShieldAlert size={19} className="text-red" />
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
              {/* Big High-Res Snapshot Frame */}
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
                    <span className="meta-value text-red-bold">
                      {selectedSnapshot.confidence}
                    </span>
                  </div>
                  <div className="inspect-meta-item">
                    <span className="meta-label">Source Camera</span>
                    <span className="meta-value">{selectedSnapshot.camera}</span>
                  </div>
                  <div className="inspect-meta-item">
                    <span className="meta-label">Detection Engine</span>
                    <span className="meta-value">
                      {backendStatus?.model || 'ImmunoAICNN (PyTorch)'}
                    </span>
                  </div>
                  {selectedSnapshot.filename && (
                    <div className="inspect-meta-item">
                      <span className="meta-label">Disk Storage File</span>
                      <span className="meta-value font-mono-sm">
                        {selectedSnapshot.filename}
                      </span>
                    </div>
                  )}
                  <div className="inspect-meta-item">
                    <span className="meta-label">Threat Status</span>
                    <span className="meta-value text-orange-bold">
                      {selectedSnapshot.threatLevel}
                    </span>
                  </div>
                </div>

                <div className="inspect-incident-desc">
                  <strong>Incident Analysis:</strong>
                  <p>{selectedSnapshot.details}</p>
                </div>

                <div className="backend-integration-note">
                  <div className="note-header">
                    <ExternalLink size={13} />
                    <span>Evidence Storage Notice:</span>
                  </div>
                  <p>
                    This forensic snapshot is stored on disk in <code>server/snapshots/</code> and synchronized chronologically with the defense hub.
                  </p>
                </div>

                {/* Modal Footer Actions */}
                <div className="inspect-footer-actions">
                  <a
                    href={selectedSnapshot.image}
                    target="_blank"
                    rel="noreferrer"
                    className="action-btn-outline"
                    download={selectedSnapshot.filename || `intruder-${selectedSnapshot.id}.jpg`}
                  >
                    <Download size={14} />
                    <span>Download Full Resolution</span>
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
