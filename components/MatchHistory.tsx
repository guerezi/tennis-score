import React, { useRef, useEffect } from 'react';
import { HistoryEvent, PlayerId, MatchConfig } from '../types';
import { Trophy, RefreshCcw } from 'lucide-react';

interface Props {
  history: HistoryEvent[];
  config: MatchConfig;
  p1Color: string;
  p2Color: string;
}

const MatchHistory: React.FC<Props> = ({ history, config, p1Color, p2Color }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to right/bottom when history updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [history]);

  // Group history by Games for cleaner visualization
  const rounds: {
    gameIndex: number; // Global game index
    winner?: PlayerId;
    points: HistoryEvent[];
    setIndex: number;
    gameScoreStr: string;
    isSetEnd?: boolean;
    setWinner?: PlayerId;
  }[] = [];

  let currentRoundPoints: HistoryEvent[] = [];
  let gameCounter = 0;
  let setCounter = 0;

  history.forEach((event) => {
    currentRoundPoints.push(event);
    
    if (event.type === 'GAME_WIN' || event.type === 'SET_WIN' || event.type === 'MATCH_WIN') {
        // Construct label
        const p1G = event.scoreSnapshot.games[PlayerId.P1];
        const p2G = event.scoreSnapshot.games[PlayerId.P2];
        const isSetWin = event.type === 'SET_WIN' || event.type === 'MATCH_WIN';
        
        rounds.push({
            gameIndex: gameCounter++,
            winner: event.winnerId,
            points: [...currentRoundPoints],
            setIndex: setCounter,
            gameScoreStr: `${p1G}-${p2G}`,
            isSetEnd: isSetWin,
            setWinner: isSetWin ? event.winnerId : undefined
        });
        currentRoundPoints = [];
        if (isSetWin) setCounter++;
    }
  });

  // If there are pending points in the current unfinished game
  if (currentRoundPoints.length > 0) {
      const last = currentRoundPoints[currentRoundPoints.length - 1];
      const p1G = last.scoreSnapshot.games[PlayerId.P1];
      const p2G = last.scoreSnapshot.games[PlayerId.P2];
      rounds.push({
          gameIndex: gameCounter,
          winner: undefined,
          points: [...currentRoundPoints],
          setIndex: setCounter,
          gameScoreStr: `${p1G}-${p2G}` // Current game score
      });
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="px-4 py-2 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 flex justify-between">
        <span>Match Timeline</span>
        <span>{history.length} Events</span>
      </div>
      
      <div ref={scrollRef} className="flex overflow-x-auto p-4 items-center space-x-2 no-scrollbar h-48">
        {rounds.map((round, idx) => {
          // Check if we need a set divider BEFORE this round
          const showSetDivider = idx > 0 && rounds[idx - 1].setIndex !== round.setIndex;
          const previousSetIndex = showSetDivider ? rounds[idx-1].setIndex : 0;
          
          return (
          <React.Fragment key={idx}>
            
            {/* Set Divider */}
            {showSetDivider && (
               <div className="flex flex-col justify-center items-center mx-4 h-32 relative group/divider">
                   <div className="h-full w-px bg-slate-300 dark:bg-slate-600"></div>
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-bold py-1 px-3 rounded-full border border-slate-600 dark:border-slate-300 whitespace-nowrap z-10 shadow-md">
                      SET {previousSetIndex + 1}
                   </div>
               </div>
            )}

            <div className="flex flex-col min-w-[60px] relative group h-full justify-end pb-2">
              
              {/* Set Label for first item or if no divider used (start of match) */}
              {idx === 0 && (
                 <div className="absolute -top-6 left-0 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider w-full text-center">
                    Set {round.setIndex + 1}
                 </div>
              )}

              {/* Game Result Card */}
              <div className={`
                flex flex-col items-center justify-between h-32 w-16 rounded-md border shadow-sm
                ${round.winner === PlayerId.P1 
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-500/30' 
                    : round.winner === PlayerId.P2 
                      ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/30' 
                      : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-600'}
                transition-all duration-300 relative overflow-hidden
              `}>
                
                {/* Game Winner Indicator */}
                <div className="mt-2 w-full flex justify-center">
                   {round.winner ? (
                       <Trophy size={14} className={round.winner === PlayerId.P1 ? 'text-blue-500 dark:text-blue-400' : 'text-red-500 dark:text-red-400'} />
                   ) : (
                       <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-bold">ACTIVE</div>
                   )}
                </div>

                {/* Point Pills (Vertical Stack) */}
                <div className="flex flex-col-reverse gap-1 my-2 w-full px-2 items-center flex-1 justify-center">
                   {round.points.map((pt) => {
                       // Check for side switch
                       return (
                           <div key={pt.id} className="relative w-full flex justify-center">
                               <div 
                                  className={`w-2 h-2 rounded-full ${pt.winnerId === PlayerId.P1 
                                    ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.6)]' 
                                    : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]'}`}
                               />
                               {pt.sideSwitchAfter && (
                                   <RefreshCcw size={8} className="absolute -right-1 text-yellow-500 top-0" />
                               )}
                           </div>
                       )
                   })}
                </div>

                {/* Game Score at end of round */}
                <div className="mb-1 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-black/40 px-1.5 py-0.5 rounded">
                    {round.gameScoreStr}
                </div>
              </div>
              
              {/* Winner Bar below card */}
              <div className="text-center mt-2 h-1 w-full flex justify-center">
                   {round.winner === PlayerId.P1 && <div className="h-1 w-8 bg-blue-500 rounded-full opacity-50"></div>}
                   {round.winner === PlayerId.P2 && <div className="h-1 w-8 bg-red-500 rounded-full opacity-50"></div>}
              </div>
            </div>
          </React.Fragment>
          )
        })}
        
        {/* End padding */}
        <div className="min-w-[20px]"></div>
      </div>
    </div>
  );
};

export default MatchHistory;