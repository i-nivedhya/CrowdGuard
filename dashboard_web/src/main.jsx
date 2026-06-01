import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, AlertProvider } from './context/OtherContexts';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Recordings from './pages/Recordings';
import About from './pages/About';
import Unauthorized from './pages/Unauthorized';

import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Protected — all logged-in users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute page="dashboard">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute page="analytics">
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recordings"
          element={
            <ProtectedRoute page="recordings">
              <Recordings />
            </ProtectedRoute>
          }
        />

        {/* Protected — admin + manager only */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute page="settings">
              <Settings />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
