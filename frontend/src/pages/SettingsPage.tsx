import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Import role-specific settings components
import CustomerSettings from './settings/CustomerSettings';
import OpsSettings from './settings/OpsSettings';
import RiderSettings from './settings/RiderSettings';
import AdminSettings from './settings/AdminSettings';

export default function SettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-shell light-shell">
        <main className="container billing-screen" style={{ textAlign: 'center', padding: '100px 20px', color: '#64748b' }}>
          Loading settings...
        </main>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" replace />;
  }

  return (
    <div className="page-shell light-shell">
      <main className="container billing-screen">
        {user.role === 'customer' && <CustomerSettings />}
        {user.role === 'operations' && <OpsSettings />}
        {user.role === 'rider' && <RiderSettings />}
        {user.role === 'admin' && <AdminSettings />}
        
        {/* Fallback if somehow a user has an invalid role */}
        {!['customer', 'operations', 'rider', 'admin'].includes(user.role) && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#ef4444' }}>
            Error: Invalid user role. Cannot load settings.
          </div>
        )}
      </main>
    </div>
  );
}
