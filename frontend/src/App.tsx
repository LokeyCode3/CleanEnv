import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ReactElement } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Citizen pages
import { CitizenLayout } from '@/components/layout/CitizenLayout';
import { CitizenHomePage } from '@/pages/citizen/CitizenHomePage';
import { ReportNewPage } from '@/pages/citizen/ReportNewPage';
import { ReportDetailPage } from '@/pages/citizen/ReportDetailPage';
import { MyReportsPage } from '@/pages/citizen/MyReportsPage';
import { NearbyMapPage } from '@/pages/citizen/NearbyMapPage';
import { NotificationsPage } from '@/pages/citizen/NotificationsPage';
import { ProfilePage } from '@/pages/citizen/ProfilePage';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { AdminMapPage } from '@/pages/admin/AdminMapPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { AdminDepartmentsPage } from '@/pages/admin/AdminDepartmentsPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';

// Officer pages
import { OfficerLayout } from '@/components/layout/OfficerLayout';
import { OfficerReportsPage } from '@/pages/officer/OfficerReportsPage';

// ─── Route Guards ─────────────────────────────────────────────────────────────
const RequireAuth = ({
  children,
  roles,
}: {
  children: ReactElement;
  roles?: UserRole[];
}) => {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === 'citizen') return <Navigate to="/citizen" replace />;
    if (user.role === 'officer') return <Navigate to="/officer" replace />;
    return <Navigate to="/admin" replace />;
  }
  return children;
};

const RedirectByRole = () => {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'citizen') return <Navigate to="/citizen" replace />;
  if (user.role === 'officer') return <Navigate to="/officer" replace />;
  return <Navigate to="/admin" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<RedirectByRole />} />

        {/* Citizen Portal */}
        <Route
          path="/citizen"
          element={
            <RequireAuth roles={['citizen']}>
              <CitizenLayout>
                <CitizenHomePage />
              </CitizenLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/citizen/map"
          element={
            <RequireAuth roles={['citizen']}>
              <CitizenLayout>
                <NearbyMapPage />
              </CitizenLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/citizen/report/new"
          element={
            <RequireAuth roles={['citizen']}>
              <CitizenLayout>
                <ReportNewPage />
              </CitizenLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/citizen/report/:id"
          element={
            <RequireAuth roles={['citizen']}>
              <CitizenLayout>
                <ReportDetailPage />
              </CitizenLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/citizen/my-reports"
          element={
            <RequireAuth roles={['citizen']}>
              <CitizenLayout>
                <MyReportsPage />
              </CitizenLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/citizen/notifications"
          element={
            <RequireAuth roles={['citizen']}>
              <CitizenLayout>
                <NotificationsPage />
              </CitizenLayout>
            </RequireAuth>
          }
        />
        <Route
          path="/citizen/profile"
          element={
            <RequireAuth roles={['citizen']}>
              <CitizenLayout>
                <ProfilePage />
              </CitizenLayout>
            </RequireAuth>
          }
        />

        {/* Admin Portal */}
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/map"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminMapPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminUsersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminDepartmentsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/analytics"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminAuditPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <RequireAuth roles={['admin', 'super_admin']}>
              <AdminDepartmentsPage />
            </RequireAuth>
          }
        />

        {/* Officer Portal */}
        <Route
          path="/officer"
          element={
            <RequireAuth roles={['officer']}>
              <OfficerReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/officer/resolved"
          element={
            <RequireAuth roles={['officer']}>
              <OfficerReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/officer/profile"
          element={
            <RequireAuth roles={['officer']}>
              <OfficerLayout>
                <ProfilePage />
              </OfficerLayout>
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
