import React, { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  User,
  Music,
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type { SpotifyTrack, TimeRange } from "../types";
import { previewUrlApi, spotifyApi } from "../services/api";

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
  const [enhancingPreviews, setEnhancingPreviews] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState({
    processed: 0,
    total: 0,
  });
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showAllTracks, setShowAllTracks] = useState(false);
  const [artistsWithImages, setArtistsWithImages] = useState<{
    [key: string]: {
      name: string;
      count: number;
      tracks: SpotifyTrack[];
      imageUrl?: string;
    };
  }>({});

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
      setTracks(topTracks.items);

      // Calculate stats
      const calculatedStats = calculateStats(topTracks.items);
      setStats(calculatedStats);

      // Fetch artist images immediately (no delay)
      fetchArtistImages();
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

  const playTrack = async (track: SpotifyTrack) => {
    // Stop current audio if playing
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    // If no preview URL, try to find one
    if (!track.preview_url) {
      console.log(`No preview URL for ${track.name}, searching...`);

      try {
        const previewUrl = await previewUrlApi.findPreviewUrlDeezer(
          track.artists[0].name,
          track.name
        );

        if (previewUrl) {
          // Update the track in our state
          setTracks((prevTracks) =>
            prevTracks.map((t) =>
              t.id === track.id ? { ...t, preview_url: previewUrl } : t
            )
          );
          track.preview_url = previewUrl;
        } else {
          // No preview found, open in Spotify instead
          window.open(track.external_urls.spotify, "_blank");
          return;
        }
      } catch (error) {
        console.error("Failed to find preview URL:", error);
        // Fallback to opening in Spotify
        window.open(track.external_urls.spotify, "_blank");
        return;
      }
    }

    if (track.preview_url) {
      const newAudio = new Audio(track.preview_url);
      setAudio(newAudio);
      setPlayingTrack(track.id);

      newAudio.play().catch((error) => {
        console.error("Failed to play audio:", error);
        setPlayingTrack(null);
      });

      newAudio.onended = () => setPlayingTrack(null);
      newAudio.onerror = () => {
        console.error("Audio playback error");
        setPlayingTrack(null);
      };
    }
  };

  // Function to enhance all tracks with preview URLs - with real-time updates
  const enhanceAllPreviews = async () => {
    if (enhancingPreviews) return;

    setEnhancingPreviews(true);
    setEnhancementProgress({ processed: 0, total: 0 });

    try {
      const tracksNeedingPreview = tracks
        .map((track, index) => ({ track, index }))
        .filter(({ track }) => !track.preview_url);

      if (tracksNeedingPreview.length === 0) {
        console.log("All tracks already have preview URLs!");
        setEnhancingPreviews(false);
        return;
      }

      setEnhancementProgress({
        processed: 0,
        total: tracksNeedingPreview.length,
      });

      console.log(
        `🔍 Finding preview URLs for ${tracksNeedingPreview.length} tracks...`
      );

      // Process tracks sequentially to avoid overwhelming the APIs
      const DELAY_BETWEEN_REQUESTS = 600; // Delay between individual requests

      for (let i = 0; i < tracksNeedingPreview.length; i++) {
        const { track, index } = tracksNeedingPreview[i];

        try {
          console.log(
            `🎵 Searching for: ${track.name} by ${track.artists[0].name}`
          );

          const previewUrl = await previewUrlApi.findPreviewUrlDeezer(
            track.artists[0].name,
            track.name
          );

          if (previewUrl) {
            // Update tracks state immediately when a preview is found
            setTracks((prevTracks) =>
              prevTracks.map((t) =>
                t.id === track.id ? { ...t, preview_url: previewUrl } : t
              )
            );

            console.log(`✅ Found preview for: ${track.name} - NOW PLAYABLE!`);
          } else {
            console.log(`❌ No preview found for: ${track.name}`);
          }

          // Update progress after each track
          setEnhancementProgress({
            processed: i + 1,
            total: tracksNeedingPreview.length,
          });
        } catch (error) {
          console.error(`❌ Failed to find preview for ${track.name}:`, error);
        }

        // Add delay between requests to avoid rate limiting
        if (i < tracksNeedingPreview.length - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, DELAY_BETWEEN_REQUESTS)
          );
        }
      }

      // Final summary
      const finalTracksWithPreviews = tracks.filter(
        (track) => track.preview_url
      ).length;
      console.log(
        `🎉 Enhancement complete! Total tracks with previews: ${finalTracksWithPreviews}/${tracks.length}`
      );
    } catch (error) {
      console.error("Error enhancing tracks:", error);
    } finally {
      setEnhancingPreviews(false);
      setEnhancementProgress({ processed: 0, total: 0 });
    }
  };

  const pauseTrack = () => {
    if (audio) {
      audio.pause();
      setPlayingTrack(null);
    }
  };

  // Update the existing getArtistFrequency to use the helper
  const getArtistFrequency = () => {
    return getArtistFrequencyFromTracks(tracks);
  };

  // Add useEffect to fetch images when tracks change
  useEffect(() => {
    if (tracks.length > 0) {
      // Fetch images whenever tracks change
      fetchArtistImages(tracks);
    }
  }, [tracks]);

  const fetchArtistImages = async (tracksToProcess?: SpotifyTrack[]) => {
    try {
      // Use provided tracks or current tracks state
      const currentTracks = tracksToProcess || tracks;

      if (currentTracks.length === 0) {
        console.log("No tracks available for image fetching");
        return;
      }

      const artistFrequency = getArtistFrequencyFromTracks(currentTracks);
      const updatedArtists: typeof artistsWithImages = { ...artistsWithImages };

      // Get unique artist IDs that don't have images yet
      const artistsNeedingImages = artistFrequency
        .filter((artist) => {
          // Find the artist ID from tracks
          const artistId = currentTracks.find(
            (track) => track.artists[0].name === artist.name
          )?.artists[0].id;
          return artistId && !updatedArtists[artistId]?.imageUrl;
        })
        .slice(0, 10); // Limit to top 10 to avoid too many API calls

      console.log(
        `🎨 Fetching images for ${artistsNeedingImages.length} artists...`
      );

      // Fetch images for artists that need them - with real-time updates
      for (const artist of artistsNeedingImages) {
        try {
          // Find the artist ID from tracks
          const track = currentTracks.find(
            (track) => track.artists[0].name === artist.name
          );
          if (track) {
            const artistId = track.artists[0].id;
            console.log(`🖼️ Fetching image for artist: ${artist.name}`);

            const artistData = await spotifyApi.getArtist(artistId);

            updatedArtists[artistId] = {
              ...artist,
              imageUrl:
                artistData.images?.[0]?.url || artistData.images?.[1]?.url,
            };

            // Update state immediately when each image is found
            setArtistsWithImages({ ...updatedArtists });

            console.log(`✅ Found image for: ${artist.name}`);
          }

          // Small delay to avoid hitting rate limits
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Failed to fetch image for ${artist.name}:`, error);
        }
      }

      console.log(`🎉 Artist image fetching complete!`);
    } catch (error) {
      console.error("Error fetching artist images:", error);
    }
  };

  const getArtistFrequencyFromTracks = (tracksArray: SpotifyTrack[]) => {
    const artistCount: {
      [key: string]: {
        name: string;
        count: number;
        tracks: SpotifyTrack[];
        imageUrl?: string;
      };
    } = {};

    tracksArray.forEach((track) => {
      const artist = track.artists[0];
      if (!artistCount[artist.id]) {
        artistCount[artist.id] = {
          name: artist.name,
          count: 0,
          tracks: [],
          imageUrl: artistsWithImages[artist.id]?.imageUrl,
        };
      }
      artistCount[artist.id].count++;
      artistCount[artist.id].tracks.push(track);
    });

    return Object.values(artistCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const handleManualImageRefresh = () => {
    console.log("🔄 Manual image refresh triggered");
    fetchArtistImages(tracks);
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar size={24} />
              Time Period
            </h2>

            {/* Preview Enhancement Button */}
            <button
              onClick={enhanceAllPreviews}
              disabled={enhancingPreviews}
              className="px-4 py-2 cursor-pointer bg-spotify-green text-black rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${enhancingPreviews ? "animate-spin" : ""}`}
              />
              {enhancingPreviews
                ? `Finding Previews... (${enhancementProgress.processed}/${enhancementProgress.total})`
                : "Find Missing Previews"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {timeRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeRange(option.value)}
                className={`p-4 rounded-lg cursor-pointer text-left transition-all ${
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
          {/* Enhanced Top Tracks List */}
          <div className="bg-spotify-darkgray p-6 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp size={24} />
                Your Top Tracks
                <span className="text-sm text-spotify-lightgray font-normal">
                  ({tracks.filter((t) => t.preview_url).length}/{tracks.length}{" "}
                  with previews)
                </span>
              </h2>

              {/* Toggle button for showing all tracks */}
              <button
                onClick={() => setShowAllTracks(!showAllTracks)}
                className="px-3 py-1 cursor-pointer text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Music size={16} />
                {showAllTracks ? `Show Top 20` : `Show All ${tracks.length}`}
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tracks
                .slice(0, showAllTracks ? tracks.length : 20)
                .map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors"
                  >
                    <div className="text-spotify-green font-bold w-6 text-center">
                      {index + 1}
                    </div>
                    <div className="relative">
                      <img
                        src={
                          track.album.images[2]?.url ||
                          track.album.images[0]?.url
                        }
                        alt={track.album.name}
                        className="w-12 h-12 rounded"
                      />
                      {/* Preview indicator */}
                      {track.preview_url && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-spotify-green rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.name}</div>
                      <div className="text-sm text-spotify-lightgray truncate">
                        {track.artists[0].name}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {track.popularity}%
                    </div>

                    {/* Enhanced control buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          playingTrack === track.id
                            ? pauseTrack()
                            : playTrack(track)
                        }
                        className="p-2 cursor-pointer rounded-full hover:bg-spotify-green hover:text-black transition-colors"
                        title={
                          track.preview_url
                            ? "Play preview"
                            : "Find & play preview or open in Spotify"
                        }
                      >
                        {playingTrack === track.id ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} />
                        )}
                      </button>

                      <button
                        onClick={() =>
                          window.open(track.external_urls.spotify, "_blank")
                        }
                        className="p-2 rounded-full cursor-pointer hover:bg-spotify-green hover:text-black transition-colors"
                        title="Open in Spotify"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {/* Show count indicator at bottom */}
            <div className="mt-4 text-center text-sm text-spotify-lightgray">
              Showing{" "}
              {showAllTracks ? tracks.length : Math.min(20, tracks.length)} of{" "}
              {tracks.length} tracks
            </div>
          </div>

          {/* Artist Frequency with Enhanced Podium */}
          <div className="bg-spotify-darkgray p-6 rounded-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <User size={24} />
                Most Played Artists
              </h2>

              {/* Button to manually fetch artist images */}
              <button
                onClick={handleManualImageRefresh}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Load Images
              </button>
            </div>

            {/* Top 3 Artists Podium */}
            <div className="mb-8">
              <div className="flex items-end justify-center gap-6 mb-4">
                {getArtistFrequency()
                  .slice(0, 3)
                  .map((artist, index) => {
                    // Fix the positions and heights mapping
                    // index 0 = 1st place, index 1 = 2nd place, index 2 = 3rd place
                    // But we want to display them as: 2nd, 1st, 3rd (left to right)
                    const displayOrder = [1, 0, 2]; // 2nd place, 1st place, 3rd place
                    const heights = ["h-24", "h-32", "h-20"]; // Medium, Tallest, Shortest
                    const widths = ["w-20", "w-24", "w-18"]; // Medium, Widest, Narrowest
                    const colors = [
                      "bg-gray-400", // Silver for 2nd place
                      "bg-gradient-to-t from-yellow-500 to-yellow-300", // Gold for 1st place
                      "bg-gradient-to-t from-orange-500 to-orange-300", // Bronze for 3rd place
                    ];
                    const textColors = [
                      "text-gray-300", // Silver text
                      "text-yellow-300", // Gold text
                      "text-orange-300", // Bronze text
                    ];
                    const borderColors = [
                      "border-gray-400", // Silver border
                      "border-yellow-400", // Gold border
                      "border-orange-400", // Bronze border
                    ];
                    const trophyIcons = ["🥈", "🥇", "🥉"];

                    // Get the actual artist for this display position
                    const actualArtistIndex = displayOrder[index];
                    const actualArtist =
                      getArtistFrequency()[actualArtistIndex];

                    if (!actualArtist) return null;

                    // Find artist ID and get cached image
                    const track = tracks.find(
                      (track) => track.artists[0].name === actualArtist.name
                    );
                    const artistId = track?.artists[0].id;
                    const artistImage = artistId
                      ? artistsWithImages[artistId]?.imageUrl
                      : null;
                    const isImageLoading =
                      artistId && !artistsWithImages[artistId]?.imageUrl;

                    return (
                      <div
                        key={actualArtist.name}
                        className="flex flex-col items-center"
                      >
                        {/* Artist Image (circular) with loading state */}
                        <div className="relative mb-3">
                          <div
                            className={`w-20 h-20 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center overflow-hidden border-4 ${
                              borderColors[index]
                            } shadow-lg ${
                              isImageLoading ? "animate-pulse" : ""
                            }`}
                          >
                            {artistImage ? (
                              <img
                                src={artistImage}
                                alt={actualArtist.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  if (e.currentTarget.nextElementSibling) {
                                    (
                                      e.currentTarget
                                        .nextElementSibling as HTMLElement
                                    ).style.display = "flex";
                                  }
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center">
                                <User size={36} className="text-gray-300" />
                                {isImageLoading && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    Loading...
                                  </div>
                                )}
                              </div>
                            )}
                            {artistImage && (
                              <User
                                size={36}
                                className="text-gray-300 hidden"
                              />
                            )}
                          </div>
                          {/* Trophy Badge */}
                          <div className="absolute -top-1 -right-1 text-2xl">
                            {trophyIcons[index]}
                          </div>
                        </div>

                        {/* Podium */}
                        <div
                          className={`${heights[index]} ${widths[index]} ${colors[index]} rounded-t-xl flex flex-col items-center justify-end pb-3 shadow-lg relative`}
                        >
                          {/* Rank number */}
                          {/* <div className="absolute top-2 text-black font-bold text-lg">
                            {actualArtistIndex + 1}
                          </div> */}
                          {/* Track count */}
                          <div className="text-black font-bold text-lg">
                            {actualArtist.count}
                          </div>
                          <div className="text-black text-xs opacity-80">
                            tracks
                          </div>
                        </div>

                        {/* Artist Info */}
                        <div className="text-center mt-3 max-w-24">
                          <div
                            className={`font-bold ${textColors[index]} truncate`}
                          >
                            {actualArtist.name}
                          </div>
                          <div className="text-xs text-spotify-lightgray mt-1">
                            {Math.round(
                              (actualArtist.count / tracks.length) * 100
                            )}
                            % of top tracks
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Podium Base */}
              <div className="h-4 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-lg mx-8"></div>
            </div>

            {/* Rest of Artists List */}
            {getArtistFrequency().length > 3 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px bg-gray-600 flex-1"></div>
                  <span className="text-sm text-spotify-lightgray px-3">
                    Other Artists
                  </span>
                  <div className="h-px bg-gray-600 flex-1"></div>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getArtistFrequency()
                    .slice(3)
                    .map((artist, index) => {
                      // Find artist ID and get cached image
                      const track = tracks.find(
                        (track) => track.artists[0].name === artist.name
                      );
                      const artistId = track?.artists[0].id;
                      const artistImage = artistId
                        ? artistsWithImages[artistId]?.imageUrl
                        : null;
                      const isImageLoading =
                        artistId && !artistsWithImages[artistId]?.imageUrl;

                      return (
                        <div
                          key={artist.name}
                          className="flex items-center justify-between p-3 bg-gray-700/20 hover:bg-gray-700/40 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {/* Rank circle */}
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 4}
                            </div>
                            {/* Artist avatar with real image and loading state */}
                            <div
                              className={`w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center border-2 border-gray-500 overflow-hidden ${
                                isImageLoading ? "animate-pulse" : ""
                              }`}
                            >
                              {artistImage ? (
                                <img
                                  src={artistImage}
                                  alt={artist.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    if (e.currentTarget.nextElementSibling) {
                                      (
                                        e.currentTarget
                                          .nextElementSibling as HTMLElement
                                      ).style.display = "flex";
                                    }
                                  }}
                                />
                              ) : (
                                <User size={20} className="text-gray-300" />
                              )}
                              {artistImage && (
                                <User
                                  size={20}
                                  className="text-gray-300 hidden"
                                />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{artist.name}</div>
                              <div className="text-sm text-spotify-lightgray">
                                {artist.count} track
                                {artist.count > 1 ? "s" : ""} •{" "}
                                {Math.round(
                                  (artist.count / tracks.length) * 100
                                )}
                                %
                                {isImageLoading && (
                                  <span className="text-xs text-blue-400 ml-2">
                                    Loading image...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="w-20 h-2 bg-gray-600 rounded-full mb-1">
                              <div
                                className="h-full bg-gradient-to-r from-spotify-green to-green-400 rounded-full"
                                style={{
                                  width: `${
                                    (artist.count /
                                      getArtistFrequency()[0].count) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-400">
                              vs #1:{" "}
                              {Math.round(
                                (artist.count / getArtistFrequency()[0].count) *
                                  100
                              )}
                              %
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
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
                  className="p-3 cursor-pointer rounded-full bg-yellow-400 text-black hover:scale-110 transition-transform"
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
                  className="p-3 rounded-full cursor-pointer bg-purple-400 text-black hover:scale-110 transition-transform"
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
