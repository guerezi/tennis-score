import React from 'react';
import { PlayerId, MatchState } from '../types';
import { Undo2, Settings, Trophy, RefreshCcw, RotateCcw } from 'lucide-react';

interface Props {
  state: MatchState;
  onPoint: (winner: PlayerId) => void;
  onUndo: () => void;
  onSettings: () => void;
  onReset: () => void;
}

const ScoreControls: React.FC<Props> = ({ state, onPoint, onUndo, onSettings, onReset }) => {
  const p1Name = state.config.p1Name;
  const p2Name = state.config.p2Name;

  // Formatting points for display
  const p1Point = state.points[PlayerId.P1];
  const p2Point = state.points[PlayerId.P2];

  // Side Switch Alert
  const showSwitch = state.shouldSwitchSides;

  // Calculate Service Side (Left/Right)
  const getServeSide = () => {
    if (state.isMatchOver) return null;
    
    // Convert current points to numbers for parity check
    const val = (p: string | number) => {
      if (typeof p === 'number') return p;
      switch(p) {
        case '0': return 0;
        case '15': return 1;
        case '30': return 2;
        case '40': return 3;
        case 'Ad': return 4;
        default: return 0;
      }
    };

    const p1Val = val(state.points[PlayerId.P1]);
    const p2Val = val(state.points[PlayerId.P2]);
    const total = p1Val + p2Val;
    
    // Even = Deuce (Right), Odd = Ad (Left)
    return total % 2 === 0 ? 'Right (Deuce)' : 'Left (Ad)';
  };

  const serveSide = getServeSide();

  // Helper to get game score for a set index
  const getGameScore = (setIndex: number) => {
      if (setIndex > state.sets.length - 1) return "";
      const set = state.sets[setIndex];
      return `${set[PlayerId.P1]} - ${set[PlayerId.P2]}`;
  };

  return (
    <div className="flex-1 flex flex-col relative">
      
      {/* Top Bar: Controls */}
      <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
         <button onClick={onUndo} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
             <Undo2 size={20} />
         </button>
         
         <div className="flex gap-2">
            <button onClick={onReset} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <RotateCcw size={20} />
            </button>
            <button onClick={onSettings} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <Settings size={20} />
            </button>
         </div>
      </div>

      {/* Match Scoreboard Strip - Improved Visibility */}
      <div className="bg-slate-50 dark:bg-slate-950 py-3 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-center items-center gap-6">
              {/* Previous Sets */}
              {state.currentSetIndex > 0 && (
                  <div className="flex gap-4 text-slate-400 dark:text-slate-500 text-sm font-mono font-bold">
                     {state.sets.slice(0, state.currentSetIndex).map((s, idx) => (
                         <div key={idx} className="flex flex-col items-center">
                             <span className="text-[10px] uppercase tracking-wider mb-0.5">Set {idx+1}</span>
                             <span className={s[PlayerId.P1] > s[PlayerId.P2] ? 'text-blue-500' : 'text-red-500'}>
                                 {s[PlayerId.P1]}-{s[PlayerId.P2]}
                             </span>
                         </div>
                     ))}
                  </div>
              )}
              
              {/* Current Set - Highlighted */}
              <div className="flex flex-col items-center px-4 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                      Set {state.currentSetIndex + 1}
                  </span>
                  <div className="text-3xl font-mono font-black tracking-widest leading-none flex gap-3 text-slate-900 dark:text-white">
                      <span className="text-blue-600 dark:text-blue-400">{state.games[PlayerId.P1]}</span>
                      <span className="text-slate-300 dark:text-slate-600">-</span>
                      <span className="text-red-600 dark:text-red-400">{state.games[PlayerId.P2]}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Switch Side Notification Overlay */}
      {showSwitch && !state.isMatchOver && (
          <div className="bg-yellow-400 dark:bg-yellow-500 text-black font-bold text-center py-2 animate-pulse shadow-lg z-20 mx-4 rounded-lg my-2 flex items-center justify-center gap-2">
              <RefreshCcw size={20} /> SWITCH SIDES
          </div>
      )}

      {/* Service Indicator (Central) */}
      {!state.isMatchOver && (
        <div className="flex justify-center mt-2">
           <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur text-slate-600 dark:text-slate-300 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400 dark:text-slate-500">Serve</span>
              <span className="text-slate-900 dark:text-white flex items-center gap-1">
                 {serveSide === 'Right (Deuce)' ? 'Right' : 'Left'}
                 <span className="opacity-50 font-normal normal-case">
                   ({serveSide === 'Right (Deuce)' ? 'Deuce' : 'Ad'})
                 </span>
              </span>
           </div>
        </div>
      )}

      {/* Main Score Area */}
      <div className="flex-1 flex flex-col justify-center gap-2 p-2 relative">
          
          {/* Player 1 Card */}
          <button 
             onClick={() => onPoint(PlayerId.P1)}
             disabled={state.isMatchOver}
             className="group flex-1 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/40 dark:to-slate-900 border-l-4 border-blue-500 relative overflow-hidden rounded-xl active:scale-[0.98] transition-all touch-manipulation shadow-sm dark:shadow-none"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                 <div className="text-9xl font-black text-blue-500">P1</div>
             </div>
             
             <div className="flex items-center justify-between h-full px-6">
                 <div className="text-left z-10 flex flex-col items-start">
                     <div className="text-2xl font-bold text-slate-800 dark:text-blue-100 truncate max-w-[150px]">{p1Name}</div>
                     {state.server === PlayerId.P1 && !state.isMatchOver && (
                         <div className="mt-2 bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 font-semibold">
                            <span>SERVING</span>
                         </div>
                     )}
                 </div>
                 
                 <div className="z-10 text-right">
                     <div className="text-7xl font-mono font-black text-slate-900 dark:text-white tracking-tighter shadow-blue-500 drop-shadow-lg">
                        {p1Point}
                     </div>
                 </div>
             </div>
          </button>

          {/* VS Divider / Tie Break Indicator */}
          <div className="h-4 flex items-center justify-center">
              {state.isTieBreak ? (
                  <span className="text-[10px] bg-purple-600 text-white px-3 py-0.5 rounded-full font-bold tracking-wider animate-pulse shadow-lg">TIE BREAK</span>
              ) : (
                  <div className="w-full flex items-center gap-4 px-8 opacity-30">
                      <div className="h-[1px] bg-slate-300 dark:bg-slate-600 flex-1"></div>
                      <div className="h-[1px] bg-slate-300 dark:bg-slate-600 flex-1"></div>
                  </div>
              )}
          </div>

          {/* Player 2 Card */}
          <button 
             onClick={() => onPoint(PlayerId.P2)}
             disabled={state.isMatchOver}
             className="group flex-1 bg-gradient-to-br from-red-50 to-white dark:from-red-900/40 dark:to-slate-900 border-l-4 border-red-500 relative overflow-hidden rounded-xl active:scale-[0.98] transition-all touch-manipulation shadow-sm dark:shadow-none"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                 <div className="text-9xl font-black text-red-500">P2</div>
             </div>
             
             <div className="flex items-center justify-between h-full px-6">
                 <div className="text-left z-10 flex flex-col items-start">
                     <div className="text-2xl font-bold text-slate-800 dark:text-red-100 truncate max-w-[150px]">{p2Name}</div>
                     {state.server === PlayerId.P2 && !state.isMatchOver && (
                         <div className="mt-2 bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 text-[10px] px-2 py-1 rounded-full inline-flex items-center gap-1 font-semibold">
                            <span>SERVING</span>
                         </div>
                     )}
                 </div>
                 
                 <div className="z-10 text-right">
                     <div className="text-7xl font-mono font-black text-slate-900 dark:text-white tracking-tighter drop-shadow-lg">
                        {p2Point}
                     </div>
                 </div>
             </div>
          </button>
      </div>

      {state.isMatchOver && (
          <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in duration-500">
              <Trophy size={64} className="text-yellow-500 mb-4 animate-bounce" />
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">MATCH OVER</h2>
              <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
                  Winner: <span className={state.winner === PlayerId.P1 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                      {state.winner === PlayerId.P1 ? p1Name : p2Name}
                  </span>
              </p>
              <div className="flex gap-4">
                  <button onClick={onUndo} className="px-6 py-2 rounded-full border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Undo Last Point</button>
                  <button onClick={onReset} className="px-6 py-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:opacity-90 transition-opacity">Start New Match</button>
              </div>
          </div>
      )}
    </div>
  );
};

export default ScoreControls;