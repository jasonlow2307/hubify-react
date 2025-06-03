import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { LogOut, Music } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showNav = true }) => {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-spotify-black text-white">
      {showNav && isAuthenticated && (
        <nav className="bg-spotify-dark border-b border-spotify-gray px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Music className="h-8 w-8 text-spotify-green" />
              <span className="text-xl font-bold">Hubify</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-spotify-lightgray">
                Welcome, {user?.display_name}
              </span>
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-spotify-lightgray hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
};
