import { useState } from 'react';
import {
  Sun,
  Moon,
  Bell,
  ShieldCheck,
  ShieldAlert,
  Users,
  ChevronDown
} from 'lucide-react';
import { useSecurity } from '../context/useSecurity';

// Vector Cartoon Avatars for Anam, Maliha, and Mohsin (Offline SVG, 0 network lag)
const CartoonAvatar = ({ type }) => {
  if (type === 'anam') {
    return (
      <svg className="team-cartoon-svg" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="18" fill="#EDE9FE" />
        {/* Cute Cartoon Face */}
        <circle cx="18" cy="18" r="11" fill="#FDE68A" />
        {/* Hair / Headband */}
        <path d="M7 18C7 11.9249 11.9249 7 18 7C24.0751 7 29 11.9249 29 18C29 19.5 28 20 27 18C25.5 15 22 13 18 13C14 13 10.5 15 9 18C8 20 7 19.5 7 18Z" fill="#7C3AED" />
        {/* Cute Eyes */}
        <circle cx="14.5" cy="17.5" r="1.5" fill="#1F2937" />
        <circle cx="21.5" cy="17.5" r="1.5" fill="#1F2937" />
        {/* Smile */}
        <path d="M15.5 21C16.3 22 19.7 22 20.5 21" stroke="#1F2937" strokeWidth="1.2" strokeLinecap="round" />
        {/* Cheeks */}
        <circle cx="12.5" cy="19.5" r="1.2" fill="#F472B6" opacity="0.6" />
        <circle cx="23.5" cy="19.5" r="1.2" fill="#F472B6" opacity="0.6" />
      </svg>
    );
  }

  if (type === 'maliha') {
    return (
      <svg className="team-cartoon-svg" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="18" fill="#CCFBF1" />
        {/* Cute Cartoon Face */}
        <circle cx="18" cy="18" r="11" fill="#FED7AA" />
        {/* Scarf / Headwear */}
        <path d="M7 18C7 11.9249 11.9249 7 18 7C24.0751 7 29 11.9249 29 18C29 20 28 21 27 19C25 15.5 21.5 13.5 18 13.5C14.5 13.5 11 15.5 9 19C8 21 7 20 7 18Z" fill="#0D9488" />
        {/* Cute Round Glasses */}
        <circle cx="14.5" cy="17.5" r="2.6" stroke="#0F766E" strokeWidth="1" fill="none" />
        <circle cx="21.5" cy="17.5" r="2.6" stroke="#0F766E" strokeWidth="1" fill="none" />
        <line x1="17.1" y1="17.5" x2="18.9" y2="17.5" stroke="#0F766E" strokeWidth="1" />
        {/* Eyes inside glasses */}
        <circle cx="14.5" cy="17.5" r="1.2" fill="#115E59" />
        <circle cx="21.5" cy="17.5" r="1.2" fill="#115E59" />
        {/* Cheerful Smile */}
        <path d="M15.5 21.5C16.5 22.5 19.5 22.5 20.5 21.5" stroke="#115E59" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // Mohsin
  return (
    <svg className="team-cartoon-svg" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="18" fill="#FEF3C7" />
      {/* Cartoon Face */}
      <circle cx="18" cy="18" r="11" fill="#FED7AA" />
      {/* Short Hair */}
      <path d="M8 16C8 10.5 12.5 7 18 7C23.5 7 28 10.5 28 16C28 17 26 14.5 24 13C22 11.5 14 11.5 12 13C10 14.5 8 17 8 16Z" fill="#374151" />
      {/* Cute Eyes */}
      <circle cx="14.5" cy="17.5" r="1.5" fill="#1F2937" />
      <circle cx="21.5" cy="17.5" r="1.5" fill="#1F2937" />
      {/* Smile */}
      <path d="M15.5 21C16.5 22.4 19.5 22.4 20.5 21" stroke="#1F2937" strokeWidth="1.2" strokeLinecap="round" />
      {/* Cheeks */}
      <circle cx="12.5" cy="19.5" r="1.2" fill="#FB923C" opacity="0.6" />
      <circle cx="23.5" cy="19.5" r="1.2" fill="#FB923C" opacity="0.6" />
    </svg>
  );
};

export const Header = ({ isDarkMode, onToggleTheme, activeTab = 'dashboard' }) => {
  const {
    protectionMode,
    notifications,
  } = useSecurity();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showTeamMenu, setShowTeamMenu] = useState(false);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'stream':
        return 'Live Surveillance Feed';
      case 'snapshots':
        return 'Intruder Snapshot Archive';
      case 'settings':
        return 'System Configuration';
      default:
        return 'Overview & Control Center';
    }
  };

  return (
    <header className="app-header">
      {/* Left: Expanded ImmunoAI Brand & Page Title */}
      <div className="header-brand-expanded">
        <div className="header-logo-container">
          <img
            src="/logo/cropped_logo.png"
            alt="ImmunoAI"
            className="header-main-logo"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/favicon-96x96.png';
            }}
          />
        </div>
        <div className="header-titles">
          <div className="header-app-name-row">
            <h1 className="header-app-name">ImmunoAI</h1>
            <span className="header-version-pill">DL Term Project</span>
          </div>
          <span className="header-section-subtitle">{getPageTitle()}</span>
        </div>
      </div>

      {/* Center: Minimal Surveillance Status Pill */}
      <div className="header-center-status">
        {protectionMode ? (
          <div className="status-badge armed">
            <span className="status-dot pulsing red"></span>
            <ShieldAlert size={14} />
            <span className="status-text">Armed</span>
          </div>
        ) : (
          <div className="status-badge standby">
            <span className="status-dot gray"></span>
            <ShieldCheck size={14} />
            <span className="status-text">Standby</span>
          </div>
        )}
      </div>

      {/* Right: Actions, Controls & 3 Team Members */}
      <div className="header-right-actions">

        {/* Theme Toggle Pill (Sun / Moon) */}
        <div className="theme-toggle-pill" onClick={onToggleTheme} role="button" tabIndex={0}>
          <button className={`theme-btn ${!isDarkMode ? 'active' : ''}`} title="Light Mode">
            <Sun size={15} />
          </button>
          <button className={`theme-btn ${isDarkMode ? 'active' : ''}`} title="Dark Mode">
            <Moon size={15} />
          </button>
        </div>

        {/* Notification Bell */}
        <div className="notification-wrapper">
          <button
            className={`icon-btn ${notifications.length > 0 ? 'has-badge' : ''}`}
            onClick={() => setShowNotifications(!showNotifications)}
            title="Intruder Notifications"
            type="button"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length}</span>
            )}
          </button>

          {showNotifications && (
            <div className="dropdown-menu notification-dropdown">
              <div className="notification-header">
                <h4>Surveillance Alerts</h4>
                {notifications.length > 0 && (
                  <span className="badge-count">{notifications.length} new</span>
                )}
              </div>
              <div className="notification-list">
                {notifications.length === 0 ? (
                  <div className="empty-notifications">
                    <ShieldCheck size={28} />
                    <p>No intruder threats detected</p>
                    <small>System is monitoring perimeter</small>
                  </div>
                ) : (
                  notifications.map((notif, idx) => (
                    <div key={notif.id || idx} className="notification-item alert">
                      <div className="notif-icon">🚨</div>
                      <div className="notif-content">
                        <div className="notif-title">Intruder Detected</div>
                        <div className="notif-desc">
                          {notif.cameraName || 'Main Camera'} • {notif.location || 'Perimeter'}
                        </div>
                        <div className="notif-meta">
                          <span>{notif.timestamp}</span>
                          <span className="conf-pill">{notif.confidence}% Confidence</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-divider-v"></div>

        {/* Project Team Members: Anam, Maliha, Mohsin with Cartoon Avatars */}
        <div
          className="team-members-header-box"
          onClick={() => setShowTeamMenu(!showTeamMenu)}
          role="button"
          tabIndex={0}
          title="Team Members: Anam, Maliha, Mohsin"
        >
          {/* Overlapping 3 Cartoon Avatars */}
          <div className="team-stacked-avatars">
            <div className="cartoon-avatar-wrapper z-3" title="Anam">
              <CartoonAvatar type="anam" />
            </div>
            <div className="cartoon-avatar-wrapper z-2" title="Maliha">
              <CartoonAvatar type="maliha" />
            </div>
            <div className="cartoon-avatar-wrapper z-1" title="Mohsin (me)">
              <CartoonAvatar type="mohsin" />
            </div>
          </div>

          {/* Names & Project Role */}
          <div className="team-header-names-block">
            <span className="team-header-names">Anam, Maliha, Mohsin</span>
            <span className="team-header-subtitle">Term Project Team</span>
          </div>

          <ChevronDown size={14} className="user-arrow" />

          {/* Team Dropdown */}
          {showTeamMenu && (
            <div className="dropdown-menu team-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="team-dropdown-header">
                <Users size={16} className="text-orange" />
                <span>Deep Learning Project Team</span>
              </div>
              <div className="team-dropdown-list">
                <div className="team-dropdown-item">
                  <div className="mini-cartoon-box"><CartoonAvatar type="anam" /></div>
                  <div className="team-member-info">
                    <strong>Anam</strong>
                    <small>DL Architecture & Model Design</small>
                  </div>
                </div>
                <div className="team-dropdown-item">
                  <div className="mini-cartoon-box"><CartoonAvatar type="maliha" /></div>
                  <div className="team-member-info">
                    <strong>Maliha</strong>
                    <small>Dataset Preparation & Preprocessing</small>
                  </div>
                </div>
                <div className="team-dropdown-item">
                  <div className="mini-cartoon-box"><CartoonAvatar type="mohsin" /></div>
                  <div className="team-member-info">
                    <strong>Mohsin (me)</strong>
                    <small>System Implementation & Integration</small>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
