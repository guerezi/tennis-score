import React, { useRef, useEffect, useState } from "react";
import { HistoryEvent, PlayerId, MatchConfig } from "../types";
import {
  Trophy,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
} from "lucide-react";
import { COLOR_CONFIGS } from "../constants";

interface Props {
  history: HistoryEvent[];
  config: MatchConfig;
  p1Color: string;
  p2Color: string;
}

const MatchHistory: React.FC<Props> = ({
  history,
  config,
  p1Color,
  p2Color,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const p1Styles = COLOR_CONFIGS[p1Color] || COLOR_CONFIGS["blue"];
  const p2Styles = COLOR_CONFIGS[p2Color] || COLOR_CONFIGS["red"];

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

    if (
      event.type === "GAME_WIN" ||
      event.type === "SET_WIN" ||
      event.type === "MATCH_WIN"
    ) {
      // Construct label
      const p1G = event.scoreSnapshot.games[PlayerId.P1];
      const p2G = event.scoreSnapshot.games[PlayerId.P2];
      const isSetWin = event.type === "SET_WIN" || event.type === "MATCH_WIN";

      rounds.push({
        gameIndex: gameCounter++,
        winner: event.winnerId,
        points: [...currentRoundPoints],
        setIndex: setCounter,
        gameScoreStr: `${p1G}-${p2G}`,
        isSetEnd: isSetWin,
        setWinner: isSetWin ? event.winnerId : undefined,
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
      gameScoreStr: `${p1G}-${p2G}`, // Current game score
    });
  }

  // Group rounds by set for the full view
  const sets: (typeof rounds)[] = [];
  rounds.forEach((r) => {
    if (!sets[r.setIndex]) sets[r.setIndex] = [];
    sets[r.setIndex].push(r);
  });

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 transition-colors duration-300">
      <div className="w-full px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <RefreshCcw size={12} /> Match Timeline
          {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
            {history.length} Points
          </span>
          <button
            onClick={() => setShowFullHistory(true)}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
            title="View Full History"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div
          ref={scrollRef}
          className="flex overflow-x-auto p-4 items-start space-x-4 no-scrollbar bg-slate-50/50 dark:bg-slate-900/50"
        >
          {rounds.map((round, idx) => {
            const showSetDivider =
              idx > 0 && rounds[idx - 1].setIndex !== round.setIndex;

            return (
              <React.Fragment key={idx}>
                {showSetDivider && (
                  <div className="flex flex-col justify-center items-center px-2 opacity-50">
                    <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
                    <span className="text-[10px] font-bold my-1 text-slate-400">
                      SET {round.setIndex + 1}
                    </span>
                    <div className="h-8 w-px bg-slate-300 dark:bg-slate-600"></div>
                  </div>
                )}

                <div
                  className={`
                flex flex-col gap-2 p-3 rounded-xl border shadow-sm min-w-max transition-all
                ${
                  round.winner === PlayerId.P1
                    ? `${p1Styles.bg} ${p1Styles.border} dark:bg-opacity-10 dark:border-opacity-20`
                    : round.winner === PlayerId.P2
                    ? `${p2Styles.bg} ${p2Styles.border} dark:bg-opacity-10 dark:border-opacity-20`
                    : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                }
            `}
                >
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Game {round.gameIndex + 1}
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 bg-white/50 dark:bg-black/20 px-1.5 rounded">
                      {round.gameScoreStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {round.points.map((pt) => (
                      <div key={pt.id} className="relative group/pt">
                        <div
                          className={`w-3 h-3 rounded-full transition-transform hover:scale-125 ${
                            pt.winnerId === PlayerId.P1
                              ? `${p1Styles.dot} shadow-sm`
                              : `${p2Styles.dot} shadow-sm`
                          }`}
                        />
                        {pt.sideSwitchAfter && (
                          <div className="absolute -top-2 -right-1">
                            <RefreshCcw size={8} className="text-slate-500" />
                          </div>
                        )}
                      </div>
                    ))}
                    {round.winner && (
                      <div className="ml-1 pl-2 border-l border-slate-200 dark:border-slate-700/50">
                        <Trophy
                          size={14}
                          className={
                            round.winner === PlayerId.P1
                              ? p1Styles.primary
                              : p2Styles.primary
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div className="min-w-[20px]"></div>
        </div>
      )}

      {/* Full History Modal */}
      {showFullHistory && (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col animate-in fade-in duration-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Match Summary
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase">
                {config.p1Name} vs {config.p2Name}
              </p>
            </div>
            <button
              onClick={() => setShowFullHistory(false)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {sets.map((setRounds, setIdx) => (
              <div key={setIdx} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                  <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
                    Set {setIdx + 1}
                  </span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800"></div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {setRounds.map((round, rIdx) => (
                    <div
                      key={rIdx}
                      className={`
                                    flex flex-col gap-3 p-4 rounded-xl border shadow-sm
                                    ${
                                      round.winner === PlayerId.P1
                                        ? `${p1Styles.bg} ${p1Styles.border} dark:bg-opacity-10 dark:border-opacity-20`
                                        : round.winner === PlayerId.P2
                                        ? `${p2Styles.bg} ${p2Styles.border} dark:bg-opacity-10 dark:border-opacity-20`
                                        : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                    }
                                `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Game {round.gameIndex + 1}
                        </span>
                        <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
                          {round.gameScoreStr}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {round.points.map((pt) => (
                          <div
                            key={pt.id}
                            className={`w-2.5 h-2.5 rounded-full ${
                              pt.winnerId === PlayerId.P1
                                ? p1Styles.dot
                                : p2Styles.dot
                            }`}
                          />
                        ))}
                      </div>

                      {round.winner && (
                        <div className="flex justify-end mt-auto pt-2">
                          <Trophy
                            size={14}
                            className={
                              round.winner === PlayerId.P1
                                ? p1Styles.primary
                                : p2Styles.primary
                            }
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchHistory;
