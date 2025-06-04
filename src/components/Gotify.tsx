import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Home,
  Award,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { SpotifyTrack } from "../types";
import { spotifyApi, backendApi, previewUrlApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface GameState {
  score: number;
  turn: number;
  timeLeft: number;
  gameStarted: boolean;
  gameOver: boolean;
  showLeaderboard: boolean;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  guess: string;
  showReveal: boolean;
  tracks: SpotifyTrack[];
  playedTracks: SpotifyTrack[];
  difficulty: "easy" | "medium" | "hard";
  maxTurns: number;
  turnTimeLimit: number;
  lastGuessResult: "correct" | "partial" | "wrong" | null;
  streak: number;
  hints: number;
  showHint: boolean;
  volume: number;
  // New states for progressive loading
  initialTracksLoaded: boolean;
  backgroundLoadingComplete: boolean;
  totalAvailableTracks: number;
}

interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  created_at: string;
  difficulty?: string;
  streak?: number;
}

export const Gotify: React.FC = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    turn: 0,
    timeLeft: 20,
    gameStarted: false,
    gameOver: false,
    showLeaderboard: false,
    isPlaying: false,
    currentTrack: null,
    guess: "",
    showReveal: false,
    tracks: [],
    playedTracks: [],
    difficulty: "medium",
    maxTurns: 10,
    turnTimeLimit: 20,
    lastGuessResult: null,
    streak: 0,
    hints: 3,
    showHint: false,
    volume: 0.7,
    // New initial values
    initialTracksLoaded: false,
    backgroundLoadingComplete: false,
    totalAvailableTracks: 0,
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [enhancingTracks, setEnhancingTracks] = useState(false);
  const [enhancementProgress, setEnhancementProgress] = useState({
    processed: 0,
    total: 0,
  });
  // Difficulty settings
  const difficultySettings = {
    easy: { maxTurns: 5, timeLimit: 30, scoreMultiplier: 1, hints: 5 },
    medium: { maxTurns: 10, timeLimit: 20, scoreMultiplier: 1.5, hints: 3 },
    hard: { maxTurns: 15, timeLimit: 15, scoreMultiplier: 2, hints: 1 },
  };

  // Progressive loading - load tracks in stages
  useEffect(() => {
    const loadInitialTracks = async () => {
      try {
        setLoading(true);

        // Calculate how many tracks we actually need (max turns + buffer for missing previews)
        const maxTurnsNeeded = Math.max(
          ...Object.values(difficultySettings).map((d) => d.maxTurns)
        );
        const tracksNeeded = Math.min(maxTurnsNeeded + 10, 25); // Max 25 tracks total with 10 track buffer

        // First: Load just the medium term tracks to start quickly
        const mediumTerm = await spotifyApi
          .getTopTracks("medium_term", tracksNeeded * 0.25)
          .catch(() => ({ items: [] }));

        if (mediumTerm.items.length > 0) {
          setGameState((prev) => ({
            ...prev,
            tracks: mediumTerm.items,
            totalAvailableTracks: mediumTerm.items.length,
          }));

          // Enhance the initial tracks quickly with just a few
          enhanceInitialTracksQuickly(mediumTerm.items);
        }

        setLoading(false);

        // Background loading: Get more tracks only if we need them
        if (mediumTerm.items.length < tracksNeeded) {
          loadAdditionalTracksInBackground(
            tracksNeeded - mediumTerm.items.length
          );
        } else {
          setGameState((prev) => ({
            ...prev,
            backgroundLoadingComplete: true,
          }));
        }
      } catch (error) {
        console.error("Error loading initial tracks:", error);
        setLoading(false);
      }
    };

    loadInitialTracks();
  }, []);
  // Quick enhancement for initial tracks - only process first 3 to get started fast
  const enhanceInitialTracksQuickly = async (tracks: SpotifyTrack[]) => {
    setEnhancingTracks(true);
    try {
      const tracksToEnhance = tracks.slice(0, 3); // Only enhance first 3 tracks initially
      const tracksWithoutPreviews = tracksToEnhance.filter(
        (track) => !track.preview_url
      );

      if (tracksWithoutPreviews.length === 0) {
        console.log("Initial tracks already have preview URLs!");
        setGameState((prev) => ({ ...prev, initialTracksLoaded: true }));
        setEnhancingTracks(false);
        return;
      }

      setEnhancementProgress({
        processed: 0,
        total: tracksWithoutPreviews.length,
      });

      const enhancedTracks = await previewUrlApi.enhanceTracksWithPreviewUrls(
        tracksToEnhance,
        (processed, total) => {
          setEnhancementProgress({ processed, total });
        }
      );

      setGameState((prev) => {
        const updatedTracks = [...prev.tracks];
        // Update only the enhanced tracks
        enhancedTracks.forEach((enhancedTrack, index) => {
          if (index < updatedTracks.length) {
            updatedTracks[index] = enhancedTrack;
          }
        });

        return {
          ...prev,
          tracks: updatedTracks,
          initialTracksLoaded: true,
        };
      });

      const previewCount = enhancedTracks.filter((t) => t.preview_url).length;
      console.log(
        `🎉 Initial enhancement complete: ${previewCount}/${enhancedTracks.length} tracks ready`
      );
    } catch (error) {
      console.error("Error enhancing initial tracks:", error);
    } finally {
      setEnhancingTracks(false);
      setEnhancementProgress({ processed: 0, total: 0 });
    }
  };
  const loadAdditionalTracksInBackground = async (additionalNeeded = 20) => {
    try {
      console.log(
        `🔄 Loading ${additionalNeeded} additional tracks in background...`
      );

      // Get short and long term tracks - only what we need
      const [shortTerm, longTerm] = await Promise.all([
        spotifyApi
          .getTopTracks("short_term", Math.ceil(additionalNeeded / 2))
          .catch(() => ({ items: [] })),
        spotifyApi
          .getTopTracks("long_term", Math.ceil(additionalNeeded / 2))
          .catch(() => ({ items: [] })),
      ]);

      // Combine with existing tracks and deduplicate
      setGameState((prev) => {
        const allTracks = [
          ...prev.tracks,
          ...shortTerm.items,
          ...longTerm.items,
        ];
        const uniqueTracks = allTracks.filter(
          (track, index, self) =>
            index === self.findIndex((t) => t.id === track.id)
        );

        // Calculate how many tracks we actually need (max turns + buffer for missing previews)
        const maxTurnsNeeded = Math.max(
          ...Object.values(difficultySettings).map((d) => d.maxTurns)
        );
        const finalTracks = uniqueTracks.slice(0, maxTurnsNeeded + 10); // Max needed + 10 buffer

        console.log(
          `📚 Background loading complete: ${finalTracks.length} total tracks (optimized for max ${maxTurnsNeeded} turns)`
        );

        return {
          ...prev,
          tracks: finalTracks,
          totalAvailableTracks: finalTracks.length,
          backgroundLoadingComplete: true,
        };
      });

      // Enhance the new tracks in background
      setTimeout(() => {
        setGameState((current) => {
          enhanceRemainingTracksInBackground(current.tracks);
          return current;
        });
      }, 500);
    } catch (error) {
      console.error("Error loading additional tracks:", error);
      setGameState((prev) => ({
        ...prev,
        backgroundLoadingComplete: true,
      }));
    }
  }; // Enhanced preview URL finding - for remaining tracks in background
  const enhanceRemainingTracksInBackground = async (tracks: SpotifyTrack[]) => {
    // Skip first 3 tracks as they were already enhanced
    const remainingTracks = tracks.slice(3);
    const tracksWithoutPreviews = remainingTracks.filter(
      (track) => !track.preview_url
    );

    if (tracksWithoutPreviews.length === 0) {
      console.log("All remaining tracks already have preview URLs!");
      return;
    }

    console.log(
      `🔍 Enhancing ${tracksWithoutPreviews.length} remaining tracks in background...`
    );

    try {
      const enhancedTracks = await previewUrlApi.enhanceTracksWithPreviewUrls(
        remainingTracks,
        () => {} // No progress updates for background enhancement
      );
      setGameState((prev) => {
        const updatedTracks = [...prev.tracks];
        // Update the remaining tracks
        enhancedTracks.forEach((enhancedTrack, index) => {
          const actualIndex = index + 3; // Offset by 3 since we skipped first 3
          if (actualIndex < updatedTracks.length) {
            updatedTracks[actualIndex] = enhancedTrack;
          }
        });

        return { ...prev, tracks: updatedTracks };
      });

      const finalPreviewCount = tracks.filter((t) => t.preview_url).length;
      console.log(
        `🎉 Background enhancement complete: ${finalPreviewCount}/${tracks.length} total tracks with previews`
      );
    } catch (error) {
      console.error("Error enhancing remaining tracks:", error);
    }
  };

  // Timer effect
  useEffect(() => {
    if (
      gameState.gameStarted &&
      !gameState.gameOver &&
      gameState.timeLeft > 0 &&
      !gameState.showReveal
    ) {
      timerRef.current = setTimeout(() => {
        setGameState((prev) => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (
      gameState.timeLeft === 0 &&
      gameState.gameStarted &&
      !gameState.showReveal
    ) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [
    gameState.timeLeft,
    gameState.gameStarted,
    gameState.gameOver,
    gameState.showReveal,
  ]);

  // Audio volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = gameState.volume;
    }
  }, [gameState.volume]);

  const setDifficulty = (difficulty: "easy" | "medium" | "hard") => {
    const settings = difficultySettings[difficulty];
    setGameState((prev) => ({
      ...prev,
      difficulty,
      maxTurns: settings.maxTurns,
      turnTimeLimit: settings.timeLimit,
      hints: settings.hints,
    }));
  };
  const startGame = () => {
    const tracksWithPreviews = gameState.tracks.filter(
      (track) => track.preview_url
    );

    // Progressive loading: Allow starting with just 3 tracks
    if (tracksWithPreviews.length < 3) {
      alert(
        `Need at least 3 tracks with preview URLs to start. Currently have ${
          tracksWithPreviews.length
        }. ${
          !gameState.initialTracksLoaded
            ? "Please wait for initial tracks to load."
            : "Try refreshing the page."
        }`
      );
      return;
    }

    setGameState((prev) => ({
      ...prev,
      gameStarted: true,
      score: 0,
      turn: 1,
      timeLeft: prev.turnTimeLimit,
      playedTracks: [],
      streak: 0,
      lastGuessResult: null,
      showReveal: false,
      guess: "",
      showHint: false,
    }));

    generateRandomTrack();
  };
  const generateRandomTrack = () => {
    const availableTracks = gameState.tracks.filter(
      (track) => !gameState.playedTracks.includes(track) && track.preview_url
    );

    if (availableTracks.length === 0) {
      endGame();
      return;
    }

    const randomTrack =
      availableTracks[Math.floor(Math.random() * availableTracks.length)];

    setGameState((prev) => ({
      ...prev,
      currentTrack: randomTrack,
      timeLeft: prev.turnTimeLimit,
      guess: "",
      showReveal: false,
      isPlaying: false,
      showHint: false,
      lastGuessResult: null,
      playedTracks: [...prev.playedTracks, randomTrack],
    }));

    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Auto-play the new track after a short delay
    setTimeout(() => {
      if (randomTrack?.preview_url) {
        audioRef.current = new Audio(randomTrack.preview_url);
        audioRef.current.volume = gameState.volume;
        audioRef.current.play().catch((error) => {
          console.error("Failed to auto-play audio:", error);
        });

        setGameState((prev) => ({ ...prev, isPlaying: true }));

        audioRef.current.onended = () => {
          setGameState((prev) => ({ ...prev, isPlaying: false }));
        };

        audioRef.current.onerror = () => {
          setGameState((prev) => ({ ...prev, isPlaying: false }));
          console.error("Audio failed to load");
        };
      }
    }, 500); // Small delay to ensure state is updated
  };

  const playTrack = () => {
    if (!gameState.currentTrack?.preview_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    audioRef.current = new Audio(gameState.currentTrack.preview_url);
    audioRef.current.volume = gameState.volume;
    audioRef.current.play().catch((error) => {
      console.error("Failed to play audio:", error);
    });

    setGameState((prev) => ({ ...prev, isPlaying: true }));

    audioRef.current.onended = () => {
      setGameState((prev) => ({ ...prev, isPlaying: false }));
    };

    audioRef.current.onerror = () => {
      setGameState((prev) => ({ ...prev, isPlaying: false }));
      console.error("Audio failed to load");
    };
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setGameState((prev) => ({ ...prev, isPlaying: false }));
    }
  };

  // Enhanced guess checking with fuzzy matching
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const norm1 = normalizeString(str1);
    const norm2 = normalizeString(str2);

    // Exact match
    if (norm1 === norm2) return 1;

    // Contains match
    if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.8;

    // Word-by-word matching
    const words1 = norm1.split(" ");
    const words2 = norm2.split(" ");
    const matchingWords = words1.filter((word) =>
      words2.some((w) => w.includes(word) || word.includes(w))
    );

    if (matchingWords.length > 0) {
      return matchingWords.length / Math.max(words1.length, words2.length);
    }

    return 0;
  };

  const handleGuess = () => {
    if (!gameState.currentTrack || !gameState.guess.trim()) return;

    const guess = gameState.guess.trim();
    const trackName = gameState.currentTrack.name;
    const artistName = gameState.currentTrack.artists[0].name;

    const trackSimilarity = calculateSimilarity(guess, trackName);
    const artistSimilarity = calculateSimilarity(guess, artistName);
    const combinedSimilarity = calculateSimilarity(
      guess,
      `${trackName} ${artistName}`
    );

    let isCorrect = false;
    let scoreIncrease = 0;
    let guessResult: "correct" | "partial" | "wrong" = "wrong";
    const settings = difficultySettings[gameState.difficulty];

    // Scoring logic based on similarity
    if (
      combinedSimilarity >= 0.8 ||
      (trackSimilarity >= 0.8 && artistSimilarity >= 0.8)
    ) {
      // Perfect or near-perfect match
      isCorrect = true;
      guessResult = "correct";
      scoreIncrease = Math.round(
        10 * settings.scoreMultiplier * (1 + gameState.streak * 0.1)
      );
    } else if (
      trackSimilarity >= 0.6 ||
      artistSimilarity >= 0.6 ||
      combinedSimilarity >= 0.6
    ) {
      // Partial match
      isCorrect = true;
      guessResult = "partial";
      scoreIncrease = Math.round(5 * settings.scoreMultiplier);
    } else {
      // Wrong answer
      guessResult = "wrong";
      scoreIncrease = -2;
    }

    // Time bonus for quick answers
    if (isCorrect && gameState.timeLeft > gameState.turnTimeLimit * 0.7) {
      scoreIncrease += Math.round(3 * settings.scoreMultiplier);
    }

    // Update streak
    const newStreak = isCorrect ? gameState.streak + 1 : 0;

    setGameState((prev) => ({
      ...prev,
      score: Math.max(0, prev.score + scoreIncrease),
      showReveal: true,
      lastGuessResult: guessResult,
      streak: newStreak,
    }));

    // Visual feedback
    const body = document.body;
    if (guessResult === "correct") {
      body.style.backgroundColor = "#1db954";
    } else if (guessResult === "partial") {
      body.style.backgroundColor = "#ff9500";
    } else {
      body.style.backgroundColor = "#ff0000";
    }

    setTimeout(() => {
      body.style.backgroundColor = "#121212";
    }, 1000);

    // Stop audio
    pauseTrack();
  };

  const useHint = () => {
    if (gameState.hints <= 0 || gameState.showHint) return;

    setGameState((prev) => ({
      ...prev,
      hints: prev.hints - 1,
      showHint: true,
      score: Math.max(0, prev.score - 1), // Small penalty for using hint
    }));
  };

  const handleReveal = () => {
    setGameState((prev) => ({
      ...prev,
      showReveal: true,
      lastGuessResult: "wrong",
      score: Math.max(0, prev.score - 3), // Penalty for revealing
      streak: 0,
    }));
    pauseTrack();
  };

  const nextTurn = () => {
    if (gameState.turn >= gameState.maxTurns) {
      endGame();
      return;
    }

    setGameState((prev) => ({
      ...prev,
      turn: prev.turn + 1,
      showReveal: false,
      guess: "",
      showHint: false,
    }));

    generateRandomTrack();
  };

  const handleTimeUp = () => {
    setGameState((prev) => ({
      ...prev,
      score: Math.max(0, prev.score - 2),
      showReveal: true,
      lastGuessResult: "wrong",
      streak: 0,
    }));
    pauseTrack();
  };

  const endGame = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setGameState((prev) => ({ ...prev, gameOver: true, isPlaying: false }));

    // Save score to backend
    if (user) {
      try {
        await backendApi.saveScore(
          user.display_name || user.id,
          gameState.score,
          "gotify",
          {
            difficulty: gameState.difficulty,
            streak: gameState.streak,
            turns_completed: gameState.turn,
          }
        );
      } catch (error) {
        console.error("Error saving score:", error);
      }
    }
  };

  const restartGame = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setGameState((prev) => ({
      ...prev,
      score: 0,
      turn: 0,
      timeLeft: prev.turnTimeLimit,
      gameStarted: false,
      gameOver: false,
      showLeaderboard: false,
      isPlaying: false,
      currentTrack: null,
      guess: "",
      showReveal: false,
      playedTracks: [],
      lastGuessResult: null,
      streak: 0,
      showHint: false,
      hints: difficultySettings[prev.difficulty].hints,
    }));
  };

  const showLeaderboardData = async () => {
    try {
      const response = await backendApi.getLeaderboard("gotify");
      setLeaderboard(response.leaderboard || []);
      setGameState((prev) => ({ ...prev, showLeaderboard: true }));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
          <p className="text-white">Loading your tracks...</p>
          {enhancingTracks && (
            <div className="mt-4">
              <p className="text-spotify-lightgray text-sm">
                Finding preview URLs... {enhancementProgress.processed}/
                {enhancementProgress.total}
              </p>
              <div className="w-64 h-2 bg-gray-600 rounded-full mx-auto mt-2">
                <div
                  className="h-full bg-spotify-green rounded-full transition-all"
                  style={{
                    width: `${
                      enhancementProgress.total > 0
                        ? (enhancementProgress.processed /
                            enhancementProgress.total) *
                          100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Game Start Screen */}
        {!gameState.gameStarted && !gameState.gameOver && (
          <div className="text-center bg-spotify-darkgray p-8 rounded-lg space-y-6">
            <h1 className="text-4xl font-bold mb-4 text-spotify-green">
              Gotify
            </h1>
            <p className="text-xl mb-6">Guess the Spotify Song!</p>
            <p className="text-spotify-lightgray mb-8">
              Listen to short clips of your top tracks and guess the song and
              artist.
              <br />
              Score points for correct guesses and build up streaks for bonus
              points!
            </p>{" "}
            {/* Track Statistics with Progressive Loading Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-spotify-green">
                  {gameState.tracks.length}
                </div>
                <div className="text-sm text-spotify-lightgray">
                  Total Tracks
                  {!gameState.backgroundLoadingComplete && (
                    <span className="block text-blue-400 text-xs">
                      Loading more...
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {gameState.tracks.filter((t) => t.preview_url).length}
                </div>
                <div className="text-sm text-spotify-lightgray">
                  With Previews
                  {enhancingTracks && (
                    <span className="block text-blue-400 text-xs">
                      Finding...
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  {gameState.maxTurns}
                </div>
                <div className="text-sm text-spotify-lightgray">Max Turns</div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">
                  {gameState.turnTimeLimit}s
                </div>
                <div className="text-sm text-spotify-lightgray">Time Limit</div>
              </div>
            </div>
            {/* Quick Start Status */}
            {gameState.tracks.filter((t) => t.preview_url).length >= 3 && (
              <div className="bg-green-600/20 border border-green-600 rounded-lg p-4 mb-6">
                <p className="text-green-400 font-bold mb-1">
                  🎮 Ready to Play!
                </p>
                <p className="text-green-200 text-sm">
                  You have{" "}
                  {gameState.tracks.filter((t) => t.preview_url).length} tracks
                  ready.
                  {!gameState.backgroundLoadingComplete &&
                    " More tracks are loading in the background to expand your game!"}
                </p>
              </div>
            )}
            {/* Difficulty Selection */}
            <div className="mb-8">
              <h3 className="text-lg font-bold mb-4">Choose Difficulty</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(difficultySettings).map(([key, settings]) => (
                  <button
                    key={key}
                    onClick={() =>
                      setDifficulty(key as "easy" | "medium" | "hard")
                    }
                    className={`p-4 rounded-lg border-2 transition-all ${
                      gameState.difficulty === key
                        ? "border-spotify-green bg-spotify-green/20"
                        : "border-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <div className="font-bold text-lg capitalize">{key}</div>
                    <div className="text-sm text-spotify-lightgray mt-1">
                      {settings.maxTurns} turns • {settings.timeLimit}s each
                    </div>
                    <div className="text-sm text-spotify-lightgray">
                      {settings.hints} hints • {settings.scoreMultiplier}x score
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {/* Volume Control */}
            <div className="mb-8">
              <div className="flex items-center gap-4 justify-center">
                <VolumeX size={20} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={gameState.volume}
                  onChange={(e) =>
                    setGameState((prev) => ({
                      ...prev,
                      volume: parseFloat(e.target.value),
                    }))
                  }
                  className="w-32 cursor-pointer"
                />
                <Volume2 size={20} />
                <span className="text-sm">
                  {Math.round(gameState.volume * 100)}%
                </span>
              </div>
            </div>{" "}
            <button
              onClick={startGame}
              disabled={
                gameState.tracks.filter((t) => t.preview_url).length < 3
              }
              className="bg-spotify-green cursor-pointer text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game
            </button>
            {gameState.tracks.filter((t) => t.preview_url).length < 3 && (
              <p className="text-red-400 mt-4">
                Need at least 3 tracks with preview URLs to start.
                {enhancingTracks
                  ? " Finding more preview URLs..."
                  : !gameState.initialTracksLoaded
                  ? " Loading initial tracks..."
                  : " Try refreshing the page."}
              </p>
            )}
            {enhancingTracks && (
              <div className="mt-4">
                <p className="text-spotify-lightgray text-sm mb-2">
                  Finding preview URLs... {enhancementProgress.processed}/
                  {enhancementProgress.total}
                </p>
                <div className="w-64 h-2 bg-gray-600 rounded-full mx-auto">
                  <div
                    className="h-full bg-spotify-green rounded-full transition-all"
                    style={{
                      width: `${
                        enhancementProgress.total > 0
                          ? (enhancementProgress.processed /
                              enhancementProgress.total) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game Screen */}
        {gameState.gameStarted &&
          !gameState.gameOver &&
          gameState.currentTrack && (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-spotify-darkgray p-6 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-spotify-green">
                      {gameState.turn}
                    </div>
                    <div className="text-sm text-spotify-lightgray">Turn</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {gameState.score}
                    </div>
                    <div className="text-sm text-spotify-lightgray">Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-400">
                      {gameState.streak}
                    </div>
                    <div className="text-sm text-spotify-lightgray">Streak</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-400">
                      {gameState.hints}
                    </div>
                    <div className="text-sm text-spotify-lightgray">Hints</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">
                      {gameState.timeLeft}
                    </div>
                    <div className="text-sm text-spotify-lightgray">Time</div>
                  </div>
                </div>

                {/* Time Progress Bar */}
                <div className="w-full h-3 bg-gray-600 rounded-full mt-4">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      gameState.timeLeft <= 5
                        ? "bg-red-500"
                        : "bg-spotify-green"
                    }`}
                    style={{
                      width: `${
                        (gameState.timeLeft / gameState.turnTimeLimit) * 100
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Track Display */}
              <div className="text-center bg-spotify-darkgray p-8 rounded-lg">
                <img
                  src={gameState.currentTrack.album.images[0]?.url}
                  alt="Album cover"
                  className="w-64 h-64 mx-auto rounded-lg shadow-lg mb-6"
                />

                {/* Hint Display */}
                {gameState.showHint && (
                  <div className="mb-4 p-4 bg-yellow-600/20 border border-yellow-600 rounded-lg">
                    <p className="text-yellow-400 font-bold">Hint:</p>
                    <p className="text-white">
                      Album: {gameState.currentTrack.album.name}
                    </p>
                    <p className="text-spotify-lightgray text-sm">
                      Released:{" "}
                      {new Date(
                        gameState.currentTrack.album.release_date
                      ).getFullYear()}
                    </p>
                  </div>
                )}

                {/* Audio Controls */}
                <div className="flex justify-center gap-4 mb-6">
                  <button
                    onClick={gameState.isPlaying ? pauseTrack : playTrack}
                    className="bg-spotify-green text-black p-4 rounded-full hover:scale-110 transition-transform"
                  >
                    {gameState.isPlaying ? (
                      <Pause size={32} />
                    ) : (
                      <Play size={32} />
                    )}
                  </button>

                  {gameState.hints > 0 && !gameState.showHint && (
                    <button
                      onClick={useHint}
                      className="bg-yellow-600 text-white p-4 rounded-full hover:scale-110 transition-transform"
                      title="Use a hint (-1 point)"
                    >
                      💡
                    </button>
                  )}
                </div>

                {/* Guess Input */}
                {!gameState.showReveal && (
                  <div className="space-y-4 max-w-md mx-auto">
                    <input
                      type="text"
                      value={gameState.guess}
                      onChange={(e) =>
                        setGameState((prev) => ({
                          ...prev,
                          guess: e.target.value,
                        }))
                      }
                      placeholder="Enter song name and artist..."
                      className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-spotify-green focus:outline-none text-lg"
                      onKeyPress={(e) => e.key === "Enter" && handleGuess()}
                      autoFocus
                    />
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={handleGuess}
                        disabled={!gameState.guess.trim()}
                        className="bg-spotify-green text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Guess
                      </button>
                      <button
                        onClick={handleReveal}
                        className="bg-red-600 text-white font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
                        title="Give up (-3 points)"
                      >
                        Give Up
                      </button>
                    </div>
                  </div>
                )}

                {/* Reveal */}
                {gameState.showReveal && (
                  <div className="space-y-6 max-w-md mx-auto">
                    {/* Result Badge */}
                    {gameState.lastGuessResult && (
                      <div
                        className={`p-4 rounded-lg ${
                          gameState.lastGuessResult === "correct"
                            ? "bg-green-600/20 border border-green-600"
                            : gameState.lastGuessResult === "partial"
                            ? "bg-yellow-600/20 border border-yellow-600"
                            : "bg-red-600/20 border border-red-600"
                        }`}
                      >
                        <div
                          className={`font-bold text-lg ${
                            gameState.lastGuessResult === "correct"
                              ? "text-green-400"
                              : gameState.lastGuessResult === "partial"
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {gameState.lastGuessResult === "correct"
                            ? "🎉 Perfect!"
                            : gameState.lastGuessResult === "partial"
                            ? "⚡ Close!"
                            : "❌ Wrong"}
                        </div>
                        {gameState.guess && (
                          <div className="text-sm text-gray-300 mt-1">
                            Your guess: "{gameState.guess}"
                          </div>
                        )}
                      </div>
                    )}

                    {/* Correct Answer */}
                    <div className="bg-spotify-darkgray p-6 rounded-lg border border-spotify-green">
                      <h3 className="text-xl font-bold text-spotify-green mb-3">
                        Correct Answer:
                      </h3>
                      <p className="text-xl font-bold">
                        {gameState.currentTrack.name}
                      </p>
                      <p className="text-lg text-spotify-lightgray">
                        by {gameState.currentTrack.artists[0].name}
                      </p>
                      <p className="text-sm text-gray-400 mt-2">
                        Album: {gameState.currentTrack.album.name} (
                        {new Date(
                          gameState.currentTrack.album.release_date
                        ).getFullYear()}
                        )
                      </p>
                    </div>

                    <button
                      onClick={nextTurn}
                      onKeyPress={(e) => e.key === "Enter" && nextTurn()}
                      className="bg-spotify-green text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
                      tabIndex={0}
                      autoFocus
                    >
                      {gameState.turn >= gameState.maxTurns
                        ? "Finish Game"
                        : "Next Track"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Game Over Screen */}
        {gameState.gameOver && !gameState.showLeaderboard && (
          <div className="text-center bg-spotify-darkgray p-8 rounded-lg space-y-6">
            <h2 className="text-4xl font-bold text-spotify-green mb-4">
              Game Over!
            </h2>

            {/* Final Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-3xl font-bold text-spotify-green">
                  {gameState.score}
                </div>
                <div className="text-sm text-spotify-lightgray">
                  Final Score
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-3xl font-bold text-purple-400">
                  {gameState.streak}
                </div>
                <div className="text-sm text-spotify-lightgray">
                  Best Streak
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-3xl font-bold text-yellow-400">
                  {gameState.turn}
                </div>
                <div className="text-sm text-spotify-lightgray">
                  Turns Played
                </div>
              </div>
              <div className="bg-gray-700 p-4 rounded-lg">
                <div className="text-3xl font-bold text-blue-400 capitalize">
                  {gameState.difficulty}
                </div>
                <div className="text-sm text-spotify-lightgray">Difficulty</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <button
                onClick={restartGame}
                className="bg-spotify-green text-black font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2"
              >
                <RotateCcw size={20} />
                Play Again
              </button>
              <button
                onClick={showLeaderboardData}
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Award size={20} />
                Leaderboard
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="bg-gray-600 text-white font-bold py-3 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Home size={20} />
                Home
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Leaderboard */}
        {gameState.showLeaderboard && (
          <div className="bg-spotify-darkgray p-8 rounded-lg">
            <h2 className="text-3xl font-bold text-spotify-green mb-6 text-center">
              🏆 Gotify Leaderboard
            </h2>

            {leaderboard.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Player</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Difficulty</th>
                      <th className="py-3 px-4">Best Streak</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr
                        key={`${entry.player_name}-${entry.created_at}`}
                        className={`border-b border-gray-700 ${
                          entry.player_name === user?.display_name
                            ? "bg-spotify-green/10"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-bold">
                          {index + 1}
                          {index === 0 && " 🥇"}
                          {index === 1 && " 🥈"}
                          {index === 2 && " 🥉"}
                        </td>
                        <td className="py-3 px-4">{entry.player_name}</td>
                        <td className="py-3 px-4 font-bold text-spotify-green">
                          {entry.score}
                        </td>
                        <td className="py-3 px-4 capitalize">
                          {entry.difficulty || "medium"}
                        </td>
                        <td className="py-3 px-4">{entry.streak || 0}</td>
                        <td className="py-3 px-4 text-sm text-gray-400">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-spotify-lightgray">
                  No scores yet. Be the first to play!
                </p>
              </div>
            )}

            <div className="text-center mt-6">
              <button
                onClick={() =>
                  setGameState((prev) => ({ ...prev, showLeaderboard: false }))
                }
                className="bg-gray-600 cursor-pointer text-white font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
