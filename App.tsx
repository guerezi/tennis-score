import React, { useState, useEffect } from 'react';
import { DEFAULT_CONFIG } from './constants';
import { MatchState, PlayerId, MatchConfig } from './types';
import { initializeMatch, addPoint, undoPoint } from './services/tennisLogic';
import ScoreControls from './components/ScoreControls';
import MatchHistory from './components/MatchHistory';
import SettingsModal from './components/SettingsModal';
import { AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [matchState, setMatchState] = useState<MatchState>(() => initializeMatch(DEFAULT_CONFIG));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Timer Effect
  useEffect(() => {
    if (matchState.isMatchOver) return;
    
    const interval = setInterval(() => {
      setMatchState(prev => ({
        ...prev,
        durationSeconds: Math.floor((Date.now() - (prev.startTime || Date.now())) / 1000)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [matchState.isMatchOver, matchState.startTime]);

  const handlePoint = (winner: PlayerId) => {
    setMatchState(prev => addPoint(prev, winner));
  };

  const handleUndo = () => {
    setMatchState(prev => undoPoint(prev));
  };

  const handleUpdateSettings = (newConfig: MatchConfig) => {
    setMatchState(prev => ({
      ...prev,
      config: newConfig
    }));
  };
  
  const handleReset = () => {
    setMatchState(initializeMatch(matchState.config));
    setShowResetConfirm(false);
  };

  // Format Duration
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col overflow-hidden transition-colors duration-300 relative">
      
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 text-center flex justify-center items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
         <span>TIME: {formatTime(matchState.durationSeconds)}</span>
         <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
         <span>{matchState.config.useAdvantage ? 'ADVANTAGE' : 'NO-AD'}</span>
         <span className="w-1 h-1 bg-slate-400 dark:bg-slate-600 rounded-full"></span>
         <span>BEST OF {matchState.config.setsToWin === 1 ? '1' : matchState.config.setsToWin === 2 ? '3' : '5'}</span>
      </div>

      {/* Main Controls */}
      <ScoreControls 
        state={matchState} 
        onPoint={handlePoint} 
        onUndo={handleUndo} 
        onSettings={() => setIsSettingsOpen(true)}
        onReset={() => setShowResetConfirm(true)}
      />

      {/* History Visualization (Bottom) */}
      <div className="flex-shrink-0">
         <MatchHistory 
            history={matchState.history} 
            config={matchState.config}
            p1Color="blue"
            p2Color="red"
         />
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={matchState.config}
        onSave={handleUpdateSettings}
        onReset={handleReset}
      />

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-sm w-full border border-slate-200 dark:border-slate-800 scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center text-center">
                 <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="text-yellow-600 dark:text-yellow-500" size={24} />
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Reset Match?</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                    This will clear all scores and history. You cannot undo this action.
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
                      Reset
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;