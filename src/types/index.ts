export interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
}

export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  preview_url: string | null;
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images?: SpotifyImage[];
  genres?: string[];
  popularity?: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
}

export interface TopTracksResponse {
  items: SpotifyTrack[];
  total: number;
  limit: number;
  offset: number;
}

export interface RecentlyPlayedResponse {
  items: {
    track: SpotifyTrack;
    played_at: string;
  }[];
}

export interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
}

export interface LeaderboardResponse {
  Items: LeaderboardEntry[];
  Count: number;
}

export interface GameState {
  currentTrack: SpotifyTrack | null;
  score: number;
  turn: number;
  gameOver: boolean;
  timeRemaining: number;
}

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: SpotifyUser | null;
  loading: boolean;
}

export type TimeRange = "short_term" | "medium_term" | "long_term";

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  public: boolean;
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
  };
}

export interface RecommendationsResponse {
  tracks: SpotifyTrack[];
  seeds: {
    id: string;
    type: string;
    href: string;
  }[];
}
