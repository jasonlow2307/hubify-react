import React, { useState, useEffect } from "react";
import { Play, Pause, RefreshCw, Heart, X } from "lucide-react";
import type { SpotifyTrack, SpotifyArtist } from "../types";
import { spotifyApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface TrackWithArtist extends SpotifyTrack {
  artist_details: SpotifyArtist;
}

interface RecommendationMatch {
  track: SpotifyTrack;
  similarity_score: number;
  reasons: string[];
}

export const Spotimatch: React.FC = () => {
  const { user } = useAuth();
  const [topTrack, setTopTrack] = useState<TrackWithArtist | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationMatch[]>(
    []
  );
  const [currentRecommendation, setCurrentRecommendation] =
    useState<RecommendationMatch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [likedTracks, setLikedTracks] = useState<string[]>([]);
  const [passedTracks, setPassedTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlistCreated, setPlaylistCreated] = useState(false);

  useEffect(() => {
    loadTopTrackAndRecommendations();
  }, []);

  useEffect(() => {
    if (recommendations.length > 0 && currentIndex < recommendations.length) {
      setCurrentRecommendation(recommendations[currentIndex]);
    } else if (
      currentIndex >= recommendations.length &&
      recommendations.length > 0
    ) {
      // All recommendations have been processed
      setCurrentRecommendation(null);
    }
  }, [recommendations, currentIndex]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [audio]);

  const loadTopTrackAndRecommendations = async () => {
    try {
      setLoading(true);

      // Get user's top track
      const topTracks = await spotifyApi.getTopTracks("medium_term", 1);
      if (topTracks.items.length === 0) {
        throw new Error("No top tracks found");
      }

      const track = topTracks.items[0];

      // Get detailed artist information
      const artistDetails = await spotifyApi.getArtist(track.artists[0].id);

      const topTrackWithArtist: TrackWithArtist = {
        ...track,
        artist_details: artistDetails,
      };

      setTopTrack(topTrackWithArtist);

      // Get recommendations based on the top track
      const recs = await spotifyApi.getRecommendations({
        seed_tracks: [track.id],
        limit: 20,
      });

      // Process recommendations with similarity scores and reasons
      interface RecommendationProcessor {
        track: SpotifyTrack;
        recTrack: SpotifyTrack;
        artistDetails: SpotifyArtist;
        reasons: string[];
        similarity_score: number;
      }

      const processedRecommendations: RecommendationMatch[] = recs.tracks.map(
        (recTrack: SpotifyTrack): RecommendationMatch => {
          const reasons: string[] = generateMatchReasons(
            track,
            recTrack,
            artistDetails
          );
          const similarity_score: number = calculateSimilarityScore(
            track,
            recTrack,
            reasons
          );

          return {
            track: recTrack,
            similarity_score,
            reasons,
          };
        }
      );

      // Sort by similarity score
      processedRecommendations.sort(
        (a, b) => b.similarity_score - a.similarity_score
      );

      setRecommendations(processedRecommendations);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error loading track and recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateMatchReasons = (
    seedTrack: SpotifyTrack,
    recTrack: SpotifyTrack,
    seedArtist: SpotifyArtist
  ): string[] => {
    const reasons: string[] = [];

    // Check for same artist
    if (
      seedTrack.artists.some((artist) =>
        recTrack.artists.some((recArtist) => recArtist.id === artist.id)
      )
    ) {
      reasons.push("Same artist");
    }

    // Check for genre similarity (if available)
    if (seedArtist.genres && seedArtist.genres.length > 0) {
      reasons.push(`Similar to ${seedArtist.genres[0]} genre`);
    }

    // Check for popularity similarity
    const popularityDiff = Math.abs(seedTrack.popularity - recTrack.popularity);
    if (popularityDiff < 20) {
      reasons.push("Similar popularity level");
    }

    // Check for energy/mood (based on track features - simplified)
    if (seedTrack.preview_url && recTrack.preview_url) {
      reasons.push("Both have audio previews");
    }

    // Default reason
    if (reasons.length === 0) {
      reasons.push("Recommended by Spotify algorithm");
    }

    return reasons;
  };

  const calculateSimilarityScore = (
    seedTrack: SpotifyTrack,
    recTrack: SpotifyTrack,
    reasons: string[]
  ): number => {
    let score = 50; // Base score

    // Boost score based on reasons
    if (reasons.includes("Same artist")) score += 30;
    if (reasons.includes("Similar popularity level")) score += 10;
    if (reasons.some((reason) => reason.includes("genre"))) score += 15;
    if (reasons.includes("Both have audio previews")) score += 5;

    // Adjust based on popularity
    const popularityScore = Math.min(recTrack.popularity, 100);
    score += popularityScore * 0.1;

    return Math.min(score, 100);
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
    setIsPlaying(true);

    newAudio.play();
    newAudio.onended = () => setIsPlaying(false);
    newAudio.onerror = () => setIsPlaying(false);
  };

  const pauseTrack = () => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleLike = () => {
    if (!currentRecommendation) return;

    setLikedTracks((prev) => [...prev, currentRecommendation.track.id]);
    nextTrack();
  };

  const handlePass = () => {
    if (!currentRecommendation) return;

    setPassedTracks((prev) => [...prev, currentRecommendation.track.id]);
    nextTrack();
  };

  const nextTrack = () => {
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const createPlaylist = async () => {
    if (likedTracks.length === 0 || !user) return;

    try {
      const playlistName = `Spotimatch - ${new Date().toLocaleDateString()}`;
      const playlist = await spotifyApi.createPlaylist(
        user.id,
        playlistName,
        `Tracks you liked based on your top song: ${topTrack?.name}`
      );

      // Add liked tracks to playlist
      await spotifyApi.addTracksToPlaylist(playlist.id, likedTracks);

      setPlaylistCreated(true);
    } catch (error) {
      console.error("Error creating playlist:", error);
    }
  };

  const refreshRecommendations = () => {
    setLikedTracks([]);
    setPassedTracks([]);
    setCurrentIndex(0);
    setPlaylistCreated(false);
    loadTopTrackAndRecommendations();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
          <p className="text-white">Loading your music taste...</p>
        </div>
      </div>
    );
  }

  if (!topTrack) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            No Top Tracks Found
          </h2>
          <p className="text-spotify-lightgray mb-6">
            We couldn't find your top tracks. Make sure you've been listening to
            music on Spotify!
          </p>
          <button
            onClick={refreshRecommendations}
            className="bg-spotify-green text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-spotify-green">
            Spotimatch
          </h1>
          <p className="text-xl text-spotify-lightgray">
            Discover new music based on your top track
          </p>
        </div>

        {/* Top Track Section */}
        <div className="bg-spotify-darkgray p-6 rounded-lg mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">
            Your Top Track
          </h2>
          <div className="flex items-center gap-6">
            <img
              src={topTrack.album.images[0]?.url}
              alt={topTrack.album.name}
              className="w-24 h-24 rounded-lg"
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold">{topTrack.name}</h3>
              <p className="text-spotify-lightgray text-lg">
                {topTrack.artists[0].name}
              </p>
              <p className="text-sm text-gray-400">{topTrack.album.name}</p>
              {topTrack.artist_details.genres &&
                topTrack.artist_details.genres.length > 0 && (
                  <p className="text-sm text-spotify-green mt-1">
                    Genres:{" "}
                    {topTrack.artist_details.genres.slice(0, 3).join(", ")}
                  </p>
                )}
            </div>
            <div className="text-center">
              <button
                onClick={() => (isPlaying ? pauseTrack() : playTrack(topTrack))}
                disabled={!topTrack.preview_url}
                className="bg-spotify-green text-black p-3 rounded-full hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              {!topTrack.preview_url && (
                <p className="text-xs text-gray-400 mt-1">No preview</p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-spotify-green">
              {likedTracks.length}
            </div>
            <div className="text-sm text-spotify-lightgray">Liked</div>
          </div>
          <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-400">
              {passedTracks.length}
            </div>
            <div className="text-sm text-spotify-lightgray">Passed</div>
          </div>
          <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">
              {Math.max(0, recommendations.length - currentIndex)}
            </div>
            <div className="text-sm text-spotify-lightgray">Remaining</div>
          </div>
        </div>

        {/* Current Recommendation */}
        {currentRecommendation ? (
          <div className="bg-spotify-darkgray p-8 rounded-lg text-center">
            <div className="mb-6">
              <img
                src={currentRecommendation.track.album.images[0]?.url}
                alt={currentRecommendation.track.album.name}
                className="w-64 h-64 mx-auto rounded-lg shadow-lg mb-4"
              />
              <h3 className="text-2xl font-bold mb-2">
                {currentRecommendation.track.name}
              </h3>
              <p className="text-xl text-spotify-lightgray mb-2">
                {currentRecommendation.track.artists[0].name}
              </p>
              <p className="text-sm text-gray-400 mb-4">
                {currentRecommendation.track.album.name}
              </p>

              {/* Similarity Score */}
              <div className="mb-4">
                <div className="text-sm text-spotify-lightgray mb-1">
                  Match Score
                </div>
                <div className="w-32 h-2 bg-gray-600 rounded-full mx-auto">
                  <div
                    className="h-full bg-spotify-green rounded-full"
                    style={{
                      width: `${currentRecommendation.similarity_score}%`,
                    }}
                  ></div>
                </div>
                <div className="text-sm text-spotify-green mt-1">
                  {Math.round(currentRecommendation.similarity_score)}%
                </div>
              </div>

              {/* Match Reasons */}
              <div className="mb-6">
                <div className="text-sm text-spotify-lightgray mb-2">
                  Why this matches:
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentRecommendation.reasons.map((reason, index) => (
                    <span
                      key={index}
                      className="bg-spotify-green text-black text-xs px-2 py-1 rounded-full"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Audio Controls */}
            <div className="mb-8">
              <button
                onClick={() =>
                  isPlaying
                    ? pauseTrack()
                    : playTrack(currentRecommendation.track)
                }
                disabled={!currentRecommendation.track.preview_url}
                className="bg-spotify-green text-black p-4 rounded-full hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              {!currentRecommendation.track.preview_url && (
                <p className="text-sm text-gray-400 mt-2">
                  No audio preview available
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-6 justify-center">
              <button
                onClick={handlePass}
                className="bg-red-600 text-white p-4 rounded-full hover:scale-110 transition-transform"
              >
                <X size={32} />
              </button>
              <button
                onClick={handleLike}
                className="bg-spotify-green text-black p-4 rounded-full hover:scale-110 transition-transform"
              >
                <Heart size={32} />
              </button>
            </div>
          </div>
        ) : (
          /* All Done */
          <div className="bg-spotify-darkgray p-8 rounded-lg text-center">
            <h2 className="text-3xl font-bold mb-4 text-spotify-green">
              All Done!
            </h2>
            <p className="text-xl mb-6">
              You've liked {likedTracks.length} tracks out of{" "}
              {recommendations.length} recommendations.
            </p>

            {likedTracks.length > 0 && !playlistCreated && (
              <div className="mb-6">
                <button
                  onClick={createPlaylist}
                  className="bg-spotify-green text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
                >
                  Create Playlist with Liked Tracks
                </button>
              </div>
            )}

            {playlistCreated && (
              <div className="bg-green-600 p-4 rounded-lg mb-6">
                <p className="text-white font-bold">
                  ✓ Playlist created successfully with {likedTracks.length}{" "}
                  tracks!
                </p>
              </div>
            )}

            <button
              onClick={refreshRecommendations}
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={20} />
              Get New Recommendations
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
