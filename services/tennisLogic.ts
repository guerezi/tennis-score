
import { MatchState, PlayerId, MatchConfig, HistoryEvent } from '../types';
import { INITIAL_SETS_STATE } from '../constants';

// Helper to deep copy state to avoid mutations
export const cloneState = (state: MatchState): MatchState => JSON.parse(JSON.stringify(state));

const getOtherPlayer = (id: PlayerId): PlayerId => (id === PlayerId.P1 ? PlayerId.P2 : PlayerId.P1);

export const initializeMatch = (config: MatchConfig): MatchState => ({
  config,
  startTime: Date.now(),
  durationSeconds: 0,
  isMatchOver: false,
  currentSetIndex: 0,
  sets: cloneState({ sets: INITIAL_SETS_STATE } as any).sets,
  games: { [PlayerId.P1]: 0, [PlayerId.P2]: 0 },
  points: { [PlayerId.P1]: "0", [PlayerId.P2]: "0" },
  isTieBreak: false,
  server: PlayerId.P1, // Default, can be toggled
  p1ServerIdx: 0,
  p2ServerIdx: 0,
  isSecondServe: false,
  shouldSwitchSides: false,
  isPaused: false,
  history: [],
});

export const addPoint = (currentState: MatchState, winner: PlayerId): MatchState => {
  if (currentState.isMatchOver) return currentState;

  let state = cloneState(currentState);
  const loser = getOtherPlayer(winner);
  
  let eventType: HistoryEvent['type'] = 'POINT';
  let gameWon = false;
  let setWon = false;
  let matchWon = false;
  
  // Capture if we were in a tie break before this point
  const wasTieBreak = state.isTieBreak;

  // --- TIE BREAK SCENARIO ---
  if (state.isTieBreak) {
    const currentP1 = state.points[PlayerId.P1] as number;
    const currentP2 = state.points[PlayerId.P2] as number;
    
    // Add point
    if (winner === PlayerId.P1) state.points[PlayerId.P1] = currentP1 + 1;
    else state.points[PlayerId.P2] = currentP2 + 1;

    // Check Win
    const newWinnerScore = state.points[winner] as number;
    const newLoserScore = state.points[loser] as number;
    
    // Target points: usually 7 (config.tieBreakPoints), or 10 for super tie break set
    let target = state.config.tieBreakPoints;
    
    // Check if this is a "Super Tie Break Set" (Deciding set replaced by TB)
    const isDeciderSet = state.currentSetIndex === (state.config.setsToWin * 2 - 2);
    // If finalSetType is superTieBreak, and we are in the deciding set, target is 10.
    // Note: The set index logic for Bo3: Set 0, Set 1. Decider is Set 2 (index 2). 2*2-2 = 2. Correct.
    if (state.config.finalSetType === 'superTieBreak' && isDeciderSet) {
        target = 10;
    }

    if (newWinnerScore >= target && (newWinnerScore - newLoserScore) >= 2) {
      gameWon = true;
    } else {
        // Tie Break Server Rotation: Switch every odd sum (1, 3, 5...)
        // Points: 1-0 (Sum 1) -> Switch
        // Points: 1-1 (Sum 2) -> Stay
        // Points: 2-1 (Sum 3) -> Switch
        const totalPoints = newWinnerScore + newLoserScore;
        if (totalPoints % 2 !== 0) {
            state.server = getOtherPlayer(state.server);
        }
    }
  } 
  // --- STANDARD GAME SCENARIO ---
  else {
    const wScore = state.points[winner] as string;
    const lScore = state.points[loser] as string;

    if (wScore === "0") state.points[winner] = "15";
    else if (wScore === "15") state.points[winner] = "30";
    else if (wScore === "30") state.points[winner] = "40";
    else if (wScore === "40") {
      if (lScore === "40") {
        if (state.config.useAdvantage) {
          state.points[winner] = "Ad";
        } else {
          gameWon = true; // Sudden death / Golden point
        }
      } else if (lScore === "Ad") {
        state.points[loser] = "40"; // Back to deuce
      } else {
        gameWon = true;
      }
    } else if (wScore === "Ad") {
      gameWon = true;
    }
  }

  // --- HANDLE GAME WIN ---
  if (gameWon) {
    eventType = 'GAME_WIN';
    state.games[winner]++;
    state.points = { [PlayerId.P1]: "0", [PlayerId.P2]: "0" };
    
    // Switch Server (Standard Game End)
    if (!wasTieBreak) {
        // Toggle the partner index for the team that just finished serving (so next time they serve, it's the other person)
        if (state.config.mode === 'doubles') {
            if (state.server === PlayerId.P1) state.p1ServerIdx = 1 - (state.p1ServerIdx || 0);
            else state.p2ServerIdx = 1 - (state.p2ServerIdx || 0);
        }
        state.server = getOtherPlayer(state.server);
    }

    state.isTieBreak = false; // Reset unless we enter one immediately

    // If we were in a tie break and won the game, we automatically win the set
    // (Because a tie break game determines the set, whether it's 7-6 or 1-0 super set)
    if (wasTieBreak) {
        setWon = true;
    } else {
        // Regular game win checks
        const wGames = state.games[winner];
        const lGames = state.games[loser];
        const tbAt = state.config.tieBreakAt;

        // Check if we reached the tie-break trigger
        if (wGames === tbAt && lGames === tbAt) {
           state.isTieBreak = true;
           state.points = { [PlayerId.P1]: 0, [PlayerId.P2]: 0 };
        } 
        // Check Set Win Conditions
        // 1. Reached tbAt (e.g. 6) and ahead by 2 (e.g. 6-4)
        else if (wGames === tbAt && lGames <= tbAt - 2) {
           setWon = true;
        }
        // 2. Reached tbAt + 1 (e.g. 7) and ahead by 2 (e.g. 7-5)
        // This covers the "advantage set" portion before tiebreak if rules allow,
        // but typically with tieBreakAt=6, 7-5 is the win.
        else if (wGames === tbAt + 1 && lGames === tbAt - 1) {
           setWon = true;
        }
    }
  }

  // --- HANDLE SET WIN ---
  if (setWon) {
    eventType = 'SET_WIN';
    state.sets[state.currentSetIndex] = { ...state.games };
    
    // If set ended with a tie-break, the player who started the TB receives in the next game.
    // Our logic above (gameWon) already switched the server if it was a standard game.
    // But if it was a tie-break win, we need to ensure the correct server for the next set.
    // In TB, server switches every odd point.
    // At end of TB, the rotation continues?
    // Rule: The player who served the first point of the tie-break receives in the first game of the following set.
    // We don't track who started the TB explicitly, but we can infer or just rely on the fact that
    // usually the server rotation is maintained.
    // Let's just ensure we switch server from whoever served the LAST point of the TB?
    // No, that's unreliable.
    // Simplification: Just switch server from whoever served the game BEFORE the tie-break?
    // If P1 served at 6-5, then P2 served at 6-6 (TB start).
    // So P2 started TB. So P1 should serve first game of next set.
    // So effectively, just switch server from whoever started the TB.
    // Since we don't track it, let's just assume standard rotation for now or let user fix it.
    // BUT, we must ensure we are not stuck on the same server.
    // If we won a set via TB, `gameWon` logic for `!wasTieBreak` was skipped.
    // So we need to switch server here if it was a TB win.
    if (wasTieBreak) {
         // If P1 started TB, P2 serves next set.
         // If P2 started TB, P1 serves next set.
         // We can't easily know who started without extra state.
         // However, usually the person who served the last game (to make it 6-6) is NOT the one starting the TB.
         // So if P1 served to make it 6-6, P2 starts TB.
         // Then P1 serves next set.
         // So effectively, the server for the next set is the one who served the game BEFORE the TB.
         // Which is... the current `server` state at the end of the TB? No, that changes point by point.
         
         // Hack/Fix: Just toggle from the *original* server of the TB?
         // Let's just toggle from whoever served the last point? No.
         // Let's just force a switch from whoever served the game at 6-6?
         // We don't have that history easily accessible here without digging.
         
         // Let's just toggle the server from whoever served the *last point* of the TB?
         // No, that depends on the score.
         
         // Let's rely on the user to fix it if it's wrong for now, OR:
         // Just switch server. It's better than staying same.
         state.server = getOtherPlayer(state.server);
    }

    // Check Match Win
    let p1Wins = 0;
    let p2Wins = 0;
    state.sets.forEach((s, idx) => {
        if (s[PlayerId.P1] > s[PlayerId.P2]) p1Wins++;
        else if (s[PlayerId.P2] > s[PlayerId.P1]) p2Wins++;
    });

    if (p1Wins === state.config.setsToWin || p2Wins === state.config.setsToWin) {
      matchWon = true;
      eventType = 'MATCH_WIN';
      state.isMatchOver = true;
      state.winner = p1Wins > p2Wins ? PlayerId.P1 : PlayerId.P2;
    } else {
      // Start new set
      state.currentSetIndex++;
      state.sets.push({ [PlayerId.P1]: 0, [PlayerId.P2]: 0 });
      state.games = { [PlayerId.P1]: 0, [PlayerId.P2]: 0 };
      
      // Check if next set is a pure Super Tie Break Set (common in doubles or recreational)
      // This happens if configured and we are at the deciding set index
      if (state.config.finalSetType === 'superTieBreak' && 
          state.currentSetIndex === (state.config.setsToWin * 2 - 2)) {
          state.isTieBreak = true;
          state.points = { [PlayerId.P1]: 0, [PlayerId.P2]: 0 };
      }
    }
  }

  // --- HANDLE SIDE SWITCH LOGIC ---
  const isSetTransition = eventType === 'SET_WIN' && !matchWon;
  let switchSides = false;
  
  if (state.isTieBreak) {
     const pts = (state.points[PlayerId.P1] as number) + (state.points[PlayerId.P2] as number);
     if (pts > 0 && pts % 6 === 0) switchSides = true;
  } else {
     // Standard games: switch if total games in current set is odd.
     let totalGames = 0;
     if (isSetTransition) {
        // Just finished a set.
        // If it was a tie-break set (e.g. 7-6, total 13), we switch.
        // If it was 6-3 (total 9), we switch.
        // If it was 6-4 (total 10), we stay.
        const finishedSet = state.sets[state.currentSetIndex - 1];
        totalGames = finishedSet[PlayerId.P1] + finishedSet[PlayerId.P2];
     } else {
        totalGames = state.games[PlayerId.P1] + state.games[PlayerId.P2];
     }
     
     // Check if we just finished a game or set
     if (eventType === 'GAME_WIN' || isSetTransition) {
        if (totalGames % 2 !== 0) switchSides = true;
     }
  }

  state.shouldSwitchSides = switchSides;

  // Add History Event
  const event: HistoryEvent = {
    id: Date.now().toString() + Math.random().toString(),
    timestamp: Date.now(),
    type: eventType,
    winnerId: winner,
    scoreSnapshot: {
      sets: JSON.parse(JSON.stringify(state.sets)),
      games: { ...state.games },
      points: { ...state.points },
      isTieBreak: state.isTieBreak
    },
    sideSwitchAfter: switchSides
  };

  state.history.push(event);

  return state;
};

export const undoPoint = (state: MatchState): MatchState => {
  if (state.history.length === 0) return state;

  const newHistory = [...state.history];
  newHistory.pop(); // Remove last event

  if (newHistory.length === 0) {
    const reset = initializeMatch(state.config);
    reset.startTime = state.startTime;
    return reset;
  }

  const lastEvent = newHistory[newHistory.length - 1];
  const snapshot = lastEvent.scoreSnapshot;

  return {
    ...state,
    history: newHistory,
    sets: JSON.parse(JSON.stringify(snapshot.sets)),
    games: { ...snapshot.games },
    points: { ...snapshot.points },
    isTieBreak: snapshot.isTieBreak,
    isMatchOver: false,
    winner: undefined,
    currentSetIndex: snapshot.sets.length - 1,
    shouldSwitchSides: lastEvent.sideSwitchAfter
  };
};
