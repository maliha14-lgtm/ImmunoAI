import { useState } from 'react';
import {
  Lightbulb,
  Sprout,
  Bot,
  DoorClosed,
  Pencil,
  ArrowUpRight,
  ShieldAlert,
  Clock
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

export const ActivitySchedule = () => {
  const { activityLog } = useSecurity();
  const [showAllModal, setShowAllModal] = useState(false);

  const getCategoryIcon = (category, type) => {
    if (type === 'intruder') {
      return <ShieldAlert size={16} className="item-icon alert" />;
    }
    switch (category) {
      case 'light':
        return <Lightbulb size={16} className="item-icon" />;
      case 'water':
        return <Sprout size={16} className="item-icon" />;
      case 'vacuum':
        return <Bot size={16} className="item-icon" />;
      case 'lock':
        return <DoorClosed size={16} className="item-icon" />;
      case 'shield':
        return <ShieldAlert size={16} className="item-icon" />;
      default:
        return <Clock size={16} className="item-icon" />;
    }
  };

  // Display top 4 recent events
  const displayedLogs = activityLog.slice(0, 4);

  return (
    <div className="bottom-card daily-schedule-card">
      {/* Header */}
      <div className="schedule-header">
        <h4 className="schedule-title">Daily schedule</h4>
        <button
          className="see-all-link"
          onClick={() => setShowAllModal(true)}
          type="button"
        >
          <span>See all</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Schedule Items List */}
      <div className="schedule-items-list">
        {displayedLogs.map((item) => (
          <div
            key={item.id}
            className={`schedule-row ${item.type === 'intruder' ? 'intruder-row' : ''}`}
          >
            <div className="schedule-row-left">
              {getCategoryIcon(item.category, item.type)}
              <span className="schedule-name">{item.title}</span>
            </div>

            <div className="schedule-row-right">
              <span className="schedule-time">{item.time}</span>
              <button
                className="schedule-edit-btn"
                title="Edit Schedule Entry"
                type="button"
              >
                <Pencil size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* View All Modal */}
      {showAllModal && (
        <div className="modal-backdrop" onClick={() => setShowAllModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Security & Automation Activity History</h3>
              <button
                className="modal-close-btn"
                onClick={() => setShowAllModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body activity-modal-list">
              {activityLog.map((log) => (
                <div
                  key={log.id}
                  className={`history-item ${log.type === 'intruder' ? 'alert' : ''}`}
                >
                  <div className="history-icon-box">
                    {getCategoryIcon(log.category, log.type)}
                  </div>
                  <div className="history-details">
                    <div className="history-title">{log.title}</div>
                    <div className="history-sub">
                      {log.camera ? `Surveillance: ${log.camera} • ` : ''}
                      Logged at {log.time}
                    </div>
                  </div>
                  {log.type === 'intruder' && (
                    <span className="danger-badge">BREACH</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
