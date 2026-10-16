import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './routes/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import ActiveInterview from './pages/ActiveInterview';
import InterviewHistory from './pages/InterviewHistory';
import ReportPage from './pages/ReportPage';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a1a2e', color: '#e8e8f8', border: '1px solid rgba(108,99,255,0.3)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#0d0d1a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0d0d1a' } },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />

          {/* Protected */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/interview/new" element={<ProtectedRoute><InterviewSetup /></ProtectedRoute>} />
          <Route path="/interview/:id" element={<ProtectedRoute><ActiveInterview /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><InterviewHistory /></ProtectedRoute>} />
          <Route path="/reports/:id" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
