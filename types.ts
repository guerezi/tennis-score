
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
  
  // Doubles & Styling
  mode?: 'singles' | 'doubles';
  p1PartnerName?: string;
  p2PartnerName?: string;
  p1Color?: string;
  p2Color?: string;
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
  // Track which player in a doubles pair is serving (0 or 1)
  p1ServerIdx?: number;
  p2ServerIdx?: number;
  
  isSecondServe: boolean; // Not strictly tracked for scoring, but good for UI
  shouldSwitchSides: boolean;
  isPaused: boolean;

  // History for Undo/Visualization
  history: HistoryEvent[];
  
  // Sync
  matchId?: string; // Firestore ID
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

// --- Firestore Data Structures ---

// 1. Summary Document (Lightweight, for Lists)
// Path: clubs/{topic}/active_matches/{matchId}
export interface LiveMatchSummary {
  id: string;
  p1_name: string;
  p2_name: string;
  score_summary: string; // Summary string e.g. "6-4, 2-3"
  
  // Low frequency updates
  current_games: GameScore;
  current_sets: SetScore[];
  server: PlayerId; // Only changes per game
  
  is_doubles: boolean;
  creator_uid: string;
  last_updated: any; // Timestamp
  match_duration?: number; // Duration in seconds, updated on summary sync
  startTime?: number | null; // For live timer calculation
  isPaused?: boolean;
  status: 'LIVE' | 'FINISHED';
  expiresAt?: any; // TTL for Firestore
  
  // Configuration snapshot for spectators
  config?: MatchConfig;
}

// 2. Realtime Document (High frequency, for Spectator View)
// Path: clubs/{topic}/active_matches/{matchId}/realtime/score
export interface RealtimeMatchData {
  current_points: PointScore;
  is_tie_break: boolean;
  history: HistoryEvent[]; // Added for timeline
  last_updated: any;
}
