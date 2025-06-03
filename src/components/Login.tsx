import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Music, Headphones, Trophy, Gamepad2 } from "lucide-react";

export const Login: React.FC = () => {
  const { login, loading } = useAuth();

  const features = [
    {
      icon: <Headphones className="h-8 w-8" />,
      title: "Top Songs Analysis",
      description: "Discover your music listening patterns and top tracks",
    },
    {
      icon: <Gamepad2 className="h-8 w-8" />,
      title: "Spotimatch",
      description: "Find songs that match your music taste",
    },
    {
      icon: <Music className="h-8 w-8" />,
      title: "Gotify",
      description: "Guess the song game with your favorite artists",
    },
    {
      icon: <Trophy className="h-8 w-8" />,
      title: "Leaderboards",
      description: "Compete with others and track your scores",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-spotify-black via-spotify-dark to-spotify-gray flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Music className="h-16 w-16 text-spotify-green mr-4" />
            <h1 className="text-6xl font-bold text-white">Hubify</h1>
          </div>
          <p className="text-xl text-spotify-lightgray max-w-2xl mx-auto">
            Connect your Spotify account to discover your music patterns, play
            engaging games, and compete with friends in the ultimate music
            experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-spotify-gray rounded-lg p-6 text-center hover:bg-opacity-80 transition-all"
            >
              <div className="text-spotify-green mb-4 flex justify-center">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-spotify-lightgray text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={login}
            disabled={loading}
            className="bg-spotify-green hover:bg-green-600 text-black font-bold py-4 px-8 rounded-full text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Connect with Spotify"}
          </button>

          <div className="mt-6 text-sm text-spotify-lightgray">
            <p>By connecting, you agree to our terms and privacy policy.</p>
            <p className="mt-2">
              We only access your public profile, top tracks, and recently
              played music.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
