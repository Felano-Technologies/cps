import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';


// Contexts
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';

import Topbar from './components/Topbar';
import Footer from './components/Footer';
import FloatingActions from './components/FloatingActions';
import MobileNavigationBar from './components/MobileNavigationBar';
import ScrollToTop from './components/ScrollToTop';
import { PageLoader } from './components/Spinner';

// Pages
import LandingPage from './pages/public/LandingPage';
import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import VerifyPhonePage from './pages/auth/VerifyPhonePage';

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
import RequestPickupPage from './pages/customer/RequestPickupPage';
import MyshipmentsPage from './pages/customer/MyShipmentsPage';

// Operations Pages
import LiveOpsBoardPage from './pages/operations/LiveOpsBoardPage';
import FleetManagementPage from './pages/operations/FleetManagementPage';
import OpsAlertsPage from './pages/operations/OpsAlertsPage';
import OpsAnalyticsPage from './pages/operations/OpsAnalyticsPage';
import AdminPanelPage from './pages/admin/AdminPanelPage';
import OpsOrdersListPage from './pages/operations/OpsOrdersListPage';
import RiderDeductionsPage from './pages/operations/RiderDeductionsPage';

// Shared Pages
import CustomerTrackingPage from './pages/customer/CustomerTrackingPage';
import OpsTrackingPage from './pages/operations/OpsTrackingPage';
import SettingsPage from './pages/settings/SettingsPage';

// Rider Pages
import RiderDashboardPage from './pages/rider/RiderDashboardPage';
import RiderRoutePage from './pages/rider/RiderRoutePage';
import RiderEarningsPage from './pages/rider/RiderEarningsPage';

// 404
import NotFoundPage from './pages/public/NotFoundPage';

/**
 * Route Protection Component
 * Only allows authenticated users to access protected routes
 */
function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode; requiredRole?: string }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const wrongRole = !isLoading && isAuthenticated && !!requiredRole && user?.role !== requiredRole;
  const needsPhoneVerification =
    !isLoading && isAuthenticated && !!user?.phone && !user?.phoneVerified && location.pathname !== '/verify-phone';

  useEffect(() => {
    if (wrongRole) {
      toast.info(`This page is only available to ${requiredRole} accounts.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrongRole, requiredRole]);

  if (isLoading) return <PageLoader />;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (needsPhoneVerification) {
    return <Navigate to="/verify-phone" replace />;
  }

  if (wrongRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * Main App Component
 * - Topbar is rendered once, outside Routes for global availability
 */
function App() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const isStaff = !isLoading && user && ['rider', 'operations', 'admin'].includes(user.role);
  const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup' || location.pathname === '/verify-phone';

  return (
    <div className="app-shell">
      <ScrollToTop />
      {!isAuthPage && <Topbar />}
      <main className="app-main">
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/verify-phone"
            element={
              <ProtectedRoute>
                <VerifyPhonePage />
              </ProtectedRoute>
            }
          />
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
            path="/ops/new-orders"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsOrdersListPage filterType="new" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ops/active-orders"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsOrdersListPage filterType="active" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ops/delayed-orders"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsOrdersListPage filterType="delayed" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ops/cancelled-orders"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsOrdersListPage filterType="cancelled" />
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
            path="/ops-alerts"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsAlertsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ops-analytics"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ops/deductions"
            element={
              <ProtectedRoute requiredRole="operations">
                <RiderDeductionsPage />
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
            path="/rider-board"
            element={
              <ProtectedRoute requiredRole="rider">
                <RiderDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/route"
            element={
              <ProtectedRoute requiredRole="rider">
                <RiderRoutePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider/earnings"
            element={
              <ProtectedRoute requiredRole="rider">
                <RiderEarningsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rider-earnings"
            element={
              <ProtectedRoute requiredRole="rider">
                <RiderEarningsPage />
              </ProtectedRoute>
            }
          />

          {/* SHARED ROUTES */}
          <Route
            path="/tracking/:parcelId"
            element={
              <ProtectedRoute>
                <CustomerTrackingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ops/tracking/:parcelId"
            element={
              <ProtectedRoute requiredRole="operations">
                <OpsTrackingPage />
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
      
      {/* Dynamic Bottom Navigation / Footer */}
      {isStaff ? (
        <>
          <MobileNavigationBar />
          {/* Hide standard footer spacing on mobile when staff */}
          <style>{`
            @media (max-width: 768px) {
              .app-shell { padding-bottom: 80px; }
            }
          `}</style>
        </>
      ) : isAuthPage ? null : (
        <>
          <Footer />
          <FloatingActions />
        </>
      )}
    </div>
  );
}

export default App;
