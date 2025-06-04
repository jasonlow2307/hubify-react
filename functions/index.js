// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const cors = require("cors")({ origin: true });
const axios = require("axios");

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  timeoutSeconds: 60,
  memory: "256MiB",
  region: "us-central1",
});

exports.getPreviewUrl = onRequest(
  {
    cors: true, // Enable CORS
    invoker: "public", // Allow unauthenticated access
  },
  async (req, res) => {
    return cors(req, res, async () => {
    try {
      // Only allow GET requests
      if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { artist, title } = req.query;

      if (!artist || !title) {
        return res.status(400).json({
          error: "Both artist and title parameters are required",
        });
      }

      console.log(`Searching for: ${artist} - ${title}`);

      // Clean and prepare queries
      const cleanArtist = artist.trim();
      const cleanTitle = title.trim();

      const queries = [`${cleanArtist} ${cleanTitle}`, cleanTitle, cleanArtist];

      // Try each query until we find a preview
      for (const query of queries) {
        try {
          console.log(`Trying query: ${query}`);

          const response = await axios.get("https://api.deezer.com/search", {
            params: { q: query },
            timeout: 5000, // 5 second timeout
          });

          if (response.data.data && response.data.data.length > 0) {
            const trackWithPreview = response.data.data.find(
              (track) => track.preview && track.readable
            );

            if (trackWithPreview) {
              console.log(
                `✅ Found preview for: ${cleanTitle} by ${cleanArtist}`
              );
              return res.json({
                preview_url: trackWithPreview.preview,
                source: "deezer",
                query_used: query,
              });
            }
          }
        } catch (queryError) {
          console.warn(`Query "${query}" failed:`, queryError.message);
          continue;
        }
      }

      // No preview found
      console.log(`❌ No preview found for: ${cleanTitle} by ${cleanArtist}`);
      return res.json({ preview_url: null });
    } catch (error) {
      console.error("Function error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  });
});

// Batch function for multiple tracks (more efficient)
exports.getBatchPreviewUrls = onRequest(
  {
    cors: true, // Enable CORS
    invoker: "public", // Allow unauthenticated access
  },
  async (req, res) => {
    return cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { tracks } = req.body;

      if (!tracks || !Array.isArray(tracks)) {
        return res.status(400).json({
          error: "tracks array is required in request body",
        });
      }

      if (tracks.length > 10) {
        return res.status(400).json({
          error: "Maximum 10 tracks per batch request",
        });
      }

      const results = [];

      // Process tracks with small delays to avoid rate limits
      for (let i = 0; i < tracks.length; i++) {
        const { artist, title } = tracks[i];

        if (!artist || !title) {
          results.push({
            preview_url: null,
            error: "Missing artist or title",
          });
          continue;
        }

        try {
          // Add small delay between requests
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }

          const queries = [`${artist.trim()} ${title.trim()}`, title.trim()];
          let found = false;

          for (const query of queries) {
            const response = await axios.get("https://api.deezer.com/search", {
              params: { q: query },
              timeout: 3000,
            });

            if (response.data.data && response.data.data.length > 0) {
              const trackWithPreview = response.data.data.find(
                (track) => track.preview && track.readable
              );

              if (trackWithPreview) {
                results.push({ preview_url: trackWithPreview.preview });
                found = true;
                break;
              }
            }
          }

          if (!found) {
            results.push({ preview_url: null });
          }
        } catch (error) {
          console.error(`Error processing track ${i}:`, error.message);
          results.push({ preview_url: null, error: error.message });
        }
      }

      return res.json({ results });
    } catch (error) {
      console.error("Batch function error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: error.message,
      });
    }
  });
});

// Keep-warm function to reduce cold starts
exports.keepWarm = onRequest(
  {
    cors: true, // Enable CORS
    invoker: "public", // Allow unauthenticated access
  },
  async (req, res) => {
    console.log("Keep-warm ping received");
    res.json({ status: "warm", timestamp: new Date().toISOString() });
  }
);
