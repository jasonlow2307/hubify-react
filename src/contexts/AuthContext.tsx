import React, { createContext, useContext, useState, useEffect } from "react";
import { spotifyApi, setSpotifyToken, spotifyAuth } from "../services/api";
import type { SpotifyUser, AuthContextType } from "../types";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [loading, setLoading] = useState(true); // Add loading state

  const setToken = (token: string) => {
    console.log("Setting token:", token); // Debug log
    setAccessToken(token);
    setSpotifyToken(token);
    localStorage.setItem("spotify_access_token", token);
    setIsAuthenticated(true);
  };

  const login = () => {
    window.location.href = spotifyAuth.getAuthUrl();
  };

  const logout = () => {
    console.log("Logging out"); // Debug log
    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_token_expires");
  };

  const handleCallback = async () => {
    try {
      console.log("Handling callback..."); // Debug log

      // First, try to get token from URL hash (implicit flow)
      const tokenData = spotifyAuth.getTokenFromUrl();
      if (tokenData) {
        console.log("Found token in URL hash"); // Debug log
        const expiresAt = Date.now() + tokenData.expires_in * 1000;
        localStorage.setItem("spotify_token_expires", expiresAt.toString());
        setToken(tokenData.access_token);

        // Clear the hash from URL
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
        return;
      }

      // Fallback: try authorization code flow
      const code = spotifyAuth.getCodeFromUrl();
      if (code) {
        console.log("Found authorization code"); // Debug log
        try {
          const tokenResponse = await spotifyAuth.exchangeCodeForToken(code);
          setToken(tokenResponse.access_token);

          // Clear the code from URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } catch (error) {
          console.error("Authorization code flow failed:", error);
          // Redirect back to login
          window.location.href = "/";
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      logout();
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log("Initializing auth..."); // Debug log

      // Check for existing token
      const token = localStorage.getItem("spotify_access_token");
      const expiresAt = localStorage.getItem("spotify_token_expires");

      console.log("Stored token:", token ? "exists" : "none"); // Debug log
      console.log("Token expires at:", expiresAt); // Debug log

      if (token && expiresAt && Date.now() < parseInt(expiresAt)) {
        console.log("Using stored token"); // Debug log
        setToken(token);
      } else if (token) {
        console.log("Token expired, logging out"); // Debug log
        logout();
      }

      // Handle callback if we're on the callback page
      if (
        window.location.pathname === "/auth/callback" ||
        window.location.hash.includes("access_token") ||
        window.location.search.includes("code=")
      ) {
        console.log("Detected callback URL"); // Debug log
        await handleCallback();
      }

      setLoading(false); // Set loading to false after initialization
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessToken && !user) {
      console.log("Fetching user data..."); // Debug log
      spotifyApi
        .getCurrentUser()
        .then((userData) => {
          console.log("User data fetched:", userData); // Debug log
          setUser(userData);
        })
        .catch((error) => {
          console.error("Failed to fetch user:", error);
          logout();
        });
    }
  }, [isAuthenticated, accessToken, user]);

  // Don't render children until we've checked for existing auth
  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        accessToken,
        user,
        login,
        logout,
        setToken,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
