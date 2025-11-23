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
import OnboardingForm from './pages/Onboarding/OnboardingForm';
import DepartmentList from './pages/Department/DepartmentList';
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
                      <RoleGuard requiredRole={['admin', 'hr_admin', 'department_manager']}>
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

                  {/* Edit employee - accessible to admin, hr_admin, and department_manager */}
                  <Route
                    path="employees/:id/edit"
                    element={
                      <RoleGuard requiredRole={['admin', 'hr_admin', 'department_manager']}>
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

                  {/* User profile - accessible to all authenticated users */}
                  <Route path="profile" element={<div>User Profile (Coming Soon)</div>} />

                  {/* Settings - admin only */}
                  <Route
                    path="settings"
                    element={
                      <RoleGuard requiredRole="admin">
                        <div>Settings (Coming Soon)</div>
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
