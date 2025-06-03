import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { AuthState, SpotifyUser } from "../types";
import { spotifyApi, spotifyAuth, setSpotifyToken } from "../services/api";

interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => void;
  handleCallback: (code: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    user: null,
    loading: true,
  });

  useEffect(() => {
    // Check for existing token in localStorage on app start
    const savedToken = localStorage.getItem("spotify_access_token");
    const savedUser = localStorage.getItem("spotify_user");

    if (savedToken && savedUser) {
      setSpotifyToken(savedToken);
      setAuthState({
        isAuthenticated: true,
        accessToken: savedToken,
        user: JSON.parse(savedUser),
        loading: false,
      });
    } else {
      setAuthState((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const login = () => {
    const authUrl = spotifyAuth.getAuthUrl();
    window.location.href = authUrl;
  };

  const logout = () => {
    localStorage.removeItem("spotify_access_token");
    localStorage.removeItem("spotify_user");
    setAuthState({
      isAuthenticated: false,
      accessToken: null,
      user: null,
      loading: false,
    });
  };

  const handleCallback = async (code: string) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true }));

      // Exchange code for token via your Django backend
      const tokenResponse = await spotifyAuth.exchangeCodeForToken(code);
      const accessToken = tokenResponse.access_token;

      // Set the token for API calls
      setSpotifyToken(accessToken);

      // Get user profile
      const user = await spotifyApi.getCurrentUser();

      // Save to localStorage
      localStorage.setItem("spotify_access_token", accessToken);
      localStorage.setItem("spotify_user", JSON.stringify(user));

      setAuthState({
        isAuthenticated: true,
        accessToken,
        user,
        loading: false,
      });
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthState({
        isAuthenticated: false,
        accessToken: null,
        user: null,
        loading: false,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        handleCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
