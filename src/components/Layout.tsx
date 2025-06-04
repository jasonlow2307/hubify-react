import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
  title?: string;
  subtitle?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showNav = true,
  title,
  subtitle,
}) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-spotify-black text-white">
      {showNav && isAuthenticated && (
        <Header title={title} subtitle={subtitle} showNavigation={showNav} />
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
};
