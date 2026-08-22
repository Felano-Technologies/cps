import Topbar from './components/Topbar';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RequestPickupPage from './pages/RequestPickupPage';
import LiveOpsBoardPage from './pages/LiveOpsBoardPage';
import TrackingPage from './pages/TrackingPage';
import RiderRoutePage from './pages/RiderRoutePage';
import DeliveryDetailsPage from './pages/DeliveryDetailsPage';
import CompletedJobsPage from './pages/CompletedJobsPage';
import FleetManagementPage from './pages/FleetManagementPage';
import MyShipmentsPage from './pages/MyShipmentsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <div className="app-shell">
      <Topbar />

      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Customer Flow */}
        <Route path="/customer/pickup" element={<RequestPickupPage />} />
        <Route path="/customer/shipments" element={<MyShipmentsPage />} />

        {/* Operations Flow */}
        <Route path="/ops/board" element={<LiveOpsBoardPage />} />
        <Route path="/ops/fleet" element={<FleetManagementPage />} />
        <Route path="/ops/tracking" element={<TrackingPage />} />

        {/* Rider Flow */}
        <Route path="/rider/route" element={<RiderRoutePage />} />
        <Route path="/rider/job/:id" element={<DeliveryDetailsPage />} />
        <Route path="/rider/history" element={<CompletedJobsPage />} />

        {/* Settings */}
        <Route path="/settings/*" element={<SettingsPage />} />
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default App;
