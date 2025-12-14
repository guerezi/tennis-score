import { MatchConfig, PlayerId } from "./types";

export const DEFAULT_CONFIG: MatchConfig = {
  p1Name: "Player 1",
  p2Name: "Player 2",
  setsToWin: 2, // Best of 3
  useAdvantage: false, // Default to No-Ad
  finalSetType: "superTieBreak", // Default to Super Tie Break
  tieBreakAt: 6,
  tieBreakPoints: 7,
  mode: "singles",
  p1Color: "blue",
  p2Color: "red",
};

export const COLOR_CONFIGS: Record<
  string,
  {
    primary: string; // Main color (text-blue-500)
    bg: string; // Light bg (bg-blue-50)
    border: string; // Border (border-blue-500)
    gradientFrom: string; // Gradient start (from-blue-50)
    darkGradientFrom: string; // Dark mode gradient start (from-blue-900/40)
    text: string; // Text color (text-blue-700)
    darkText: string; // Dark mode text (text-blue-100)
    scoreColor: string; // Score number color (text-blue-600)
    darkScoreColor: string; // Dark mode score color (text-blue-400)
    badgeBg: string; // Serving badge bg (bg-blue-100 dark:bg-blue-500/20)
    badgeText: string; // Serving badge text (text-blue-700 dark:text-blue-300)
    dot: string; // Dot color (bg-blue-500)
  }
> = {
  blue: {
    primary: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-500",
    gradientFrom: "from-blue-50",
    darkGradientFrom: "dark:from-blue-900/40",
    text: "text-slate-800",
    darkText: "dark:text-blue-100",
    scoreColor: "text-slate-900",
    darkScoreColor: "dark:text-white",
    badgeBg: "bg-blue-100 dark:bg-blue-500/20",
    badgeText: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  red: {
    primary: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-500",
    gradientFrom: "from-red-50",
    darkGradientFrom: "dark:from-red-900/40",
    text: "text-slate-800",
    darkText: "dark:text-red-100",
    scoreColor: "text-slate-900",
    darkScoreColor: "dark:text-white",
    badgeBg: "bg-red-100 dark:bg-red-500/20",
    badgeText: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  green: {
    primary: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    gradientFrom: "from-emerald-50",
    darkGradientFrom: "dark:from-emerald-900/40",
    text: "text-slate-800",
    darkText: "dark:text-emerald-100",
    scoreColor: "text-slate-900",
    darkScoreColor: "dark:text-white",
    badgeBg: "bg-emerald-100 dark:bg-emerald-500/20",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  orange: {
    primary: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-500",
    gradientFrom: "from-orange-50",
    darkGradientFrom: "dark:from-orange-900/40",
    text: "text-slate-800",
    darkText: "dark:text-orange-100",
    scoreColor: "text-slate-900",
    darkScoreColor: "dark:text-white",
    badgeBg: "bg-orange-100 dark:bg-orange-500/20",
    badgeText: "text-orange-700 dark:text-orange-300",
    dot: "bg-orange-500",
  },
  purple: {
    primary: "text-purple-500",
    bg: "bg-purple-50",
    border: "border-purple-500",
    gradientFrom: "from-purple-50",
    darkGradientFrom: "dark:from-purple-900/40",
    text: "text-slate-800",
    darkText: "dark:text-purple-100",
    scoreColor: "text-slate-900",
    darkScoreColor: "dark:text-white",
    badgeBg: "bg-purple-100 dark:bg-purple-500/20",
    badgeText: "text-purple-700 dark:text-purple-300",
    dot: "bg-purple-500",
  },
  pink: {
    primary: "text-pink-500",
    bg: "bg-pink-50",
    border: "border-pink-500",
    gradientFrom: "from-pink-50",
    darkGradientFrom: "dark:from-pink-900/40",
    text: "text-slate-800",
    darkText: "dark:text-pink-100",
    scoreColor: "text-slate-900",
    darkScoreColor: "dark:text-white",
    badgeBg: "bg-pink-100 dark:bg-pink-500/20",
    badgeText: "text-pink-700 dark:text-pink-300",
    dot: "bg-pink-500",
  },
};

export const INITIAL_SETS_STATE = [{ [PlayerId.P1]: 0, [PlayerId.P2]: 0 }];

export const POINT_LABELS = ["0", "15", "30", "40"];
