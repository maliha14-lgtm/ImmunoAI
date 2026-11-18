import { useState } from 'react';
import { SecurityProvider } from './context/SecurityContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LiveStreamPlayer } from './components/LiveStreamPlayer';
import { ProtectionCard } from './components/ProtectionCard';
import {
  SoundCard,
  WifiStatusCard,
  WifiSpeedCard,
} from './components/SmartControlCard';
import { WeatherCard } from './components/WeatherCard';
import { StreamManagerCard } from './components/StreamManagerCard';
import { CapturedIntruders } from './components/CapturedIntruders';
import { IntruderAlertBanner } from './components/IntruderAlertBanner';
import { WatchStreamView } from './components/WatchStreamView';
import { SnapshotsGalleryView } from './components/SnapshotsGalleryView';
import { SettingsView } from './components/SettingsView';
import './App.css';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev);
  };

  return (
    <div className={`dashboard-wrapper ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Floating Intruder Emergency Alert Toast */}
      <IntruderAlertBanner />

      {/* Main App Container Box */}
      <div className="dashboard-container">
        {/* Left Navigation Sidebar (Expandable / Collapsible) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isExpanded={isSidebarExpanded}
          onToggleExpand={toggleSidebar}
        />

        {/* Right Main Area */}
        <div className="dashboard-main-area">
          {/* Header Bar */}
          <Header
            isDarkMode={isDarkMode}
            onToggleTheme={toggleTheme}
            activeTab={activeTab}
          />

          {/* Conditional View Rendering based on selected tab */}
          {activeTab === 'stream' ? (
            /* Dedicated Watch Stream View */
            <WatchStreamView />
          ) : activeTab === 'snapshots' ? (
            /* Open Snapshots Archive View */
            <SnapshotsGalleryView />
          ) : activeTab === 'settings' ? (
            /* Functional Settings View */
            <SettingsView />
          ) : (
            /* Dashboard View */
            <main className="dashboard-grid">
              {/* Left Big Section (Direct Camera Stream + Captured Intruders Gallery) */}
              <section className="grid-left-section">
                {/* Live Surveillance Video Player (Direct System Camera) */}
                <LiveStreamPlayer />

                {/* Captured Intruders Snapshot Gallery (Replaces Calendar, Schedule, Members) */}
                <CapturedIntruders />
              </section>

              {/* Right Side Section (5 Dedicated Controls) */}
              <aside className="grid-right-section">
                <div className="devices-grid">
                  {/* Card 1: System Protection Mode (Intruder Detection ARMED/Standby) */}
                  <ProtectionCard />

                  {/* Card 2: Sound (Alarm Siren Toggle) */}
                  <SoundCard />

                  {/* Card 3: Wi-Fi Status (Static - No Button) */}
                  <WifiStatusCard />

                  {/* Card 4: Wi-Fi Speed (Telemetry Speed) */}
                  <WifiSpeedCard />

                  {/* Card 5: Weather Updates & 5-Day Forecast (IndexedDB Cached) */}
                  <WeatherCard />

                  {/* Card 6: Stream & Remote Feed Manager */}
                  <StreamManagerCard />
                </div>
              </aside>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SecurityProvider>
      <DashboardContent />
    </SecurityProvider>
  );
}
