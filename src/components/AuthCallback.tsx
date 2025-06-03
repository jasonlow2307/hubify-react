import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        console.error("Spotify auth error:", error);
        navigate("/login");
        return;
      }

      if (code) {
        try {
          await handleCallback(code);
          navigate("/dashboard");
        } catch (error) {
          console.error("Callback processing error:", error);
          navigate("/login");
        }
      } else {
        navigate("/login");
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div className="min-h-screen bg-spotify-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spotify-green mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Connecting to Spotify
        </h2>
        <p className="text-spotify-lightgray">
          Please wait while we set up your account...
        </p>
      </div>
    </div>
  );
};
