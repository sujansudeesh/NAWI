import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Instruments } from './pages/Instruments';
import { RegisterInstrument } from './pages/RegisterInstrument';
import { InstrumentDetail } from './pages/InstrumentDetail';
import { TestSessions } from './pages/TestSessions';
import { TestExecution } from './pages/TestExecution';
import { Reports } from './pages/Reports';
import { ReportDetail } from './pages/ReportDetail';
import { ReportVerification } from './pages/ReportVerification';
import { AuditTrail } from './pages/AuditTrail';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/common/Toast';

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Login & Verification Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/verify-report/:reportId" element={<ReportVerification />} />

          {/* Protected Application Routes inside Permanent Layout Shell */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="instruments" element={<Instruments />} />
            <Route path="instruments/new" element={<RegisterInstrument />} />
            <Route path="instruments/:id" element={<InstrumentDetail />} />
            <Route path="test-sessions" element={<TestSessions />} />
            <Route path="test-sessions/:id" element={<TestExecution />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/:id" element={<ReportDetail />} />
            <Route path="audit-trail" element={<AuditTrail />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;
