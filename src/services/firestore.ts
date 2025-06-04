import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface FirestoreLeaderboardEntry {
  id?: string;
  player_name: string;
  score: number;
  game_type: "gotify" | "spotimatch";
  difficulty: string;
  streak: number;
  turns_completed: number;
  accuracy?: number;
  created_at: Timestamp | string;
}

export const firestoreApi = {
  // Save a new score to Firestore
  saveScore: async (
    playerName: string,
    score: number,
    gameType: "gotify" | "spotimatch" = "gotify",
    metadata?: {
      difficulty?: string;
      streak?: number;
      turns_completed?: number;
      accuracy?: number;
    }
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const newScore: Omit<FirestoreLeaderboardEntry, "id"> = {
        player_name: playerName,
        score,
        game_type: gameType,
        difficulty: metadata?.difficulty || "medium",
        streak: metadata?.streak || 0,
        turns_completed: metadata?.turns_completed || 0,
        accuracy: metadata?.accuracy || 0,
        created_at: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, "leaderboard"), newScore);

      console.log("Score saved to Firestore with ID:", docRef.id);
      return { success: true, message: "Score saved successfully!" };
    } catch (error) {
      console.error("Error saving score to Firestore:", error);
      return { success: false, message: "Failed to save score" };
    }
  },

  // Get leaderboard from Firestore
  getLeaderboard: async (
    gameType?: "gotify" | "spotimatch",
    difficulty?: string,
    limitCount: number = 50
  ): Promise<{
    leaderboard: FirestoreLeaderboardEntry[];
    Items: FirestoreLeaderboardEntry[];
    Count: number;
  }> => {
    try {
      const leaderboardRef = collection(db, "leaderboard");
      let q = query(leaderboardRef);

      // Filter by game type if specified
      if (gameType) {
        q = query(q, where("game_type", "==", gameType));
      }

      // Filter by difficulty if specified
      if (difficulty) {
        q = query(q, where("difficulty", "==", difficulty));
      }

      // Order by score descending, then by streak descending
      q = query(q, orderBy("score", "desc"), orderBy("streak", "desc"));

      // Limit results
      q = query(q, limit(limitCount));

      const querySnapshot = await getDocs(q);
      const leaderboard: FirestoreLeaderboardEntry[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<FirestoreLeaderboardEntry, "id">;
        leaderboard.push({
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to ISO string for consistency
          created_at:
            data.created_at instanceof Timestamp
              ? data.created_at.toDate().toISOString()
              : data.created_at,
        });
      });

      console.log(`Fetched ${leaderboard.length} scores from Firestore`);

      return {
        leaderboard,
        Items: leaderboard,
        Count: leaderboard.length,
      };
    } catch (error) {
      console.error("Error fetching leaderboard from Firestore:", error);
      return { leaderboard: [], Items: [], Count: 0 };
    }
  },

  // Get user's personal stats from Firestore
  getUserStats: async (
    playerName: string,
    gameType?: "gotify" | "spotimatch"
  ): Promise<{
    bestScore: number;
    bestStreak: number;
    totalGames: number;
    averageScore: number;
  }> => {
    try {
      const leaderboardRef = collection(db, "leaderboard");
      let q = query(leaderboardRef, where("player_name", "==", playerName));

      if (gameType) {
        q = query(q, where("game_type", "==", gameType));
      }

      const querySnapshot = await getDocs(q);
      const userScores: FirestoreLeaderboardEntry[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<FirestoreLeaderboardEntry, "id">;
        userScores.push({
          id: doc.id,
          ...data,
        });
      });

      if (userScores.length === 0) {
        return { bestScore: 0, bestStreak: 0, totalGames: 0, averageScore: 0 };
      }

      const bestScore = Math.max(...userScores.map((s) => s.score));
      const bestStreak = Math.max(...userScores.map((s) => s.streak || 0));
      const totalGames = userScores.length;
      const averageScore = Math.round(
        userScores.reduce((sum, s) => sum + s.score, 0) / totalGames
      );

      return {
        bestScore,
        bestStreak,
        totalGames,
        averageScore,
      };
    } catch (error) {
      console.error("Error fetching user stats from Firestore:", error);
      return { bestScore: 0, bestStreak: 0, totalGames: 0, averageScore: 0 };
    }
  },
};
