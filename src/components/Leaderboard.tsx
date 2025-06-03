import React, { useState, useEffect } from "react";
import { Trophy, Medal, Award, RefreshCw, Calendar } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  score: number;
  created_at: string;
}

export const Leaderboard: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/leaderboard");
      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setLeaderboard(data.Items || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      setError("Failed to load leaderboard. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="text-yellow-400" size={24} />;
      case 2:
        return <Medal className="text-gray-400" size={24} />;
      case 3:
        return <Award className="text-amber-600" size={24} />;
      default:
        return (
          <span className="text-spotify-green font-bold text-lg">#{rank}</span>
        );
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500 to-yellow-600 text-black";
      case 2:
        return "bg-gradient-to-r from-gray-400 to-gray-500 text-black";
      case 3:
        return "bg-gradient-to-r from-amber-600 to-amber-700 text-black";
      default:
        return "bg-spotify-darkgray hover:bg-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Unknown date";
    }
  };

  const getScoreStats = () => {
    if (leaderboard.length === 0) return null;

    const scores = leaderboard.map((entry) => entry.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const avgScore = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );

    return { maxScore, minScore, avgScore };
  };

  const stats = getScoreStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
          <p className="text-white">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">Oops!</h2>
          <p className="text-spotify-lightgray mb-6">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="bg-spotify-green text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={20} />
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
          <h1 className="text-4xl font-bold mb-4 text-spotify-green flex items-center justify-center gap-3">
            <Trophy size={40} />
            Gotify Leaderboard
          </h1>
          <p className="text-xl text-spotify-lightgray">
            See who's the best at guessing songs!
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-spotify-green">
                {leaderboard.length}
              </div>
              <div className="text-sm text-spotify-lightgray">
                Total Players
              </div>
            </div>
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {stats.maxScore}
              </div>
              <div className="text-sm text-spotify-lightgray">
                Highest Score
              </div>
            </div>
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">
                {stats.avgScore}
              </div>
              <div className="text-sm text-spotify-lightgray">
                Average Score
              </div>
            </div>
            <div className="bg-spotify-darkgray p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">
                {stats.minScore}
              </div>
              <div className="text-sm text-spotify-lightgray">Lowest Score</div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center mb-6">
          <button
            onClick={fetchLeaderboard}
            disabled={loading}
            className="bg-spotify-green text-black font-bold py-2 px-6 rounded-full hover:scale-105 transition-transform flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            Refresh Leaderboard
          </button>
        </div>

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <div className="bg-spotify-darkgray p-8 rounded-lg text-center">
            <div className="text-spotify-lightgray text-6xl mb-4">🎵</div>
            <h2 className="text-2xl font-bold mb-4">No Scores Yet</h2>
            <p className="text-spotify-lightgray mb-6">
              Be the first to play Gotify and set a score!
            </p>
            <button
              onClick={() => (window.location.href = "/gotify")}
              className="bg-spotify-green text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
            >
              Play Gotify Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const rank = index + 1;
              return (
                <div
                  key={`${entry.id}-${entry.created_at}-${index}`}
                  className={`flex items-center p-4 rounded-lg transition-all ${getRankStyle(
                    rank
                  )}`}
                >
                  {/* Rank */}
                  <div className="flex items-center justify-center w-12 h-12 mr-4">
                    {getRankIcon(rank)}
                  </div>

                  {/* Player Info */}
                  <div className="flex-1">
                    <div className="font-bold text-lg">{entry.id}</div>
                    <div
                      className={`text-sm flex items-center gap-1 ${
                        rank <= 3
                          ? "text-black opacity-75"
                          : "text-spotify-lightgray"
                      }`}
                    >
                      <Calendar size={14} />
                      {formatDate(entry.created_at)}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-2xl font-bold">{entry.score}</div>
                    <div
                      className={`text-sm ${
                        rank <= 3
                          ? "text-black opacity-75"
                          : "text-spotify-lightgray"
                      }`}
                    >
                      points
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="ml-4 w-24">
                    <div
                      className={`h-2 rounded-full ${
                        rank <= 3 ? "bg-black bg-opacity-25" : "bg-gray-600"
                      }`}
                    >
                      <div
                        className={`h-full rounded-full ${
                          rank === 1
                            ? "bg-white"
                            : rank === 2
                            ? "bg-black"
                            : rank === 3
                            ? "bg-white"
                            : "bg-spotify-green"
                        }`}
                        style={{
                          width: `${
                            stats ? (entry.score / stats.maxScore) * 100 : 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Call to Action */}
        {leaderboard.length > 0 && (
          <div className="mt-8 text-center">
            <div className="bg-spotify-darkgray p-6 rounded-lg">
              <h3 className="text-xl font-bold mb-3">
                Think you can beat the leaderboard?
              </h3>
              <p className="text-spotify-lightgray mb-4">
                Test your music knowledge and see if you can climb to the top!
              </p>
              <button
                onClick={() => (window.location.href = "/gotify")}
                className="bg-spotify-green text-black font-bold py-3 px-8 rounded-full hover:scale-105 transition-transform"
              >
                Play Gotify
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
