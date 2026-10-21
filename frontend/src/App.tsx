/**
 * Main App Component - Router configuration
 */
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp, Spin } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import { RoleGuard, AccessDenied } from './components/Permission';
import MainLayout from './components/Layout/MainLayout';
import './App.css';

// Page-level code splitting: each page is fetched on first navigation
const Login = lazy(() => import('./pages/Login/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const EmployeeList = lazy(() => import('./pages/Employee/EmployeeList'));
const EmployeeForm = lazy(() => import('./pages/Employee/EmployeeForm'));
const EmployeeDetail = lazy(() => import('./pages/Employee/EmployeeDetail'));
const OnboardingForm = lazy(() => import('./pages/Onboarding/OnboardingForm'));
const DepartmentList = lazy(() => import('./pages/Department/DepartmentList'));
const AttendanceReport = lazy(() => import('./pages/Attendance/AttendanceReport'));
const LeaveList = lazy(() => import('./pages/Leave/LeaveList'));
const UserSettings = lazy(() => import('./pages/Settings'));
const UserProfile = lazy(() => import('./pages/Profile/UserProfile'));
const AnnualLeaveList = lazy(() => import('./pages/AnnualLeave/AnnualLeaveList'));
const AnnualLeaveForm = lazy(() => import('./pages/AnnualLeave/AnnualLeaveForm'));
const SocialSecurityList = lazy(() => import('./pages/SocialSecurity/SocialSecurityList'));
const BusinessTripList = lazy(() => import('./pages/BusinessTrip/BusinessTripList'));
const BusinessTripForm = lazy(() => import('./pages/BusinessTrip/BusinessTripForm'));
const BusinessTripDetail = lazy(() => import('./pages/BusinessTrip/BusinessTripDetail'));
const CanteenReport = lazy(() => import('./pages/CanteenMeal/CanteenReport'));
const UserManagement = lazy(() => import('./pages/UserManagement/UserManagement'));
const DocumentConfirmationList = lazy(
  () => import('./pages/DocumentConfirmation/DocumentConfirmationList'),
);
const DocumentSigningPage = lazy(
  () => import('./pages/DocumentConfirmation/DocumentSigningPage'),
);
const MyDocumentConfirmations = lazy(
  () => import('./pages/DocumentConfirmation/MyDocumentConfirmations'),
);
const NotificationCenter = lazy(() => import('./pages/Notifications/NotificationCenter'));
const ReimbursementList = lazy(() => import('./pages/Reimbursement/ReimbursementList'));
const ReimbursementForm = lazy(() => import('./pages/Reimbursement/ReimbursementForm'));
const ReimbursementDetail = lazy(() => import('./pages/Reimbursement/ReimbursementDetail'));
const ForcedPasswordChange = lazy(() => import('./pages/Login/ForcedPasswordChange'));
const Reports = lazy(() => import('./pages/Reports'));
const SelfService = lazy(() => import('./pages/SelfService/SelfService'));
const pageFallback = <Spin size="large" style={{ display: 'block', margin: '20vh auto' }} />;

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <PermissionProvider>
            <Router>
              <Suspense fallback={pageFallback}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/change-password"
                  element={
                    <ProtectedRoute>
                      <ForcedPasswordChange />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/self-service" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="self-service" element={<SelfService />} />
                  <Route
                    path="reports"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager', 'finance']}>
                        <Reports />
                      </RoleGuard>
                    }
                  />

                  {/* Employee management - accessible to admin, hr_admin, and department_manager */}
                  <Route
                    path="employees"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <EmployeeList />
                      </RoleGuard>
                    }
                  />

                  {/* Create employee - requires create permission */}
                  <Route
                    path="employees/new"
                    element={
                      <RoleGuard requiredPermission="employees.create">
                        <EmployeeForm />
                      </RoleGuard>
                    }
                  />

                  {/* View employee detail - accessible to admin, hr_admin, and department_manager */}
                  <Route
                    path="employees/:id"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <EmployeeDetail />
                      </RoleGuard>
                    }
                  />

                  {/* Edit employee - accessible to admin, hr_admin, and department_manager */}
                  <Route
                    path="employees/:id/edit"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <EmployeeForm />
                      </RoleGuard>
                    }
                  />

                  {/* Department management */}
                  <Route
                    path="departments"
                    element={
                      <RoleGuard requiredPermission="departments.view">
                        <DepartmentList />
                      </RoleGuard>
                    }
                  />

                  {/* Attendance management - accessible to admin, hr_admin, and department_manager */}
                  <Route
                    path="attendance"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <AttendanceReport />
                      </RoleGuard>
                    }
                  />

                  {/* Leave management - accessible to all authenticated users
                       (employees see own and submit; admin approves) */}
                  <Route path="leaves" element={<LeaveList />} />

                  {/* User profile - accessible to all authenticated users */}
                  <Route path="profile" element={<UserProfile />} />

                  {/* User settings - accessible to all authenticated users */}
                  <Route path="settings" element={<UserSettings />} />

                  {/* Business data management - accessible to admin and hr_admin */}
                  <Route
                    path="annual-leave"
                    element={
                      <AnnualLeaveList />
                    }
                  />

                  <Route
                    path="annual-leave/new"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin']}>
                        <AnnualLeaveForm />
                      </RoleGuard>
                    }
                  />

                  <Route
                    path="annual-leave/:id/edit"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin']}>
                        <AnnualLeaveForm />
                      </RoleGuard>
                    }
                  />

                  <Route
                    path="social-security"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin']}>
                        <SocialSecurityList />
                      </RoleGuard>
                    }
                  />

                  {/* 出差管理：所有已认证用户均可看到（员工只能看本人申请） */}
                  <Route path="business-trips" element={<BusinessTripList />} />
                  <Route path="business-trips/new" element={<BusinessTripForm />} />
                  <Route path="business-trips/:id" element={<BusinessTripDetail />} />
                  <Route path="business-trips/:id/edit" element={<BusinessTripForm />} />

                  <Route
                    path="canteen-meals"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <CanteenReport />
                      </RoleGuard>
                    }
                  />

                  {/* Document confirmations - HR management view */}
                  <Route
                    path="document-confirmations"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <DocumentConfirmationList />
                      </RoleGuard>
                    }
                  />

                  {/* My document confirmations - employee self-service */}
                  <Route
                    path="document-confirmations/my"
                    element={<MyDocumentConfirmations />}
                  />

                  {/* Document signing page - accessible to all authenticated users */}
                  <Route
                    path="document-confirmations/:employeeId/:documentType"
                    element={<DocumentSigningPage />}
                  />

                  {/* In-app notification center - all authenticated users */}
                  <Route path="notifications" element={<NotificationCenter />} />

                  {/* Reimbursement (Phase 2) - all authenticated users (employee sees own) */}
                  <Route path="reimbursements" element={<ReimbursementList />} />
                  <Route path="reimbursements/new" element={<ReimbursementForm />} />
                  <Route path="reimbursements/:id" element={<ReimbursementDetail />} />
                  <Route path="reimbursements/:id/edit" element={<ReimbursementForm />} />

                  {/* User management - admin only */}
                  <Route
                    path="users"
                    element={
                      <RoleGuard requiredRoles={['admin']}>
                        <UserManagement />
                      </RoleGuard>
                    }
                  />

                  {/* Admin settings - admin only */}
                  <Route
                    path="admin"
                    element={
                      <RoleGuard requiredRoles={['admin']}>
                        <div>Admin Settings (Coming Soon)</div>
                      </RoleGuard>
                    }
                  />

                  {/* Access denied page */}
                  <Route path="access-denied" element={<AccessDenied />} />
                </Route>

                {/* Public onboarding form */}
                <Route path="/onboarding/:token" element={<OnboardingForm />} />

                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              </Suspense>
            </Router>
          </PermissionProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
