import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  MatchState,
  PlayerId,
  LiveMatchSummary,
  RealtimeMatchData,
} from "../types";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Firestore Functions ---

// 1. Subscribe to Club Feed (Summaries Only)
export const subscribeToClubMatches = (
  topicId: string,
  callback: (matches: LiveMatchSummary[]) => void
) => {
  if (!topicId) return () => {};

  const colRef = collection(db, `clubs/${topicId}/active_matches`);
  const q = query(colRef, orderBy("last_updated", "desc"));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const matches: LiveMatchSummary[] = [];
    snapshot.forEach((doc) => {
      matches.push(doc.data() as LiveMatchSummary);
    });
    callback(matches);
  });

  return unsubscribe;
};

// 2. Subscribe to Specific Match Realtime Data (Points)
export const subscribeToMatchRealtime = (
  topicId: string,
  matchId: string,
  callback: (data: RealtimeMatchData) => void
) => {
  if (!topicId || !matchId) return () => {};

  const docRef = doc(
    db,
    `clubs/${topicId}/active_matches/${matchId}/realtime/score`
  );

  const unsubscribe = onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as RealtimeMatchData);
    }
  });

  return unsubscribe;
};

// 2.5 Subscribe to Specific Match Summary (Games/Sets)
export const subscribeToMatchSummary = (
  topicId: string,
  matchId: string,
  callback: (data: LiveMatchSummary) => void
) => {
  if (!topicId || !matchId) return () => {};

  const docRef = doc(db, `clubs/${topicId}/active_matches/${matchId}`);

  const unsubscribe = onSnapshot(docRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as LiveMatchSummary);
    }
  });

  return unsubscribe;
};

// 3. Sync Match Data (Split Write)
export const syncMatchToFirestore = async (
  topicId: string,
  matchId: string,
  state: MatchState,
  userId: string
) => {
  if (!topicId || !matchId || !userId) return;

  const timestamp = serverTimestamp();

  // Determine if we need to update the Summary (Low Frequency)
  // Logic: Update summary if it's the start, match over, or a game/set was just won.
  const lastEvent =
    state.history.length > 0 ? state.history[state.history.length - 1] : null;
  const shouldUpdateSummary =
    !lastEvent || // New match
    state.isMatchOver ||
    lastEvent.type === "GAME_WIN" ||
    lastEvent.type === "SET_WIN" ||
    lastEvent.type === "MATCH_WIN";

  // --- WRITE 1: Realtime Data (Always) ---
  const realtimeRef = doc(
    db,
    `clubs/${topicId}/active_matches/${matchId}/realtime/score`
  );
  const realtimeData: RealtimeMatchData = {
    current_points: state.points,
    is_tie_break: state.isTieBreak,
    history: state.history,
    last_updated: timestamp,
  };
  // Fire and forget realtime update
  setDoc(realtimeRef, realtimeData, { merge: true }).catch((e) =>
    console.error("RT Sync Error", e)
  );

  // --- WRITE 2: Summary Data (Conditional) ---
  if (shouldUpdateSummary) {
    // Format Score Summary (e.g. "6-4, 2-1")
    const setString = state.sets
      .slice(0, state.currentSetIndex)
      .map((s) => `${s[PlayerId.P1]}-${s[PlayerId.P2]}`)
      .join(", ");
    const currentGame = `${state.games[PlayerId.P1]}-${
      state.games[PlayerId.P2]
    }`;
    const fullSummary = setString
      ? `${setString}, ${currentGame}`
      : currentGame;

    const p1Disp =
      state.config.mode === "doubles"
        ? `${state.config.p1Name} & ${state.config.p1PartnerName}`
        : state.config.p1Name;
    const p2Disp =
      state.config.mode === "doubles"
        ? `${state.config.p2Name} & ${state.config.p2PartnerName}`
        : state.config.p2Name;

    const summaryRef = doc(db, `clubs/${topicId}/active_matches/${matchId}`);
    const summaryData: LiveMatchSummary = {
      id: matchId,
      p1_name: p1Disp,
      p2_name: p2Disp,
      score_summary: fullSummary,
      current_games: state.games,
      current_sets: state.sets,
      server: state.server,
      is_doubles: state.config.mode === "doubles",
      creator_uid: userId,
      last_updated: timestamp,
      match_duration: state.durationSeconds,
      startTime: state.startTime,
      isPaused: state.isPaused,
      status: state.isMatchOver ? "FINISHED" : "LIVE",
      expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), // TTL: 24 hours from last update
      config: state.config, // Save config so spectators can initialize local state if needed
    };

    setDoc(summaryRef, summaryData, { merge: true }).catch((e) =>
      console.error("Summary Sync Error", e)
    );
  }
};

export const endMatchInFirestore = async (topicId: string, matchId: string) => {
  if (!topicId || !matchId) return;
  const summaryRef = doc(db, `clubs/${topicId}/active_matches/${matchId}`);
  await setDoc(
    summaryRef,
    {
      status: "FINISHED",
      last_updated: serverTimestamp(),
    },
    { merge: true }
  );
};
