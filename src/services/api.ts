import axios from "axios";
import {
  SpotifyUser,
  TopTracksResponse,
  RecentlyPlayedResponse,
  LeaderboardResponse,
  LeaderboardEntry,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

// Create axios instance for our Django backend
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Create axios instance for Spotify API
const spotifyClient = axios.create({
  baseURL: SPOTIFY_API_URL,
});

// Add auth token to Spotify requests
export const setSpotifyToken = (token: string) => {
  spotifyClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

// Spotify API calls
export const spotifyApi = {
  // Get current user profile
  getCurrentUser: async (): Promise<SpotifyUser> => {
    const response = await spotifyClient.get("/me");
    return response.data;
  },

  // Get user's top tracks
  getTopTracks: async (
    timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
    limit: number = 10
  ): Promise<TopTracksResponse> => {
    const response = await spotifyClient.get("/me/top/tracks", {
      params: { time_range: timeRange, limit },
    });
    return response.data;
  },

  // Get recently played tracks
  getRecentlyPlayed: async (
    limit: number = 10
  ): Promise<RecentlyPlayedResponse> => {
    const response = await spotifyClient.get("/me/player/recently-played", {
      params: { limit },
    });
    return response.data;
  },

  // Search for artists
  searchArtist: async (query: string) => {
    const response = await spotifyClient.get("/search", {
      params: { q: query, type: "artist", limit: 1 },
    });
    return response.data.artists.items[0];
  },

  // Get artist's top tracks
  getArtistTopTracks: async (artistId: string, market: string = "US") => {
    const response = await spotifyClient.get(
      `/artists/${artistId}/top-tracks`,
      {
        params: { market },
      }
    );
    return response.data.tracks;
  },

  // Get artist's albums
  getArtistAlbums: async (artistId: string, limit: number = 50) => {
    const response = await spotifyClient.get(`/artists/${artistId}/albums`, {
      params: { include_groups: "album,single", limit },
    });
    return response.data.items;
  },

  // Get album tracks
  getAlbumTracks: async (albumId: string) => {
    const response = await spotifyClient.get(`/albums/${albumId}/tracks`);
    return response.data.items;
  },

  // Get track details
  getTrack: async (trackId: string) => {
    const response = await spotifyClient.get(`/tracks/${trackId}`);
    return response.data;
  },

  // Get artist details
  getArtist: async (artistId: string) => {
    const response = await spotifyClient.get(`/artists/${artistId}`);
    return response.data;
  },

  // Get recommendations
  getRecommendations: async (params: {
    seed_tracks?: string[];
    seed_artists?: string[];
    seed_genres?: string[];
    limit?: number;
    target_energy?: number;
    target_danceability?: number;
  }) => {
    const response = await spotifyClient.get("/recommendations", { params });
    return response.data;
  },

  // Create playlist
  createPlaylist: async (
    userId: string,
    name: string,
    description?: string
  ) => {
    const response = await spotifyClient.post(`/users/${userId}/playlists`, {
      name,
      description,
      public: false,
    });
    return response.data;
  },

  // Add tracks to playlist
  addTracksToPlaylist: async (playlistId: string, trackIds: string[]) => {
    const uris = trackIds.map((id) => `spotify:track:${id}`);
    const response = await spotifyClient.post(
      `/playlists/${playlistId}/tracks`,
      {
        uris,
      }
    );
    return response.data;
  },
};

// Django backend API calls
export const backendApi = {
  // Save game score
  saveScore: async (
    playerName: string,
    score: number
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post("/api/save_score", {
      player_name: playerName,
      score,
    });
    return response.data;
  },

  // Get leaderboard
  getLeaderboard: async (): Promise<LeaderboardResponse> => {
    const response = await apiClient.get("/api/leaderboard");
    return response.data;
  },

  // Check if user is registered
  checkUserRegistration: async (email: string): Promise<boolean> => {
    try {
      const response = await apiClient.get(`/api/check-user/${email}`);
      return response.data.registered;
    } catch (error) {
      return false;
    }
  },
};

// Spotify Auth utilities
export const spotifyAuth = {
  // Generate auth URL
  getAuthUrl: (): string => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const scopes = import.meta.env.VITE_SPOTIFY_SCOPES;

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scopes,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  },

  // Exchange code for token (this would typically be done on the backend)
  exchangeCodeForToken: async (
    code: string
  ): Promise<{ access_token: string; refresh_token: string }> => {
    const response = await apiClient.post("/auth/callback", { code });
    return response.data;
  },
};

export default {
  spotify: spotifyApi,
  backend: backendApi,
  auth: spotifyAuth,
};
