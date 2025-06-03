import React, { useState, useEffect } from "react";
import { Calendar, TrendingUp, User, Music, Play, Pause } from "lucide-react";
import { SpotifyTrack, TimeRange } from "../types";
import { spotifyApi } from "../services/api";

interface TopSongsStats {
  totalTracks: number;
  uniqueArtists: number;
  topGenres: string[];
  averagePopularity: number;
  mostPopularTrack: SpotifyTrack | null;
  leastPopularTrack: SpotifyTrack | null;
}

export const TopSongs: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("medium_term");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [stats, setStats] = useState<TopSongsStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const timeRangeOptions: {
    value: TimeRange;
    label: string;
    description: string;
  }[] = [
    {
      value: "short_term",
      label: "Last 4 Weeks",
      description: "Your recent favorites",
    },
    {
      value: "medium_term",
      label: "Last 6 Months",
      description: "Your current taste",
    },
    {
      value: "long_term",
      label: "All Time",
      description: "Your overall favorites",
    },
  ];

  useEffect(() => {
    loadTopSongs();
  }, [timeRange]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  const loadTopSongs = async () => {
    try {
      setLoading(true);
      const topTracks = await spotifyApi.getTopTracks(timeRange, 50);
      setTracks(topTracks);

      // Calculate stats
      const calculatedStats = calculateStats(topTracks);
      setStats(calculatedStats);
    } catch (error) {
      console.error("Error loading top songs:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (tracks: SpotifyTrack[]): TopSongsStats => {
    if (tracks.length === 0) {
      return {
        totalTracks: 0,
        uniqueArtists: 0,
        topGenres: [],
        averagePopularity: 0,
        mostPopularTrack: null,
        leastPopularTrack: null,
      };
    }

    // Get unique artists
    const artistSet = new Set(tracks.map((track) => track.artists[0].id));
    const uniqueArtists = artistSet.size;

    // Calculate average popularity
    const totalPopularity = tracks.reduce(
      (sum, track) => sum + track.popularity,
      0
    );
    const averagePopularity = Math.round(totalPopularity / tracks.length);

    // Find most and least popular tracks
    const sortedByPopularity = [...tracks].sort(
      (a, b) => b.popularity - a.popularity
    );
    const mostPopularTrack = sortedByPopularity[0];
    const leastPopularTrack = sortedByPopularity[sortedByPopularity.length - 1];

    // For genres, we'd need artist details - simplified for now
    const topGenres: string[] = []; // Would require additional API calls

    return {
      totalTracks: tracks.length,
      uniqueArtists,
      topGenres,
      averagePopularity,
      mostPopularTrack,
      leastPopularTrack,
    };
  };

  const playTrack = (track: SpotifyTrack) => {
    if (!track.preview_url) return;

    // Stop current audio if playing
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    const newAudio = new Audio(track.preview_url);
    setAudio(newAudio);
    setPlayingTrack(track.id);

    newAudio.play();
    newAudio.onended = () => setPlayingTrack(null);
    newAudio.onerror = () => setPlayingTrack(null);
  };

  const pauseTrack = () => {
    if (audio) {
      audio.pause();
      setPlayingTrack(null);
    }
  };

  const getArtistFrequency = () => {
    const artistCount: {
      [key: string]: { name: string; count: number; tracks: SpotifyTrack[] };
    } = {};

    tracks.forEach((track) => {
      const artist = track.artists[0];
      if (!artistCount[artist.id]) {
        artistCount[artist.id] = {
          name: artist.name,
          count: 0,
          tracks: [],
        };
      }
      artistCount[artist.id].count++;
      artistCount[artist.id].tracks.push(track);
    });

    return Object.values(artistCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
          <p className="text-white">Analyzing your music taste...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-spotify-green">
            Top Songs Analysis
          </h1>
          <p className="text-xl text-spotify-lightgray">
            Deep dive into your listening habits
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="bg-spotify-darkgray p-6 rounded-lg mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar size={24} />
            Time Period
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`p-4 rounded-lg text-left transition-all ${
                  timeRange === option.value
                    ? "bg-spotify-green text-black"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <div className="font-bold">{option.label}</div>
                <div className="text-sm opacity-75">{option.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-spotify-green">
                {stats.totalTracks}
              </div>
              <div className="text-sm text-spotify-lightgray">Total Tracks</div>
            </div>
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">
                {stats.uniqueArtists}
              </div>
              <div className="text-sm text-spotify-lightgray">
                Unique Artists
              </div>
            </div>
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.averagePopularity}%
              </div>
              <div className="text-sm text-spotify-lightgray">
                Avg Popularity
              </div>
            </div>
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {Math.round((stats.uniqueArtists / stats.totalTracks) * 100)}%
              </div>
              <div className="text-sm text-spotify-lightgray">Diversity</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Tracks List */}
          <div className="bg-spotify-darkgray p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <TrendingUp size={24} />
              Your Top Tracks
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tracks.slice(0, 20).map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors"
                >
                  <div className="text-spotify-green font-bold w-6 text-center">
                    {index + 1}
                  </div>
                  <img
                    src={
                      track.album.images[2]?.url || track.album.images[0]?.url
                    }
                    alt={track.album.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{track.name}</div>
                    <div className="text-sm text-spotify-lightgray truncate">
                      {track.artists[0].name}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {track.popularity}%
                  </div>
                  <button
                    onClick={() =>
                      playingTrack === track.id
                        ? pauseTrack()
                        : playTrack(track)
                    }
                    disabled={!track.preview_url}
                    className="p-2 rounded-full hover:bg-spotify-green hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {playingTrack === track.id ? (
                      <Pause size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Artist Frequency */}
          <div className="bg-spotify-darkgray p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <User size={24} />
              Most Played Artists
            </h2>
            <div className="space-y-3">
              {getArtistFrequency().map((artist, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{artist.name}</div>
                    <div className="text-sm text-spotify-lightgray">
                      {artist.count} track{artist.count > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-spotify-green font-bold">
                      #{index + 1}
                    </div>
                    <div className="w-20 h-2 bg-gray-600 rounded-full">
                      <div
                        className="h-full bg-spotify-green rounded-full"
                        style={{
                          width: `${
                            (artist.count / getArtistFrequency()[0].count) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Popularity Analysis */}
        {stats && stats.mostPopularTrack && stats.leastPopularTrack && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-spotify-darkgray p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-yellow-400">
                Most Popular Track
              </h2>
              <div className="flex items-center gap-4">
                <img
                  src={
                    stats.mostPopularTrack.album.images[1]?.url ||
                    stats.mostPopularTrack.album.images[0]?.url
                  }
                  alt={stats.mostPopularTrack.album.name}
                  className="w-20 h-20 rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-lg">
                    {stats.mostPopularTrack.name}
                  </h3>
                  <p className="text-spotify-lightgray">
                    {stats.mostPopularTrack.artists[0].name}
                  </p>
                  <div className="mt-2">
                    <div className="text-sm text-spotify-lightgray">
                      Popularity
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-600 rounded-full">
                        <div
                          className="h-full bg-yellow-400 rounded-full"
                          style={{
                            width: `${stats.mostPopularTrack.popularity}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold">
                        {stats.mostPopularTrack.popularity}%
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    playingTrack === stats.mostPopularTrack!.id
                      ? pauseTrack()
                      : playTrack(stats.mostPopularTrack!)
                  }
                  disabled={!stats.mostPopularTrack.preview_url}
                  className="p-3 rounded-full bg-yellow-400 text-black hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {playingTrack === stats.mostPopularTrack.id ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-spotify-darkgray p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4 text-purple-400">
                Hidden Gem
              </h2>
              <div className="flex items-center gap-4">
                <img
                  src={
                    stats.leastPopularTrack.album.images[1]?.url ||
                    stats.leastPopularTrack.album.images[0]?.url
                  }
                  alt={stats.leastPopularTrack.album.name}
                  className="w-20 h-20 rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-lg">
                    {stats.leastPopularTrack.name}
                  </h3>
                  <p className="text-spotify-lightgray">
                    {stats.leastPopularTrack.artists[0].name}
                  </p>
                  <div className="mt-2">
                    <div className="text-sm text-spotify-lightgray">
                      Popularity
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-600 rounded-full">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{
                            width: `${stats.leastPopularTrack.popularity}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-bold">
                        {stats.leastPopularTrack.popularity}%
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    playingTrack === stats.leastPopularTrack!.id
                      ? pauseTrack()
                      : playTrack(stats.leastPopularTrack!)
                  }
                  disabled={!stats.leastPopularTrack.preview_url}
                  className="p-3 rounded-full bg-purple-400 text-black hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {playingTrack === stats.leastPopularTrack.id ? (
                    <Pause size={20} />
                  ) : (
                    <Play size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
