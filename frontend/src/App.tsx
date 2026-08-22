import { Routes, Route, Navigate } from 'react-router-dom';


// Contexts
import { useAuth } from './contexts/AuthContext';

// Components
import Topbar from './components/Topbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';

// Pages
import LandingPage from './pages/LandingPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

// Public Static Pages
import AboutPage from './pages/public/AboutPage';
import ContactPage from './pages/public/ContactPage';
import FAQPage from './pages/public/FAQPage';
import ServicesPage from './pages/public/ServicesPage';
import SameDayDeliveryPage from './pages/public/SameDayDeliveryPage';
import ExpressDeliveryPage from './pages/public/ExpressDeliveryPage';
import StandardDeliveryPage from './pages/public/StandardDeliveryPage';
import BulkDeliveryPage from './pages/public/BulkDeliveryPage';

// Customer Pages
import RequestPickupPage from './pages/RequestPickupPage';
import MyshipmentsPage from './pages/MyShipmentsPage';

// Operations Pages
import LiveOpsBoardPage from './pages/LiveOpsBoardPage';
import FleetManagementPage from './pages/FleetManagementPage';
import AdminPanelPage from './pages/AdminPanelPage';

// Shared Pages
import TrackingDetailsPage from './pages/TrackingDetailsPage';
import SettingsPage from './pages/SettingsPage';

// Rider Pages
import RiderRoutePage from './pages/RiderRoutePage';

// 404
import NotFoundPage from './pages/NotFoundPage';

/**
 * Route Protection Component
 * Only allows authenticated users to access protected routes
 */
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Main App Component
 * - Topbar is rendered once, outside Routes for global availability
 */
function App() {
  return (
    <div className="app-shell">
      <ScrollToTop />
      <Topbar />
      <main className="app-main">
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/same-day" element={<SameDayDeliveryPage />} />
          <Route path="/services/express" element={<ExpressDeliveryPage />} />
          <Route path="/services/standard" element={<StandardDeliveryPage />} />
          <Route path="/services/bulk" element={<BulkDeliveryPage />} />

          {/* CUSTOMER ROUTES */}
          <Route
            path="/request-pickup"
            element={
              <ProtectedRoute requiredRole="customer">
                <RequestPickupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/shipments"
            element={
              <ProtectedRoute requiredRole="customer">
                <MyshipmentsPage />
              </ProtectedRoute>
            }
          />

          {/* OPERATIONS ROUTES */}
          <Route
            path="/ops-board"
            element={
              <ProtectedRoute requiredRole="operations">
                <LiveOpsBoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fleet"
            element={
              <ProtectedRoute requiredRole="operations">
                <FleetManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminPanelPage />
              </ProtectedRoute>
            }
          />

          {/* RIDER ROUTES */}
          <Route
            path="/route"
            element={
              <ProtectedRoute requiredRole="rider">
                <RiderRoutePage />
              </ProtectedRoute>
            }
          />

          {/* SHARED ROUTES */}
          <Route
            path="/tracking/:parcelId"
            element={
              <ProtectedRoute>
                <TrackingDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings/*"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
