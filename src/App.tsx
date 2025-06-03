import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { AuthCallback } from "./components/AuthCallback";
import { Gotify } from "./components/Gotify";
import { Spotimatch } from "./components/Spotimatch";
import { TopSongs } from "./components/TopSongs";
import { Leaderboard } from "./components/Leaderboard";

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green"></div>
      </div>
    );
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" />;
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        {/* Auth Callback */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout
                title="Welcome back! 🎵"
                subtitle="Here's your music overview and available games"
              >
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/top-songs"
          element={
            <ProtectedRoute>
              <Layout
                title="Top Songs Analysis"
                subtitle="Deep dive into your listening habits"
              >
                <TopSongs />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/spotimatch"
          element={
            <ProtectedRoute>
              <Layout
                title="Spotimatch"
                subtitle="Discover new music based on your top tracks"
              >
                <Spotimatch />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/gotify"
          element={
            <ProtectedRoute>
              <Layout title="Gotify" subtitle="Guess the Spotify Song!">
                <Gotify />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <Layout
                title="Gotify Leaderboard"
                subtitle="See who's the best at guessing songs!"
              >
                <Leaderboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
