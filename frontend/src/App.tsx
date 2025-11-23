/**
 * Main App Component - Router configuration
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/Common/ProtectedRoute';
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
                <Route path="employees" element={<EmployeeList />} />
                <Route path="employees/new" element={<EmployeeForm />} />
                <Route path="employees/:id/edit" element={<EmployeeForm />} />
                <Route path="departments" element={<DepartmentList />} />
                <Route path="profile" element={<div>User Profile (Coming Soon)</div>} />
                <Route path="settings" element={<div>Settings (Coming Soon)</div>} />
              </Route>
              <Route path="/onboarding/:token" element={<OnboardingForm />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
