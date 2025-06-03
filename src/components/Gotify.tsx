import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Home, Award } from "lucide-react";
import type { SpotifyTrack } from "../types";
import { spotifyApi } from "../services/api";
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
}

interface LeaderboardEntry {
  id: string;
  score: number;
  created_at: string;
}

export const Gotify: React.FC = () => {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    score: 10,
    turn: 0,
    timeLeft: 15,
    gameStarted: false,
    gameOver: false,
    showLeaderboard: false,
    isPlaying: false,
    currentTrack: null,
    guess: "",
    showReveal: false,
    tracks: [],
    playedTracks: [],
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Load user's top tracks for the game
  useEffect(() => {
    const loadTracks = async () => {
      try {
        setLoading(true);
        const response = await spotifyApi.getTopTracks("medium_term", 50);
        setGameState((prev) => ({ ...prev, tracks: response.items }));
      } catch (error) {
        console.error("Error loading tracks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, []);

  // Timer effect
  useEffect(() => {
    if (
      gameState.gameStarted &&
      !gameState.gameOver &&
      gameState.timeLeft > 0
    ) {
      timerRef.current = setTimeout(() => {
        setGameState((prev) => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
      }, 1000);
    } else if (gameState.timeLeft === 0 && gameState.gameStarted) {
      handleTimeUp();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState.timeLeft, gameState.gameStarted, gameState.gameOver]);

  const startGame = () => {
    if (gameState.tracks.length === 0) return;

    setGameState((prev) => ({
      ...prev,
      gameStarted: true,
      score: 10,
      turn: 1,
      timeLeft: 15,
      playedTracks: [],
    }));

    generateRandomTrack();
  };

  const generateRandomTrack = () => {
    const availableTracks = gameState.tracks.filter(
      (track) => !gameState.playedTracks.includes(track) && track.preview_url
    );

    if (availableTracks.length === 0) {
      // No more tracks with previews available
      endGame();
      return;
    }

    const randomTrack =
      availableTracks[Math.floor(Math.random() * availableTracks.length)];

    setGameState((prev) => ({
      ...prev,
      currentTrack: randomTrack,
      timeLeft: 15,
      guess: "",
      showReveal: false,
      isPlaying: false,
      playedTracks: [...prev.playedTracks, randomTrack],
    }));
  };

  const playTrack = () => {
    if (!gameState.currentTrack?.preview_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    audioRef.current = new Audio(gameState.currentTrack.preview_url);
    audioRef.current.play();
    setGameState((prev) => ({ ...prev, isPlaying: true }));

    audioRef.current.onended = () => {
      setGameState((prev) => ({ ...prev, isPlaying: false }));
    };
  };

  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setGameState((prev) => ({ ...prev, isPlaying: false }));
    }
  };

  const handleGuess = () => {
    if (!gameState.currentTrack || !gameState.guess.trim()) return;

    const correctAnswer = `${gameState.currentTrack.name} - ${gameState.currentTrack.artists[0].name}`;
    const guess = gameState.guess.toLowerCase().trim();
    const trackName = gameState.currentTrack.name.toLowerCase();
    const artistName = gameState.currentTrack.artists[0].name.toLowerCase();

    let isCorrect = false;
    let newScore = gameState.score;

    // Check if guess contains both track name and artist name
    if (guess.includes(trackName) && guess.includes(artistName)) {
      isCorrect = true;
      newScore += 3;
    } else if (guess.includes(trackName) || guess.includes(artistName)) {
      isCorrect = true;
      newScore += 1;
    } else {
      newScore -= 1;
    }

    setGameState((prev) => ({
      ...prev,
      score: newScore,
      showReveal: true,
    }));

    // Visual feedback
    const body = document.body;
    body.style.backgroundColor = isCorrect ? "#1db954" : "#ff0000";

    setTimeout(() => {
      body.style.backgroundColor = "#121212";
    }, 1000);
  };

  const handleReveal = () => {
    setGameState((prev) => ({ ...prev, showReveal: true }));
  };

  const nextTurn = () => {
    if (gameState.turn >= 5) {
      endGame();
      return;
    }

    setGameState((prev) => ({
      ...prev,
      turn: prev.turn + 1,
      showReveal: false,
      guess: "",
    }));

    generateRandomTrack();
  };

  const handleTimeUp = () => {
    setGameState((prev) => ({
      ...prev,
      score: prev.score - 1,
      showReveal: true,
    }));
  };

  const endGame = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setGameState((prev) => ({ ...prev, gameOver: true, isPlaying: false }));

    // Save score
    if (user) {
      try {
        await fetch("/api/save_score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            player_name: user.display_name,
            score: gameState.score,
          }),
        });
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
      score: 10,
      turn: 0,
      timeLeft: 15,
      gameStarted: false,
      gameOver: false,
      showLeaderboard: false,
      isPlaying: false,
      currentTrack: null,
      guess: "",
      showReveal: false,
      playedTracks: [],
    }));
  };

  const showLeaderboardData = async () => {
    try {
      const response = await fetch("/api/leaderboard");
      const data = await response.json();
      setLeaderboard(data.Items || []);
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spotify-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Game Start Screen */}
        {!gameState.gameStarted && !gameState.gameOver && (
          <div className="text-center bg-spotify-darkgray p-8 rounded-lg">
            <h1 className="text-4xl font-bold mb-4 text-spotify-green">
              Gotify
            </h1>
            <p className="text-xl mb-6">Guess the Spotify Song!</p>
            <p className="text-spotify-lightgray mb-8">
              Listen to short clips of your top tracks and guess the song and
              artist.
              <br />
              You have 15 seconds per track and 5 turns total.
            </p>
            <button
              onClick={startGame}
              disabled={gameState.tracks.length === 0}
              className="bg-spotify-green text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game
            </button>
            {gameState.tracks.length === 0 && (
              <p className="text-red-400 mt-4">
                No tracks available. Please try again later.
              </p>
            )}
          </div>
        )}

        {/* Game Screen */}
        {gameState.gameStarted &&
          !gameState.gameOver &&
          gameState.currentTrack && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="text-xl font-bold">
                  Turn {gameState.turn}/5 | Score: {gameState.score}
                </div>
                <div className="text-right">
                  <div className="text-lg">Time: {gameState.timeLeft}s</div>
                  <div className="w-32 h-2 bg-gray-600 rounded-full mt-1">
                    <div
                      className="h-full bg-spotify-green rounded-full transition-all duration-1000"
                      style={{ width: `${(gameState.timeLeft / 15) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Track Image */}
              <div className="text-center">
                <img
                  src={gameState.currentTrack.album.images[0]?.url}
                  alt="Album cover"
                  className="w-64 h-64 mx-auto rounded-lg shadow-lg"
                />
              </div>

              {/* Audio Controls */}
              <div className="text-center">
                <button
                  onClick={gameState.isPlaying ? pauseTrack : playTrack}
                  className="bg-spotify-green text-black p-4 rounded-full hover:scale-110 transition-transform"
                >
                  {gameState.isPlaying ? (
                    <Pause size={24} />
                  ) : (
                    <Play size={24} />
                  )}
                </button>
              </div>

              {/* Guess Input */}
              {!gameState.showReveal && (
                <div className="space-y-4">
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
                    className="w-full p-3 bg-spotify-darkgray border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-spotify-green focus:outline-none"
                    onKeyPress={(e) => e.key === "Enter" && handleGuess()}
                  />
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={handleGuess}
                      className="bg-spotify-green text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform"
                    >
                      Guess
                    </button>
                    <button
                      onClick={handleReveal}
                      className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform"
                    >
                      Reveal
                    </button>
                  </div>
                </div>
              )}

              {/* Reveal */}
              {gameState.showReveal && (
                <div className="text-center space-y-4">
                  <div className="bg-spotify-darkgray p-4 rounded-lg">
                    <h3 className="text-xl font-bold text-spotify-green mb-2">
                      Correct Answer:
                    </h3>
                    <p className="text-lg">{gameState.currentTrack.name}</p>
                    <p className="text-spotify-lightgray">
                      by {gameState.currentTrack.artists[0].name}
                    </p>
                  </div>
                  <button
                    onClick={nextTurn}
                    className="bg-spotify-green text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform"
                  >
                    {gameState.turn >= 5 ? "Finish Game" : "Next Track"}
                  </button>
                </div>
              )}
            </div>
          )}

        {/* Game Over Screen */}
        {gameState.gameOver && !gameState.showLeaderboard && (
          <div className="text-center bg-spotify-darkgray p-8 rounded-lg space-y-6">
            <h2 className="text-3xl font-bold text-spotify-green">
              Game Over!
            </h2>
            <p className="text-2xl">Final Score: {gameState.score}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={restartGame}
                className="bg-spotify-green text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2"
              >
                <RotateCcw size={20} />
                Play Again
              </button>
              <button
                onClick={showLeaderboardData}
                className="bg-blue-600 text-white font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Award size={20} />
                Leaderboard
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Home size={20} />
                Home
              </button>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {gameState.showLeaderboard && (
          <div className="bg-spotify-darkgray p-8 rounded-lg">
            <h2 className="text-3xl font-bold text-spotify-green mb-6 text-center">
              Leaderboard
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="py-2 px-4">Player</th>
                    <th className="py-2 px-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, index) => (
                    <tr key={index} className="border-b border-gray-700">
                      <td className="py-2 px-4">{entry.id}</td>
                      <td className="py-2 px-4">{entry.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-center mt-6">
              <button
                onClick={() =>
                  setGameState((prev) => ({ ...prev, showLeaderboard: false }))
                }
                className="bg-gray-600 text-white font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform"
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
