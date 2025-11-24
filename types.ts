export enum PlayerId {
  P1 = 'P1',
  P2 = 'P2',
}

export interface MatchConfig {
  p1Name: string;
  p2Name: string;
  setsToWin: number; // 1, 2 (Best of 3), or 3 (Best of 5)
  useAdvantage: boolean; // true = Ad, false = Golden Point
  finalSetType: 'standard' | 'superTieBreak'; // Standard (to 6) or Super Tie Break (to 10)
  tieBreakAt: number; // Usually 6 games
  tieBreakPoints: number; // Usually 7
}

export interface PointScore {
  [PlayerId.P1]: string | number; // "0", "15", "30", "40", "Ad" or number in tiebreak
  [PlayerId.P2]: string | number;
}

export interface GameScore {
  [PlayerId.P1]: number;
  [PlayerId.P2]: number;
}

export interface SetScore {
  [PlayerId.P1]: number;
  [PlayerId.P2]: number;
  winner?: PlayerId;
  tieBreakScore?: { [PlayerId.P1]: number; [PlayerId.P2]: number }; // If set ended in tiebreak
}

export interface MatchState {
  config: MatchConfig;
  startTime: number | null;
  durationSeconds: number;
  isMatchOver: boolean;
  winner?: PlayerId;
  
  // Current counters
  currentSetIndex: number; // 0-indexed
  sets: SetScore[];
  games: GameScore; // Current set games
  points: PointScore; // Current game points
  
  // Logic flags
  isTieBreak: boolean;
  server: PlayerId;
  isSecondServe: boolean; // Not strictly tracked for scoring, but good for UI
  shouldSwitchSides: boolean;

  // History for Undo/Visualization
  history: HistoryEvent[];
}

export type HistoryEvent = {
  id: string;
  timestamp: number;
  type: 'POINT' | 'GAME_WIN' | 'SET_WIN' | 'MATCH_WIN';
  winnerId: PlayerId;
  scoreSnapshot: {
    sets: SetScore[];
    games: GameScore;
    points: PointScore;
    isTieBreak: boolean;
  };
  sideSwitchAfter: boolean;
};
