/**
 * Main App Component - Router configuration
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionProvider } from './contexts/PermissionContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
import { RoleGuard, AccessDenied } from './components/Permission';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import EmployeeList from './pages/Employee/EmployeeList';
import EmployeeForm from './pages/Employee/EmployeeForm';
import EmployeeDetail from './pages/Employee/EmployeeDetail';
import OnboardingForm from './pages/Onboarding/OnboardingForm';
import DepartmentList from './pages/Department/DepartmentList';
import AttendanceList from './pages/Attendance/AttendanceList';
import LeaveList from './pages/Leave/LeaveList';
import UserSettings from './pages/Settings';
import UserProfile from './pages/Profile/UserProfile';
import AnnualLeaveList from './pages/AnnualLeave/AnnualLeaveList';
import SocialSecurityList from './pages/SocialSecurity/SocialSecurityList';
import BusinessTripList from './pages/BusinessTrip/BusinessTripList';
import CanteenMealList from './pages/CanteenMeal/CanteenMealList';
import UserManagement from './pages/UserManagement/UserManagement';
import './App.css';

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
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />

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
                        <AttendanceList />
                      </RoleGuard>
                    }
                  />

                  {/* Leave management - accessible to admin, hr_admin, and department_manager */}
                  <Route
                    path="leaves"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <LeaveList />
                      </RoleGuard>
                    }
                  />

                  {/* User profile - accessible to all authenticated users */}
                  <Route path="profile" element={<UserProfile />} />

                  {/* User settings - accessible to all authenticated users */}
                  <Route path="settings" element={<UserSettings />} />

                  {/* Business data management - accessible to admin and hr_admin */}
                  <Route
                    path="annual-leave"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <AnnualLeaveList />
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

                  <Route
                    path="business-trips"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <BusinessTripList />
                      </RoleGuard>
                    }
                  />

                  <Route
                    path="canteen-meals"
                    element={
                      <RoleGuard requiredRoles={['admin', 'hr_admin', 'department_manager']}>
                        <CanteenMealList />
                      </RoleGuard>
                    }
                  />

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
            </Router>
          </PermissionProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
