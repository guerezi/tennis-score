import { MatchConfig, PlayerId } from './types';

export const DEFAULT_CONFIG: MatchConfig = {
  p1Name: "Player 1",
  p2Name: "Player 2",
  setsToWin: 2, // Best of 3
  useAdvantage: false, // Default to No-Ad
  finalSetType: 'superTieBreak', // Default to Super Tie Break
  tieBreakAt: 6,
  tieBreakPoints: 7,
};

export const INITIAL_SETS_STATE = [
  { [PlayerId.P1]: 0, [PlayerId.P2]: 0 }
];

export const POINT_LABELS = ["0", "15", "30", "40"];