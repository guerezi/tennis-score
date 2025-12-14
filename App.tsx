
import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_CONFIG } from './constants';
import { MatchState, PlayerId, MatchConfig, LiveMatchSummary, RealtimeMatchData } from './types';
import { initializeMatch, addPoint, undoPoint } from './services/tennisLogic';
import ScoreControls from './components/ScoreControls';
import MatchHistory from './components/MatchHistory';
import SettingsModal from './components/SettingsModal';
import { AlertTriangle, Trophy, Wifi, Search, ArrowRight, Activity, Plus, User, Users, History, Share2, Check, Eye } from 'lucide-react';
import { auth, subscribeToClubMatches, syncMatchToFirestore, subscribeToMatchRealtime } from './services/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const App: React.FC = () => {
  const [matchState, setMatchState] = useState<MatchState>(() => initializeMatch(DEFAULT_CONFIG));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  
  // --- STATE for Topic/Club & Navigation ---
  const [topic, setTopic] = useState<string>("");
  const [view, setView] = useState<'landing' | 'dashboard' | 'setup' | 'match' | 'spectate'>('landing');
  
  // Spectator State
  const [spectatingMatch, setSpectatingMatch] = useState<LiveMatchSummary | null>(null);

  // --- AUTH EFFECT ---
  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
          if (user) {
              setAuthUserId(user.uid);
          } else {
              signInAnonymously(auth).catch(err => console.error("Auth failed:", err));
          }
      });
      return () => unsubscribe();
  }, []);

  // --- TOPIC & URL EFFECT ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topicParam = params.get('topic');
    if (topicParam) {
      setTopic(topicParam);
      // If we have state from localstorage, go to match, else dashboard
      if (matchState.durationSeconds > 0 || matchState.points.P1 !== '0') {
          setView('match');
      } else {
          setView('dashboard');
      }
    }
    console.log("App Mounted. View:", view);
  }, []);

  // --- SYNC EFFECT (SCORER) ---
  useEffect(() => {
    if (!authUserId || !topic || view !== 'match') return;
    
    let currentMatchId = matchState.matchId;
    if (!currentMatchId) return; 

    syncMatchToFirestore(topic, currentMatchId, matchState, authUserId);
  }, [matchState.history, matchState.isMatchOver, topic, authUserId, view, matchState.matchId]);


  // Timer Effect
  useEffect(() => {
    if (matchState.isMatchOver || view !== 'match') return;
    const interval = setInterval(() => {
      setMatchState(prev => ({
        ...prev,
        durationSeconds: Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000)
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [matchState.isMatchOver, matchState.startTime, view]);


  // --- HANDLERS ---

  const handleConnect = (inputTopic: string) => {
      if (!inputTopic.trim()) return;
      const t = inputTopic.toLowerCase().trim();
      setTopic(t);
      const newUrl = `${window.location.pathname}?topic=${t}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      
      try {
        const saved = localStorage.getItem('recent_clubs');
        let recents = saved ? JSON.parse(saved) : [];
        recents = [t, ...recents.filter((r: string) => r !== t)].slice(0, 3);
        localStorage.setItem('recent_clubs', JSON.stringify(recents));
      } catch (e) {}

      setView('dashboard');
  };

  const handleStartSetup = () => {
     setView('setup');
  };

  const handleStartMatch = (config: MatchConfig) => {
    const newMatchId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newState = initializeMatch(config);
    newState.matchId = newMatchId; 
    
    setMatchState(newState);
    setView('match');
    
    if (authUserId && topic) {
        syncMatchToFirestore(topic, newMatchId, newState, authUserId);
    }
  };

  const handleWatchMatch = (match: LiveMatchSummary) => {
      setSpectatingMatch(match);
      setView('spectate');
  };

  const handlePoint = (winner: PlayerId) => {
    setMatchState(prev => addPoint(prev, winner));
  };

  const handleUndo = () => {
    setMatchState(prev => undoPoint(prev));
  };

  const handleUpdateSettings = (newConfig: MatchConfig) => {
    setMatchState(prev => ({ ...prev, config: newConfig }));
  };
  
  const handleReset = () => {
    setMatchState(initializeMatch(matchState.config));
    setShowResetConfirm(false);
    setView('dashboard'); 
  };

  // --- RENDER ---

  if (view === 'landing') {
      return <LandingScreen onConnect={handleConnect} />;
  }

  if (view === 'dashboard') {
      return <ClubDashboard topic={topic} onStartMatch={handleStartSetup} onWatchMatch={handleWatchMatch} authUserId={authUserId} />;
  }

  if (view === 'setup') {
      return (
        <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col">
           <button onClick={() => setView('dashboard')} className="p-4 text-slate-500 font-bold flex items-center gap-2">
               &larr; Back to {topic}
           </button>
           <SetupScreen config={matchState.config} onStart={handleStartMatch} authUserId={authUserId} topic={topic} />
        </div>
      );
  }

  if (view === 'spectate' && spectatingMatch) {
      return (
          <SpectatorScreen 
            topic={topic} 
            matchSummary={spectatingMatch} 
            onBack={() => setView('dashboard')} 
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
                    if (teamId === PlayerId.P1) newState.p1ServerIdx = 1 - (newState.p1ServerIdx || 0);
                    else newState.p2ServerIdx = 1 - (newState.p2ServerIdx || 0);
                    return newState;
                });
            }}
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
                            <AlertTriangle className="text-yellow-600 dark:text-yellow-500" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">End Match?</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            This will end the match and return to the {topic.toUpperCase()} dashboard.
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

const LandingScreen = ({ onConnect }: { onConnect: (t: string) => void }) => {
    const [val, setVal] = useState('');
    const [recents, setRecents] = useState<string[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('recent_clubs');
            if (saved) setRecents(JSON.parse(saved));
        } catch(e) {}
    }, []);

    return (
        <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 pb-safe">
            <div className="w-full max-w-sm space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-3xl shadow-xl shadow-blue-500/20 mb-6">
                        <Activity className="text-white" size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">AceTrace Live</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Connect to your club to watch live scores or start a new match.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800">
                    <div className="relative">
                        <Search className="absolute left-4 top-4 text-slate-400" size={20} />
                        <input 
                            type="text" 
                            value={val}
                            onChange={e => setVal(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && val.trim() && onConnect(val)}
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
                </div>

                {recents.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                            <History size={12} /> Recent Clubs
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {recents.map(r => (
                                <button
                                    key={r}
                                    onClick={() => onConnect(r)}
                                    className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-left font-bold text-slate-700 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-500 transition-colors shadow-sm flex items-center justify-between group"
                                >
                                    <span className="truncate uppercase">{r}</span>
                                    <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
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
const ClubDashboard = ({ topic, onStartMatch, onWatchMatch, authUserId }: { topic: string, onStartMatch: () => void, onWatchMatch: (m: LiveMatchSummary) => void, authUserId: string | null }) => {
    const [matches, setMatches] = useState<LiveMatchSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const unsub = subscribeToClubMatches(topic, (data) => {
            setMatches(data);
            setLoading(false);
        });
        return () => unsub();
    }, [topic]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col pb-safe">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="px-4 py-4 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{topic}</h1>
                            <button onClick={handleShare} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors relative">
                                {copied ? <Check size={16} className="text-green-500" /> : <Share2 size={16} />}
                            </button>
                        </div>
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1 mt-1">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> LIVE FEED
                        </p>
                    </div>
                    <button 
                        onClick={onStartMatch}
                        className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-bold shadow-md flex items-center gap-2 text-sm active:scale-[0.96] transition-transform"
                    >
                        <Plus size={16} /> New Match
                    </button>
                </div>
            </div>

            {/* Match List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400"></div></div>
                ) : matches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
                        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <Trophy size={32} className="text-slate-400" />
                        </div>
                        <div className="text-center">
                            <p className="text-slate-900 dark:text-white font-bold text-lg">No active matches</p>
                            <p className="text-sm text-slate-500">Matches played at <span className="uppercase font-bold">{topic}</span> will appear here.</p>
                        </div>
                        <button onClick={onStartMatch} className="text-blue-500 font-bold text-sm hover:underline">Start the first match</button>
                    </div>
                ) : (
                    matches.map(m => (
                        <div 
                            key={m.id} 
                            onClick={() => onWatchMatch(m)}
                            className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
                        >
                            {m.status === 'LIVE' && (
                                <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-bl-lg flex items-center gap-1">
                                    <Eye size={8} /> LIVE
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{m.is_doubles ? 'Doubles' : 'Singles'}</div>
                                {m.creator_uid === authUserId && <div className="text-[10px] text-blue-500 font-bold flex items-center gap-1"><User size={10}/> YOUR MATCH</div>}
                            </div>
                            
                            <div className="flex justify-between items-center">
                                {/* Players & Server Indicator (from Summary) */}
                                <div className="flex-1 space-y-2">
                                    <div className="font-bold text-lg text-slate-800 dark:text-white truncate flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        {m.p1_name}
                                        {/* Server dot here comes from Summary, so it updates per Game, not per Point. This is the trade-off. */}
                                        {m.status === 'LIVE' && m.server === PlayerId.P1 && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-70"></div>}
                                    </div>
                                    <div className="font-bold text-lg text-slate-800 dark:text-white truncate flex items-center gap-2">
                                        <span className="w-1 h-4 bg-red-500 rounded-full"></span>
                                        {m.p2_name}
                                        {m.status === 'LIVE' && m.server === PlayerId.P2 && <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-70"></div>}
                                    </div>
                                </div>

                                {/* Scoreboard: Sets Only (Optimization) */}
                                <div className="text-right pl-4 flex items-center gap-4">
                                    <div className="flex flex-col items-end">
                                        <div className="text-xl font-mono font-bold text-slate-900 dark:text-white tracking-tighter">
                                            {m.score_summary || "0-0"}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">Sets / Games</div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-2 text-[10px] text-center text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Tap to watch live points
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

// SPECTATOR VIEW: Connects to Realtime Channel
const SpectatorScreen = ({ topic, matchSummary, onBack }: { topic: string, matchSummary: LiveMatchSummary, onBack: () => void }) => {
    const [realtimeData, setRealtimeData] = useState<RealtimeMatchData | null>(null);

    useEffect(() => {
        const unsub = subscribeToMatchRealtime(topic, matchSummary.id, (data) => {
            setRealtimeData(data);
        });
        return () => unsub();
    }, [topic, matchSummary.id]);

    // Construct a read-only MatchState for the ScoreControls component
    const spectatorState: MatchState = {
        config: matchSummary.config || DEFAULT_CONFIG,
        startTime: null,
        durationSeconds: 0,
        isMatchOver: matchSummary.status === 'FINISHED',
        winner: undefined,
        currentSetIndex: matchSummary.current_sets.length,
        sets: matchSummary.current_sets,
        games: matchSummary.current_games,
        // Use realtime points if available, else default
        points: realtimeData?.current_points || { [PlayerId.P1]: "0", [PlayerId.P2]: "0" },
        isTieBreak: realtimeData?.is_tie_break || false,
        server: matchSummary.server,
        shouldSwitchSides: false, // Calculated locally or could be synced
        history: [], // Not needed for spectator
        isSecondServe: false
    };

    return (
        <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col">
            <button onClick={onBack} className="p-4 text-slate-500 font-bold flex items-center gap-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
               &larr; Back to Dashboard
            </button>
            
            <div className="flex-1 flex flex-col pointer-events-none"> 
                {/* Pointer events none makes it read-only mostly, but buttons might need disabling */}
                <div className="opacity-100">
                    <ScoreControls 
                        state={spectatorState} 
                        onPoint={() => {}} 
                        onUndo={() => {}} 
                        onSettings={() => {}} 
                        onReset={() => {}} 
                        authUserId={null} // Read only
                    />
                </div>
            </div>
            
            {!realtimeData && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                    <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
                        <Activity className="animate-spin" size={16} /> Connecting to Live Stream...
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
            {/* Header Info */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 text-center flex justify-center items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-white uppercase">{topic}</span>
                <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
                <span>TIME: {Math.floor(matchState.durationSeconds / 60)}:{(matchState.durationSeconds % 60).toString().padStart(2, '0')}</span>
            </div>

            <ScoreControls 
                state={matchState} 
                onPoint={props.onPoint} 
                onUndo={props.onUndo} 
                onSettings={props.onSettings}
                onReset={props.onReset}
                onToggleServer={props.onToggleServer}
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
}

// Inline Setup Screen for simplicity in this file
const SetupScreen = ({ config, onStart, authUserId, topic }: any) => {
    const [formData, setFormData] = useState(config);
    
    const colorOptions = ['blue', 'red', 'green', 'orange', 'purple', 'pink'];
    const colorMap: any = {
        blue: 'bg-blue-600', red: 'bg-red-600', green: 'bg-emerald-600', 
        orange: 'bg-orange-600', purple: 'bg-purple-600', pink: 'bg-pink-600'
    };

    const handleChange = (key: string, value: any) => setFormData((p:any) => ({ ...p, [key]: value }));

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
                     <h1 className="text-3xl font-black text-slate-900 dark:text-white">New Match</h1>
                     <p className="text-slate-500">Streaming to: <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{topic}</span></p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
                     {/* Mode */}
                     <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button onClick={() => handleChange('mode', 'singles')} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 ${formData.mode === 'singles' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}><User size={16}/> Singles</button>
                        <button onClick={() => handleChange('mode', 'doubles')} className={`flex-1 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 ${formData.mode === 'doubles' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500'}`}><Users size={16}/> Doubles</button>
                     </div>

                     {/* Inputs */}
                     <div className="space-y-4">
                        <input type="text" placeholder="Player 1" value={formData.p1Name} onChange={e => handleChange('p1Name', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white" />
                        {formData.mode === 'doubles' && <input type="text" placeholder="P1 Partner" value={formData.p1PartnerName} onChange={e => handleChange('p1PartnerName', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white" />}
                        
                        <div className="flex gap-2 justify-center">
                            {colorOptions.map(c => (
                                <button key={c} onClick={() => handleChange('p1Color', c)} className={`w-6 h-6 rounded-full ${colorMap[c]} ${formData.p1Color === c ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-50'}`} />
                            ))}
                        </div>

                        <div className="h-px bg-slate-100 dark:bg-slate-800" />

                        <input type="text" placeholder="Player 2" value={formData.p2Name} onChange={e => handleChange('p2Name', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white" />
                        {formData.mode === 'doubles' && <input type="text" placeholder="P2 Partner" value={formData.p2PartnerName} onChange={e => handleChange('p2PartnerName', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-bold dark:text-white" />}
                        
                        <div className="flex gap-2 justify-center">
                            {colorOptions.map(c => (
                                <button key={c} onClick={() => handleChange('p2Color', c)} className={`w-6 h-6 rounded-full ${colorMap[c]} ${formData.p2Color === c ? 'ring-2 ring-offset-2 ring-slate-400' : 'opacity-50'}`} />
                            ))}
                        </div>
                     </div>

                     <button onClick={() => onStart(formData)} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform">START MATCH</button>
                </div>
            </div>
        </div>
    );
};

export default App;
