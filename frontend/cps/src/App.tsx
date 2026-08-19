import { useState } from 'react';
import './App.css';
import cpsLogo from './assets/cps-logo.png';
import LandingScreen from './screens/LandingScreen';
import CreateShipmentScreen from './screens/CreateShipmentScreen';
import DashboardScreen from './screens/DashboardScreen';
import TrackingDetailsScreen from './screens/TrackingDetailsScreen';
import RouteScreen from './screens/RouteScreen';
import FleetOverviewScreen from './screens/FleetOverviewScreen';

type ScreenKey =
  | 'landing'
  | 'dispatch'
  | 'dashboard'
  | 'tracking-details'
  | 'route'
  | 'fleet';

const screens: { key: ScreenKey; label: string }[] = [
  { key: 'landing', label: 'Home' },
  { key: 'dispatch', label: 'Dispatch' },
  { key: 'dashboard', label: 'Live Board' },
  { key: 'tracking-details', label: 'Parcel Tracking' },
  { key: 'route', label: 'Rider Route' },
  { key: 'fleet', label: 'Fleet' },
];

function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-title"><img src={cpsLogo} alt="CPS Delivery Services" className="brand-logo" /></div>
        
        <button 
          className="mobile-menu-btn" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`} aria-label="Screen switcher">
          {screens.map((screen) => (
            <span
              key={screen.key}
              className={activeScreen === screen.key ? 'active' : ''}
              onClick={() => {
                setActiveScreen(screen.key);
                setMobileMenuOpen(false);
              }}
            >
              {screen.label}
            </span>
          ))}
        </nav>
        <button className="primary-green small new-job-btn">New Job</button>
      </header>

      {activeScreen === 'landing' && <LandingScreen />}
      {activeScreen === 'dispatch' && <CreateShipmentScreen />}
      {activeScreen === 'dashboard' && <DashboardScreen />}
      {activeScreen === 'tracking-details' && <TrackingDetailsScreen />}
      {activeScreen === 'route' && <RouteScreen />}
      {activeScreen === 'fleet' && <FleetOverviewScreen />}
    </div>
  );
}

export default App;
