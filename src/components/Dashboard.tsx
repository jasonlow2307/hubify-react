import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { spotifyApi } from "../services/api";
import type { SpotifyTrack, SpotifyArtist } from "../types";
import {
  Music,
  TrendingUp,
  Clock,
  Play,
  Gamepad2,
  BarChart3,
  Trophy,
  Award,
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([]);
  const [topArtist, setTopArtist] = useState<SpotifyArtist | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch top tracks
        const topTracksData = await spotifyApi.getTopTracks("medium_term", 10);
        setTopTracks(topTracksData.items);

        // Fetch recently played
        const recentData = await spotifyApi.getRecentlyPlayed(10);
        setRecentTracks(recentData.items.map((item) => item.track));

        // Determine top artist from top tracks
        const artistCounts: {
          [key: string]: { count: number; artistId: string };
        } = {};

        topTracksData.items.forEach((track) => {
          const artist = track.artists[0];
          if (artistCounts[artist.id]) {
            artistCounts[artist.id].count++;
          } else {
            artistCounts[artist.id] = { count: 1, artistId: artist.id };
          }
        });

        const topArtistEntry = Object.values(artistCounts).reduce(
          (prev, current) => (prev.count > current.count ? prev : current)
        );

        const fullArtistData = await spotifyApi.getArtist(
          topArtistEntry.artistId
        );
        setTopArtist(fullArtistData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
          <p className="text-spotify-lightgray">Loading your music data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Games Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div
          onClick={() => navigate("/spotimatch")}
          className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-6 cursor-pointer hover:from-purple-700 hover:to-purple-900 transition-all"
        >
          <div className="flex items-center mb-4">
            <Music className="h-8 w-8 text-white mr-3" />
            <h3 className="text-xl font-bold text-white">Spotimatch</h3>
          </div>
          <p className="text-purple-100 mb-4">
            Discover songs that match your music taste based on your top tracks
          </p>
          <div className="flex items-center text-white">
            <Gamepad2 className="h-4 w-4 mr-2" />
            <span>Play Now</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/gotify")}
          className="bg-gradient-to-r from-green-600 to-green-800 rounded-lg p-6 cursor-pointer hover:from-green-700 hover:to-green-900 transition-all"
        >
          <div className="flex items-center mb-4">
            <Music className="h-8 w-8 text-white mr-3" />
            <h3 className="text-xl font-bold text-white">Gotify</h3>
          </div>
          <p className="text-green-100 mb-4">
            Guess the song game - test your knowledge of your favorite artists
          </p>
          <div className="flex items-center text-white">
            <Gamepad2 className="h-4 w-4 mr-2" />
            <span>Play Now</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/top-songs")}
          className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 cursor-pointer hover:from-blue-700 hover:to-blue-900 transition-all"
        >
          <div className="flex items-center mb-4">
            <TrendingUp className="h-8 w-8 text-white mr-3" />
            <h3 className="text-xl font-bold text-white">Top Songs</h3>
          </div>
          <p className="text-blue-100 mb-4">
            Analyze your music taste across different time periods
          </p>
          <div className="flex items-center text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span>View Analysis</span>
          </div>
        </div>

        <div
          onClick={() => navigate("/leaderboard")}
          className="bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-lg p-6 cursor-pointer hover:from-yellow-700 hover:to-yellow-900 transition-all"
        >
          <div className="flex items-center mb-4">
            <Trophy className="h-8 w-8 text-white mr-3" />
            <h3 className="text-xl font-bold text-white">Leaderboard</h3>
          </div>
          <p className="text-yellow-100 mb-4">
            See who's the best at Gotify and compete for the top spot
          </p>
          <div className="flex items-center text-white">
            <Award className="h-4 w-4 mr-2" />
            <span>View Rankings</span>
          </div>
        </div>
      </div>

      {/* Music Stats */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Top Artist */}
        {topArtist && (
          <div className="bg-spotify-gray rounded-lg p-6">
            <div className="flex items-center mb-4">
              <TrendingUp className="h-6 w-6 text-spotify-green mr-2" />
              <h3 className="text-lg font-semibold text-white">
                Your Top Artist
              </h3>
            </div>
            <div className="flex flex-col items-center">
              {topArtist.images && topArtist.images.length > 0 && (
                <img
                  src={topArtist.images[0].url}
                  alt={topArtist.name}
                  className="w-48 h-48 object-cover rounded-full mb-4"
                />
              )}
              <h4 className="text-xl font-bold text-white mb-2 text-center">
                {topArtist.name}
              </h4>
              {topArtist.genres && topArtist.genres.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {topArtist.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 bg-spotify-green text-black text-xs rounded-full"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
              {topArtist.followers && (
                <p className="text-spotify-lightgray text-sm">
                  {topArtist.followers.total.toLocaleString()} followers
                </p>
              )}
            </div>
          </div>
        )}

        {/* Top Tracks */}
        <div className="bg-spotify-gray rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Music className="h-6 w-6 text-spotify-green mr-2" />
            <h3 className="text-lg font-semibold text-white">
              Your Top Tracks
            </h3>
          </div>
          <div className="space-y-3">
            {topTracks.slice(0, 5).map((track, index) => (
              <div key={track.id} className="flex items-center space-x-3">
                <span className="text-spotify-lightgray font-bold w-6">
                  {index + 1}
                </span>
                {track.album.images[0] && (
                  <img
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    className="w-10 h-10 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {track.name}
                  </p>
                  <p className="text-spotify-lightgray text-xs truncate">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
                {track.preview_url && (
                  <Play className="h-4 w-4 text-spotify-green" />
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/top-songs")}
            className="mt-4 text-spotify-green hover:text-green-400 text-sm cursor-pointer"
          >
            View all top tracks →
          </button>
        </div>

        {/* Recently Played */}
        <div className="bg-spotify-gray rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Clock className="h-6 w-6 text-spotify-green mr-2" />
            <h3 className="text-lg font-semibold text-white">
              Recently Played
            </h3>
          </div>
          <div className="space-y-3">
            {recentTracks.slice(0, 5).map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="flex items-center space-x-3"
              >
                {track.album.images[0] && (
                  <img
                    src={track.album.images[0].url}
                    alt={track.album.name}
                    className="w-10 h-10 rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {track.name}
                  </p>
                  <p className="text-spotify-lightgray text-xs truncate">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
                {track.preview_url && (
                  <Play className="h-4 w-4 text-spotify-green" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
