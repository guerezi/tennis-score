
import React from 'react';
import { PlayerId, MatchState } from '../types';
import { Undo2, Settings, Trophy, RefreshCcw, RotateCcw, ArrowLeft, Pause, Play } from 'lucide-react';
import { COLOR_CONFIGS } from '../constants';

interface Props {
  state: MatchState;
  onPoint: (winner: PlayerId) => void;
  onUndo: () => void;
  onSettings: () => void;
  onReset: () => void;
  onToggleServer?: (teamId: PlayerId) => void;
  onBack?: () => void;
  onTogglePause?: () => void;
  authUserId?: string | null;
}

const ScoreControls: React.FC<Props> = ({ state, onPoint, onUndo, onSettings, onReset, onToggleServer, onBack, onTogglePause }) => {
  const { p1Name, p2Name, mode, p1PartnerName, p2PartnerName, p1Color = 'blue', p2Color = 'red' } = state.config;
  const isDoubles = mode === 'doubles';

  const p1Styles = COLOR_CONFIGS[p1Color] || COLOR_CONFIGS['blue'];
  const p2Styles = COLOR_CONFIGS[p2Color] || COLOR_CONFIGS['red'];

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

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col relative">
      
      {/* Top Bar: Controls */}
      <div className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
         {/* Timer Group (Back + Time + Pause) */}
         <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
             {onBack && (
                 <button onClick={onBack} className="p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 shadow-sm transition-all">
                     <ArrowLeft size={18} />
                 </button>
             )}
             
             <div className="flex items-center gap-2 px-2">
                 <span className={`font-mono font-bold text-lg ${state.isPaused ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                     {formatTime(state.durationSeconds)}
                 </span>
                 {onTogglePause && !state.isMatchOver && (
                     <button onClick={onTogglePause} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors">
                         {state.isPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} className="fill-current" />}
                     </button>
                 )}
             </div>
         </div>
         
         <div className="flex gap-2">
            <button onClick={onUndo} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <Undo2 size={20} />
            </button>
            <button onClick={onReset} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <RotateCcw size={20} />
            </button>
            <button onClick={onSettings} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
                <Settings size={20} />
            </button>
         </div>
      </div>

      {/* Match Scoreboard Strip - Improved Visibility */}
      <div className="bg-slate-50 dark:bg-slate-950 py-3 border-b border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex justify-center items-center gap-6 relative z-10">
              {/* Previous Sets */}
              {state.currentSetIndex > 0 && (
                  <div className="flex gap-4 text-slate-400 dark:text-slate-500 text-sm font-mono font-bold">
                     {state.sets.slice(0, state.currentSetIndex).map((s, idx) => (
                         <div key={idx} className="flex flex-col items-center">
                             <span className="text-[10px] uppercase tracking-wider mb-0.5">Set {idx+1}</span>
                             <span className={s[PlayerId.P1] > s[PlayerId.P2] ? p1Styles.primary : p2Styles.primary}>
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
                      <span className={p1Styles.primary}>{state.games[PlayerId.P1]}</span>
                      <span className="text-slate-300 dark:text-slate-600">-</span>
                      <span className={p2Styles.primary}>{state.games[PlayerId.P2]}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* Switch Side Prominent Indicator */}
      {showSwitch && !state.isMatchOver && (
          <div className="absolute top-[120px] left-0 right-0 z-50 flex justify-center pointer-events-none">
              <div className="bg-yellow-400 dark:bg-yellow-500 text-black px-8 py-3 rounded-full font-black text-base uppercase tracking-widest shadow-2xl flex items-center gap-3 animate-bounce border-4 border-white dark:border-slate-900">
                  <RefreshCcw size={20} className="animate-spin-slow" />
                  <span>Switch Ends</span>
                  <RefreshCcw size={20} className="animate-spin-slow" />
              </div>
          </div>
      )}

      {/* Service Indicator (Central) */}
      {!state.isMatchOver && (
        <div className="flex justify-center mt-4">
           <div className={`
             backdrop-blur text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border transition-all duration-300
             ${showSwitch 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700/50 opacity-50 scale-90' 
                : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}
           `}>
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
             className={`group flex-1 bg-gradient-to-br ${p1Styles.gradientFrom} to-white ${p1Styles.darkGradientFrom} dark:to-slate-900 border-l-4 ${p1Styles.border} relative overflow-hidden rounded-xl active:scale-[0.98] transition-all touch-manipulation shadow-sm dark:shadow-none`}
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                 <div className={`text-9xl font-black ${p1Styles.primary}`}>P1</div>
             </div>
             
             <div className="flex items-center justify-between h-full px-6">
                 <div className="text-left z-10 flex flex-col items-start gap-1">
                     {/* Player 1 Name */}
                     <div 
                        onClick={(e) => {
                            if (isDoubles && state.server === PlayerId.P1 && onToggleServer) {
                                e.stopPropagation();
                                onToggleServer(PlayerId.P1);
                            }
                        }}
                        className={`text-2xl font-bold ${p1Styles.text} ${p1Styles.darkText} truncate max-w-[150px] flex items-center gap-2 ${isDoubles && state.server === PlayerId.P1 ? 'cursor-pointer hover:opacity-80' : ''}`}
                     >
                        {p1Name}
                        {state.server === PlayerId.P1 && (!isDoubles || state.p1ServerIdx === 0) && !state.isMatchOver && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                        )}
                     </div>

                     {/* Player 1 Partner (Doubles) */}
                     {isDoubles && (
                         <div 
                            onClick={(e) => {
                                if (state.server === PlayerId.P1 && onToggleServer) {
                                    e.stopPropagation();
                                    onToggleServer(PlayerId.P1);
                                }
                            }}
                            className={`text-xl font-bold text-slate-600 dark:text-white/60 truncate max-w-[150px] flex items-center gap-2 ${state.server === PlayerId.P1 ? 'cursor-pointer hover:opacity-80' : ''}`}
                         >
                            {p1PartnerName || "Partner"}
                            {state.server === PlayerId.P1 && state.p1ServerIdx === 1 && !state.isMatchOver && (
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                            )}
                         </div>
                     )}

                     {state.server === PlayerId.P1 && !state.isMatchOver && (
                         <div className={`mt-1 ${p1Styles.badgeBg} ${p1Styles.badgeText} text-xs px-3 py-1 rounded-full inline-flex items-center gap-1 font-bold shadow-sm border border-current/20`}>
                            <span>SERVING</span>
                         </div>
                     )}
                 </div>
                 
                 <div className="z-10 text-right">
                     <div className={`text-7xl font-mono font-black ${p1Styles.scoreColor} ${p1Styles.darkScoreColor} tracking-tighter shadow-blue-500 drop-shadow-lg`}>
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
             className={`group flex-1 bg-gradient-to-br ${p2Styles.gradientFrom} to-white ${p2Styles.darkGradientFrom} dark:to-slate-900 border-l-4 ${p2Styles.border} relative overflow-hidden rounded-xl active:scale-[0.98] transition-all touch-manipulation shadow-sm dark:shadow-none`}
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity">
                 <div className={`text-9xl font-black ${p2Styles.primary}`}>P2</div>
             </div>
             
             <div className="flex items-center justify-between h-full px-6">
                 <div className="text-left z-10 flex flex-col items-start gap-1">
                     {/* Player 2 Name */}
                     <div 
                        onClick={(e) => {
                            if (isDoubles && state.server === PlayerId.P2 && onToggleServer) {
                                e.stopPropagation();
                                onToggleServer(PlayerId.P2);
                            }
                        }}
                        className={`text-2xl font-bold ${p2Styles.text} ${p2Styles.darkText} truncate max-w-[150px] flex items-center gap-2 ${isDoubles && state.server === PlayerId.P2 ? 'cursor-pointer hover:opacity-80' : ''}`}
                     >
                        {p2Name}
                        {state.server === PlayerId.P2 && (!isDoubles || state.p2ServerIdx === 0) && !state.isMatchOver && (
                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                        )}
                     </div>

                     {/* Player 2 Partner (Doubles) */}
                     {isDoubles && (
                         <div 
                            onClick={(e) => {
                                if (state.server === PlayerId.P2 && onToggleServer) {
                                    e.stopPropagation();
                                    onToggleServer(PlayerId.P2);
                                }
                            }}
                            className={`text-xl font-bold text-slate-600 dark:text-white/60 truncate max-w-[150px] flex items-center gap-2 ${state.server === PlayerId.P2 ? 'cursor-pointer hover:opacity-80' : ''}`}
                         >
                            {p2PartnerName || "Partner"}
                            {state.server === PlayerId.P2 && state.p2ServerIdx === 1 && !state.isMatchOver && (
                                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(250,204,21,0.6)]" />
                            )}
                         </div>
                     )}

                     {state.server === PlayerId.P2 && !state.isMatchOver && (
                         <div className={`mt-1 ${p2Styles.badgeBg} ${p2Styles.badgeText} text-xs px-3 py-1 rounded-full inline-flex items-center gap-1 font-bold shadow-sm border border-current/20`}>
                            <span>SERVING</span>
                         </div>
                     )}
                 </div>
                 
                 <div className="z-10 text-right">
                     <div className={`text-7xl font-mono font-black ${p2Styles.scoreColor} ${p2Styles.darkScoreColor} tracking-tighter drop-shadow-lg`}>
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
                  Winner: <span className={state.winner === PlayerId.P1 ? `${p1Styles.primary} font-bold` : `${p2Styles.primary} font-bold`}>
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
