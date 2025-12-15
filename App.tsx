import React, { useState, useEffect } from "react";
import { DEFAULT_CONFIG } from "./constants";
import {
  MatchState,
  PlayerId,
  MatchConfig,
  LiveMatchSummary,
  RealtimeMatchData,
} from "./types";
import { initializeMatch, addPoint, undoPoint } from "./services/tennisLogic";
import ScoreControls from "./components/ScoreControls";
import MatchHistory from "./components/MatchHistory";
import SettingsModal from "./components/SettingsModal";
import AuthScreen from "./components/AuthScreen";
import {
  AlertTriangle,
  Trophy,
  Wifi,
  Search,
  ArrowRight,
  Activity,
  Plus,
  User,
  Users,
  History,
  Share2,
  Check,
  Eye,
  WifiOff,
  Trash2,
} from "lucide-react";
import {
  auth,
  subscribeToClubMatches,
  syncMatchToFirestore,
  subscribeToMatchRealtime,
  subscribeToMatchSummary,
  endMatchInFirestore,
  deleteMatchFromFirestore,
  fetchFullMatchState,
} from "./services/firebase";
import {
  onAuthStateChanged,
  signInAnonymously,
  User as FirebaseUser,
} from "firebase/auth";

const App: React.FC = () => {
  const [matchState, setMatchState] = useState<MatchState>(() =>
    initializeMatch(DEFAULT_CONFIG)
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);

  // --- STATE for Topic/Club & Navigation ---
  const [topic, setTopic] = useState<string>("");
  const [view, setView] = useState<
    "landing" | "dashboard" | "setup" | "match" | "spectate" | "auth"
  >("landing");

  // Spectator State
  const [spectatingMatch, setSpectatingMatch] =
    useState<LiveMatchSummary | null>(null);

  // --- AUTH EFFECT ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        setAuthUserId(user.uid);
      } else {
        signInAnonymously(auth).catch((err) =>
          console.error("Auth failed:", err)
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // --- TOPIC & URL EFFECT ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicParam = params.get("topic");
    if (topicParam) {
      setTopic(topicParam);
      // If we have state from localstorage, go to match, else dashboard
      if (matchState.durationSeconds > 0 || matchState.points.P1 !== "0") {
        setView("match");
      } else {
        setView("dashboard");
      }
    }
    console.log("App Mounted. View:", view);
  }, []);

  // --- SYNC EFFECT (SCORER) ---
  useEffect(() => {
    if (!authUserId || !topic || view !== "match" || topic === "offline")
      return;

    let currentMatchId = matchState.matchId;
    if (!currentMatchId) return;

    syncMatchToFirestore(topic, currentMatchId, matchState, authUserId);
  }, [
    matchState.history,
    matchState.isMatchOver,
    topic,
    authUserId,
    view,
    matchState.matchId,
  ]);

  // Timer Effect
  useEffect(() => {
    if (matchState.isMatchOver || view !== "match" || matchState.isPaused)
      return;
    const interval = setInterval(() => {
      setMatchState((prev) => {
        if (prev.isPaused) return prev;
        return {
          ...prev,
          durationSeconds: Math.floor(
            (Date.now() - (prev.startTime || Date.now())) / 1000
          ),
        };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [matchState.isMatchOver, matchState.startTime, view, matchState.isPaused]);

  // --- HANDLERS ---

  const handleTogglePause = () => {
    setMatchState((prev) => {
      const now = Date.now();
      if (prev.isPaused) {
        // Resuming: Adjust startTime so that (now - startTime) equals the duration we had when we paused.
        // duration = now - startTime  =>  startTime = now - duration
        // We use prev.durationSeconds as the accumulated duration.
        return {
          ...prev,
          isPaused: false,
          startTime: now - prev.durationSeconds * 1000,
        };
      } else {
        // Pausing
        return {
          ...prev,
          isPaused: true,
        };
      }
    });
  };

  const handleConnect = (inputTopic: string) => {
    if (!inputTopic.trim()) return;
    const t = inputTopic.toLowerCase().trim();
    setTopic(t);
    const newUrl = `${window.location.pathname}?topic=${t}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    try {
      const saved = localStorage.getItem("recent_clubs");
      let recents = saved ? JSON.parse(saved) : [];
      recents = [t, ...recents.filter((r: string) => r !== t)].slice(0, 3);
      localStorage.setItem("recent_clubs", JSON.stringify(recents));
    } catch (e) {}

    setView("dashboard");
  };

  const handleOffline = () => {
    setTopic("offline");
    setView("dashboard");
  };

  const handleStartSetup = () => {
    setView("setup");
  };

  const handleStartMatch = (config: MatchConfig) => {
    const newMatchId = `${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const newState = initializeMatch(config);
    newState.matchId = newMatchId;

    setMatchState(newState);
    setView("match");

    if (authUserId && topic && topic !== "offline") {
      syncMatchToFirestore(topic, newMatchId, newState, authUserId);
    }
  };

  const handleWatchMatch = async (match: LiveMatchSummary) => {
    // If user is the creator, try to resume the match
    if (authUserId && match.creator_uid === authUserId && topic !== "offline") {
      const fullState = await fetchFullMatchState(topic, match.id);
      if (fullState) {
        setMatchState(fullState);
        setView("match");
        return;
      }
    }
    // Otherwise, spectate
    setSpectatingMatch(match);
    setView("spectate");
  };

  const handlePoint = (winner: PlayerId) => {
    setMatchState((prev) => addPoint(prev, winner));
  };

  const handleUndo = () => {
    setMatchState((prev) => undoPoint(prev));
  };

  const handleUpdateSettings = (newConfig: MatchConfig) => {
    setMatchState((prev) => ({ ...prev, config: newConfig }));
  };

  const handleReset = async () => {
    if (matchState.matchId && topic && topic !== "offline") {
      await endMatchInFirestore(topic, matchState.matchId);
    }
    setMatchState(initializeMatch(matchState.config));
    setShowResetConfirm(false);
    setView("dashboard");
  };

  // --- RENDER ---

  if (view === "landing") {
    return (
      <LandingScreen
        onConnect={handleConnect}
        onOffline={handleOffline}
        onAuth={() => setView("auth")}
        user={currentUser}
      />
    );
  }

  if (view === "dashboard") {
    return (
      <ClubDashboard
        topic={topic}
        onStartMatch={handleStartSetup}
        onWatchMatch={handleWatchMatch}
        authUserId={authUserId}
        onAuth={() => setView("auth")}
        user={currentUser}
      />
    );
  }

  if (view === "auth") {
    return (
      <AuthScreen
        onBack={() => setView(topic ? "dashboard" : "landing")}
        user={currentUser}
      />
    );
  }

  if (view === "setup") {
    return (
      <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col">
        <button
          onClick={() => setView("dashboard")}
          className="p-4 text-slate-500 font-bold flex items-center gap-2"
        >
          &larr; Back to {topic}
        </button>
        <SetupScreen
          config={matchState.config}
          onStart={handleStartMatch}
          authUserId={authUserId}
          topic={topic}
        />
      </div>
    );
  }

  if (view === "spectate" && spectatingMatch) {
    return (
      <SpectatorScreen
        topic={topic}
        matchSummary={spectatingMatch}
        onBack={() => setView("dashboard")}
      />
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col overflow-hidden transition-colors duration-300 relative">
      <AppContent
        matchState={matchState}
        onPoint={handlePoint}
        onUndo={handleUndo}
        onSettings={() => setIsSettingsOpen(true)}
        onReset={() => setShowResetConfirm(true)}
        onToggleServer={(teamId) => {
          setMatchState((prev: MatchState) => {
            const newState = { ...prev };
            if (teamId === PlayerId.P1)
              newState.p1ServerIdx = 1 - (newState.p1ServerIdx || 0);
            else newState.p2ServerIdx = 1 - (newState.p2ServerIdx || 0);
            return newState;
          });
        }}
        onBack={() => setView("dashboard")}
        onTogglePause={handleTogglePause}
        authUserId={authUserId}
        topic={topic}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={matchState.config}
        onSave={handleUpdateSettings}
        onReset={handleReset}
      />

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle
                  className="text-yellow-600 dark:text-yellow-500"
                  size={24}
                />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                End Match?
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                This will end the match and return to the {topic.toUpperCase()}{" "}
                dashboard.
              </p>
              <div className="flex w-full gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-500/20 transition-colors"
                >
                  End Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- VIEW COMPONENTS ---

const LandingScreen = ({
  onConnect,
  onOffline,
  onAuth,
  user,
}: {
  onConnect: (t: string) => void;
  onOffline: () => void;
  onAuth: () => void;
  user: FirebaseUser | null;
}) => {
  const [val, setVal] = useState("");
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("recent_clubs");
      if (saved) setRecents(JSON.parse(saved));
    } catch (e) {}
  }, []);

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 pb-safe relative">
      <button
        onClick={onAuth}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        {user && !user.isAnonymous ? (
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {user.email?.charAt(0).toUpperCase()}
          </div>
        ) : (
          <User size={24} />
        )}
      </button>

      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/20 mb-6">
            <Activity className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            AceTrace Live
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Connect to your club to watch live scores or start a new match.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search
              className="absolute left-4 top-4 text-slate-400"
              size={20}
            />
            <input
              type="text"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && val.trim() && onConnect(val)
              }
              placeholder="Enter Club ID (e.g. btc)"
              className="w-full pl-12 pr-4 py-4 bg-transparent font-bold text-lg text-slate-900 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <button
            onClick={() => onConnect(val)}
            disabled={!val.trim()}
            className="w-full py-4 bg-slate-900 dark:bg-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-slate-900 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-2"
          >
            Go to Club <ArrowRight size={20} />
          </button>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">
              Or
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <button
            onClick={onOffline}
            className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <WifiOff size={20} /> Play Offline
          </button>
        </div>

        {recents.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
              <History size={12} /> Recent Clubs
            </div>
            <div className="grid grid-cols-2 gap-2">
              {recents.map((r) => (
                <button
                  key={r}
                  onClick={() => onConnect(r)}
                  className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left font-bold text-slate-700 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm flex items-center justify-between group"
                >
                  <span className="truncate uppercase">{r}</span>
                  <ArrowRight
                    size={14}
                    className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// DASHBOARD: Optimized to only use Summary Data (Bandwidth Saver)
const ClubDashboard = ({
  topic,
  onStartMatch,
  onWatchMatch,
  authUserId,
  onAuth,
  user,
}: {
  topic: string;
  onStartMatch: () => void;
  onWatchMatch: (m: LiveMatchSummary) => void;
  authUserId: string | null;
  onAuth: () => void;
  user: FirebaseUser | null;
}) => {
  const [matches, setMatches] = useState<LiveMatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isOffline = topic === "offline";

  useEffect(() => {
    if (isOffline) {
      setLoading(false);
      return;
    }
    const unsub = subscribeToClubMatches(topic, (data) => {
      setMatches(data);
      setLoading(false);
    });
    return () => unsub();
  }, [topic, isOffline]);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col pb-safe">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
                {isOffline ? "Offline Mode" : topic}
              </h1>
              {!isOffline && (
                <button
                  onClick={handleShare}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors relative"
                >
                  {copied ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <Share2 size={16} />
                  )}
                </button>
              )}
            </div>
            {!isOffline ? (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>{" "}
                LIVE FEED
              </p>
            ) : (
              <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                <WifiOff size={12} /> No internet connection required
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAuth}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
            >
              {user && !user.isAnonymous ? (
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              ) : (
                <User size={20} />
              )}
            </button>
            <button
              onClick={onStartMatch}
              className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold shadow-md flex items-center gap-2 text-sm active:scale-[0.96] transition-transform"
            >
              <Plus size={16} /> New Match
            </button>
          </div>
        </div>
      </div>

      {/* Match List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
              <Trophy size={32} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-slate-900 dark:text-white font-bold text-lg">
                {isOffline ? "Ready to Play" : "No active matches"}
              </p>
              <p className="text-sm text-slate-500">
                {isOffline ? (
                  "Start a match to keep score locally."
                ) : (
                  <span>
                    Matches played at{" "}
                    <span className="uppercase font-bold">{topic}</span> will
                    appear here.
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onStartMatch}
              className="text-blue-500 font-bold text-sm hover:underline"
            >
              {isOffline ? "Start Match" : "Start the first match"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {matches.map((m) => (
              <div
                key={m.id}
                onClick={() => onWatchMatch(m)}
                className="bg-white dark:bg-slate-900 rounded-xl p-3 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer flex flex-col justify-between min-h-[120px]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {m.status === "LIVE" && (
                      <div className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Eye size={8} /> LIVE
                      </div>
                    )}
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {m.is_doubles ? "Doubles" : "Singles"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {formatTime(m.match_duration || 0)}
                    </div>
                    {authUserId && m.creator_uid === authUserId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Are you sure you want to delete this match?"
                            )
                          ) {
                            deleteMatchFromFirestore(topic, m.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        title="Delete Match"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  {/* Players */}
                  <div className="flex-1 space-y-1.5">
                    <div className="font-bold text-base text-slate-800 dark:text-white truncate flex items-center gap-2">
                      <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                      <span className="truncate">{m.p1_name}</span>
                      {m.status === "LIVE" && m.server === PlayerId.P1 && (
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-70 flex-shrink-0"></div>
                      )}
                    </div>
                    <div className="font-bold text-base text-slate-800 dark:text-white truncate flex items-center gap-2">
                      <span className="w-1 h-3 bg-red-500 rounded-full"></span>
                      <span className="truncate">{m.p2_name}</span>
                      {m.status === "LIVE" && m.server === PlayerId.P2 && (
                        <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-70 flex-shrink-0"></div>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-xl font-mono font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      {m.score_summary || "0-0"}
                    </div>
                  </div>
                </div>

                {m.creator_uid === authUserId && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <div className="text-[9px] text-blue-500 font-bold flex items-center gap-1">
                      <User size={10} /> YOUR MATCH
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// SPECTATOR VIEW: Connects to Realtime Channel
const SpectatorScreen = ({
  topic,
  matchSummary: initialSummary,
  onBack,
}: {
  topic: string;
  matchSummary: LiveMatchSummary;
  onBack: () => void;
}) => {
  const [realtimeData, setRealtimeData] = useState<RealtimeMatchData | null>(
    null
  );
  const [liveSummary, setLiveSummary] =
    useState<LiveMatchSummary>(initialSummary);
  const [localDuration, setLocalDuration] = useState(
    initialSummary.match_duration || 0
  );

  useEffect(() => {
    const unsubRT = subscribeToMatchRealtime(
      topic,
      initialSummary.id,
      (data) => {
        setRealtimeData(data);
      }
    );
    const unsubSum = subscribeToMatchSummary(
      topic,
      initialSummary.id,
      (data) => {
        setLiveSummary(data);
      }
    );
    return () => {
      unsubRT();
      unsubSum();
    };
  }, [topic, initialSummary.id]);

  // Local Timer Effect for Spectator
  useEffect(() => {
    if (liveSummary.status === "FINISHED" || liveSummary.isPaused) {
      setLocalDuration(liveSummary.match_duration || 0);
      return;
    }

    const interval = setInterval(() => {
      if (liveSummary.startTime) {
        setLocalDuration(
          Math.floor((Date.now() - liveSummary.startTime) / 1000)
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    liveSummary.status,
    liveSummary.isPaused,
    liveSummary.startTime,
    liveSummary.match_duration,
  ]);

  // Construct a read-only MatchState for the ScoreControls component
  const spectatorState: MatchState = {
    config: liveSummary.config || DEFAULT_CONFIG,
    startTime: liveSummary.startTime || null,
    durationSeconds: localDuration,
    isMatchOver: liveSummary.status === "FINISHED",
    winner: undefined,
    currentSetIndex: Math.max(0, liveSummary.current_sets.length - 1),
    sets: liveSummary.current_sets,
    games: liveSummary.current_games,
    // Use realtime points if available, else default
    points: realtimeData?.current_points || {
      [PlayerId.P1]: "0",
      [PlayerId.P2]: "0",
    },
    isTieBreak: realtimeData?.is_tie_break || false,
    server: liveSummary.server,
    shouldSwitchSides: false, // Calculated locally or could be synced
    history: realtimeData?.history || [], // Use synced history
    isSecondServe: false,
    isPaused: liveSummary.isPaused || false,
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col">
      <button
        onClick={onBack}
        className="p-4 text-slate-500 font-bold flex items-center gap-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20"
      >
        &larr; Back to Dashboard
      </button>

      <div className="flex-1 flex flex-col pointer-events-none overflow-hidden">
        {/* Pointer events none makes it read-only mostly, but buttons might need disabling */}
        <div className="opacity-100 flex-1 flex flex-col">
          <ScoreControls
            state={spectatorState}
            onPoint={() => {}}
            onUndo={() => {}}
            onSettings={() => {}}
            onReset={() => {}}
            authUserId={null} // Read only
          />

          {/* Match History Timeline */}
          <div className="flex-shrink-0 pointer-events-auto">
            <MatchHistory
              history={spectatorState.history}
              config={spectatorState.config}
              p1Color={spectatorState.config.p1Color}
              p2Color={spectatorState.config.p2Color}
            />
          </div>
        </div>
      </div>

      {!realtimeData && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            <Activity className="animate-spin" size={16} /> Connecting to Live
            Stream...
          </div>
        </div>
      )}
    </div>
  );
};

// Internal wrapper to handle View State (Setup vs Match)
const AppContent = (props: any) => {
  const { matchState, topic } = props;

  return (
    <>
      <ScoreControls
        state={matchState}
        onPoint={props.onPoint}
        onUndo={props.onUndo}
        onSettings={props.onSettings}
        onReset={props.onReset}
        onToggleServer={props.onToggleServer}
        onBack={props.onBack}
        onTogglePause={props.onTogglePause}
        authUserId={props.authUserId}
      />

      <div className="flex-shrink-0">
        <MatchHistory
          history={matchState.history}
          config={matchState.config}
          p1Color={matchState.config.p1Color}
          p2Color={matchState.config.p2Color}
        />
      </div>
    </>
  );
};

// Inline Setup Screen for simplicity in this file
const SetupScreen = ({ config, onStart, authUserId, topic }: any) => {
  const [formData, setFormData] = useState(config);

  const colorOptions = ["blue", "red", "green", "orange", "purple", "pink"];
  const colorMap: any = {
    blue: "bg-blue-600",
    red: "bg-red-600",
    green: "bg-emerald-600",
    orange: "bg-orange-600",
    purple: "bg-purple-600",
    pink: "bg-pink-600",
  };

  const handleChange = (key: string, value: any) =>
    setFormData((p: any) => ({ ...p, [key]: value }));

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 p-6 overflow-y-auto pb-safe flex flex-col items-center">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-900 dark:bg-white rounded-2xl shadow-xl mb-4 relative">
            <Trophy size={32} className="text-white dark:text-slate-900" />
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white dark:border-slate-900">
              <Wifi size={10} />
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            New Match
          </h1>
          <p className="text-slate-500">
            {topic === "offline" ? (
              "Offline Mode (No Streaming)"
            ) : (
              <span>
                Streaming to:{" "}
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">
                  {topic}
                </span>
              </span>
            )}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
          {/* Mode */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => handleChange("mode", "singles")}
              className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 ${
                formData.mode === "singles"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              <User size={16} /> Singles
            </button>
            <button
              onClick={() => handleChange("mode", "doubles")}
              className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 ${
                formData.mode === "doubles"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                  : "text-slate-500"
              }`}
            >
              <Users size={16} /> Doubles
            </button>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Player 1"
              value={formData.p1Name}
              onChange={(e) => handleChange("p1Name", e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white"
            />
            {formData.mode === "doubles" && (
              <input
                type="text"
                placeholder="P1 Partner"
                value={formData.p1PartnerName}
                onChange={(e) => handleChange("p1PartnerName", e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white"
              />
            )}

            <div className="flex gap-2 justify-center">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChange("p1Color", c)}
                  className={`w-6 h-6 rounded-full ${colorMap[c]} ${
                    formData.p1Color === c
                      ? "ring-2 ring-offset-2 ring-slate-400"
                      : "opacity-50"
                  }`}
                />
              ))}
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <input
              type="text"
              placeholder="Player 2"
              value={formData.p2Name}
              onChange={(e) => handleChange("p2Name", e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white"
            />
            {formData.mode === "doubles" && (
              <input
                type="text"
                placeholder="P2 Partner"
                value={formData.p2PartnerName}
                onChange={(e) => handleChange("p2PartnerName", e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white"
              />
            )}

            <div className="flex gap-2 justify-center">
              {colorOptions.map((c) => (
                <button
                  key={c}
                  onClick={() => handleChange("p2Color", c)}
                  className={`w-6 h-6 rounded-full ${colorMap[c]} ${
                    formData.p2Color === c
                      ? "ring-2 ring-offset-2 ring-slate-400"
                      : "opacity-50"
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => onStart(formData)}
            className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform"
          >
            START MATCH
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
