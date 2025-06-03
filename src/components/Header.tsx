import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Music,
  LogOut,
  Home,
  TrendingUp,
  Gamepad2,
  Trophy,
  Heart,
  User,
  ChevronDown,
} from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showNavigation = true,
  className = "",
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = React.useState(false);

  const navigationItems = [
    {
      path: "/dashboard",
      label: "Dashboard",
      icon: <Home size={18} />,
    },
    {
      path: "/top-songs",
      label: "Top Songs",
      icon: <TrendingUp size={18} />,
    },
    {
      path: "/spotimatch",
      label: "Spotimatch",
      icon: <Heart size={18} />,
    },
    {
      path: "/gotify",
      label: "Gotify",
      icon: <Gamepad2 size={18} />,
    },
    {
      path: "/leaderboard",
      label: "Leaderboard",
      icon: <Trophy size={18} />,
    },
  ];

  const isCurrentPath = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
    setShowUserMenu(false);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header
      className={`bg-spotify-darkgray border-b border-spotify-gray ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Top bar with logo and user menu */}
        <div className="flex items-center justify-between mb-4">
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/dashboard")}
          >
            <div className="relative">
              <Music className="h-8 w-8 text-spotify-green" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Hubify</h1>
              <p className="text-xs text-spotify-lightgray -mt-1">
                Music Analytics
              </p>
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-spotify-gray transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-spotify-green to-green-600 rounded-full flex items-center justify-center">
                <User size={18} className="text-black" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-white">
                  {user?.display_name || "User"}
                </div>
                <div className="text-xs text-spotify-lightgray">
                  Spotify Connected
                </div>
              </div>
              <ChevronDown
                size={16}
                className={`text-spotify-lightgray transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-spotify-darkgray border border-spotify-gray rounded-lg shadow-xl z-50">
                <div className="p-3 border-b border-spotify-gray">
                  <div className="text-sm font-medium text-white">
                    {user?.display_name}
                  </div>
                  <div className="text-xs text-spotify-lightgray">
                    {user?.email || "Spotify Account"}
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full cursor-pointer flex items-center gap-2 p-2 text-left text-spotify-lightgray hover:text-white hover:bg-spotify-gray rounded transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {showNavigation && (
          <nav className="flex items-center gap-1 overflow-x-auto">
            {navigationItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isCurrentPath(item.path)
                    ? "bg-spotify-green text-black font-medium"
                    : "text-spotify-lightgray hover:text-white hover:bg-spotify-gray"
                }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Page Title */}
        {(title || subtitle) && (
          <div className="mt-6">
            {title && (
              <h2 className="text-3xl font-bold text-white mb-2">{title}</h2>
            )}
            {subtitle && <p className="text-spotify-lightgray">{subtitle}</p>}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
};
