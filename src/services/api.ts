import axios from "axios";
import type {
  SpotifyUser,
  TopTracksResponse,
  RecentlyPlayedResponse,
  LeaderboardResponse,
  LeaderboardEntry,
  GameScore,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

// Create axios instance for our Django backend
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000, // Add timeout
});

// Add CSRF token interceptor for Django (only if backend is available)
apiClient.interceptors.request.use(async (config) => {
  // Skip CSRF token for now during development
  // You can enable this when you have the Django backend running
  /*
  try {
    const csrfResponse = await axios.get(`${API_BASE_URL}/api/csrf/`, {
      withCredentials: true,
      timeout: 2000,
    });
    const csrfToken = csrfResponse.data.csrfToken;
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  } catch (error) {
    console.warn('Failed to get CSRF token:', error);
  }
  */
  return config;
});

// Create axios instance for Spotify API
const spotifyClient = axios.create({
  baseURL: SPOTIFY_API_URL,
});

// Add auth token to Spotify requests
export const setSpotifyToken = (token: string) => {
  spotifyClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

// Add error interceptor for Spotify API
spotifyClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Spotify token expired or invalid");
      // Clear token and redirect to login
      localStorage.removeItem("spotify_access_token");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

// ... rest of the spotifyApi remains the same ...
export const spotifyApi = {
  // Get current user profile
  getCurrentUser: async (): Promise<SpotifyUser> => {
    try {
      const response = await spotifyClient.get("/me");
      return response.data;
    } catch (error) {
      console.error("Error fetching current user:", error);
      throw new Error("Failed to fetch user profile");
    }
  },

  // Get user's top tracks
  getTopTracks: async (
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit: number = 10
  ): Promise<TopTracksResponse> => {
    try {
      const response = await spotifyClient.get("/me/top/tracks", {
        params: { time_range: timeRange, limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching top tracks:", error);
      throw new Error("Failed to fetch top tracks");
    }
  },

  // Get recently played tracks
  getRecentlyPlayed: async (
    limit: number = 10
  ): Promise<RecentlyPlayedResponse> => {
    try {
      const response = await spotifyClient.get("/me/player/recently-played", {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching recently played tracks:", error);
      throw new Error("Failed to fetch recently played tracks");
    }
  },

  // ... rest of spotify methods remain the same ...
};

// Mock backend API for development (replace with real backend later)
export const backendApi = {
  // Save game score (mock implementation using localStorage)
  saveScore: async (
    playerName: string,
    score: number,
    gameType: "gotify" | "spotimatch" = "gotify"
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Mock implementation using localStorage
      const scores = JSON.parse(localStorage.getItem("game_scores") || "[]");
      const newScore = {
        id: Date.now(),
        player_name: playerName,
        score,
        game_type: gameType,
        created_at: new Date().toISOString(),
      };
      scores.push(newScore);
      localStorage.setItem("game_scores", JSON.stringify(scores));

      return { success: true, message: "Score saved successfully!" };
    } catch (error) {
      console.error("Error saving score:", error);
      return { success: false, message: "Failed to save score" };
    }
  },

  // Get leaderboard (mock implementation using localStorage)
  getLeaderboard: async (
    gameType?: "gotify" | "spotimatch"
  ): Promise<LeaderboardResponse> => {
    try {
      // Mock implementation using localStorage
      const scores = JSON.parse(localStorage.getItem("game_scores") || "[]");
      let filteredScores = scores;

      if (gameType) {
        filteredScores = scores.filter(
          (score: any) => score.game_type === gameType
        );
      }

      // Sort by score descending and take top 10
      const Items = filteredScores
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 10);

      return { Items, Count: Items.length, leaderboard: Items };
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return { leaderboard: [], Items: [], Count: 0 };
    }
  },

  // Check if user is registered (mock - always return true for now)
  checkUserRegistration: async (email: string): Promise<boolean> => {
    try {
      // Mock implementation - you can add real backend logic later
      return true;
    } catch (error) {
      console.error("Error checking user registration:", error);
      return false;
    }
  },

  // Get CSRF token (not needed for mock)
  getCSRFToken: async (): Promise<string> => {
    return "mock-csrf-token";
  },
};

// Spotify Auth utilities
export const spotifyAuth = {
  // Generate auth URL for implicit grant flow
  getAuthUrl: (): string => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const scopes = import.meta.env.VITE_SPOTIFY_SCOPES;

    if (!clientId || !redirectUri || !scopes) {
      throw new Error(
        "Missing Spotify configuration. Check your environment variables."
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "token", // Changed from "code" to "token" for implicit flow
      redirect_uri: redirectUri,
      scope: scopes,
      show_dialog: "true", // Optional: force user to approve app again
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  },

  // Parse access token from URL hash (implicit flow)
  getTokenFromUrl: (): { access_token: string; expires_in: number } | null => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const expiresIn = params.get("expires_in");

    if (accessToken && expiresIn) {
      return {
        access_token: accessToken,
        expires_in: parseInt(expiresIn),
      };
    }

    return null;
  },

  // Parse authorization code from URL (for authorization code flow)
  getCodeFromUrl: (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("code");
  },

  // Mock implementation for now - remove the error
  exchangeCodeForToken: async (
    code: string
  ): Promise<{ access_token: string; refresh_token?: string }> => {
    // For now, let's check if we can get the token from the URL hash instead
    const tokenData = spotifyAuth.getTokenFromUrl();
    if (tokenData) {
      return { access_token: tokenData.access_token };
    }

    // If no token in URL, this means we need a backend
    throw new Error(
      "Token exchange requires a backend server. Please use implicit grant flow instead."
    );
  },
};

export default {
  spotify: spotifyApi,
  backend: backendApi,
  auth: spotifyAuth,
};
