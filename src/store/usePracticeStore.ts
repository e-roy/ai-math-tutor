import { create } from "zustand";
import type { Turn } from "@/server/db/turns";

interface PracticeStore {
  // Problem and session state
  problemText: string;
  sessionId: string | null;

  // Timer state
  isTimerRunning: boolean;
  elapsedTimeMs: number;
  timerStartTime: number | null;

  // Session metrics
  chatAttemptsCount: number;
  boardAttemptsCount: number;
  hintsCount: number;
  chatTurns: Turn[];

  // UI state
  isResultsModalOpen: boolean;
  triggerMessage: string | null;

  // Actions - Problem
  setProblemText: (text: string) => void;
  setSessionId: (id: string | null) => void;

  // Actions - Timer
  startTimer: () => void;
  stopTimer: () => void;
  updateElapsedTime: () => void;

  // Actions - Metrics
  incrementChatAttempts: () => void;
  incrementBoardAttempts: () => void;
  incrementHints: () => void;

  // Actions - Chat
  setChatTurns: (turns: Turn[]) => void;
  addChatTurn: (turn: Turn) => void;

  // Actions - UI
  openResultsModal: () => void;
  closeResultsModal: () => void;
  setTriggerMessage: (message: string | null) => void;

  // Actions - Reset
  resetSession: () => void;
}

// Store timer interval outside Zustand state
let timerInterval: NodeJS.Timeout | null = null;

export const usePracticeStore = create<PracticeStore>((set, get) => ({
  // Initial state
  problemText: "",
  sessionId: null,
  isTimerRunning: false,
  elapsedTimeMs: 0,
  timerStartTime: null,
  chatAttemptsCount: 0,
  boardAttemptsCount: 0,
  hintsCount: 0,
  chatTurns: [],
  isResultsModalOpen: false,
  triggerMessage: null,

  // Problem actions
  setProblemText: (text) => set({ problemText: text }),
  setSessionId: (id) => set({ sessionId: id }),

  // Timer actions
  startTimer: () => {
    // Clear existing interval if any
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    const startTime = Date.now();
    set({
      isTimerRunning: true,
      timerStartTime: startTime,
      elapsedTimeMs: 0,
    });

    // Start interval to update elapsed time
    timerInterval = setInterval(() => {
      const state = get();
      if (state.timerStartTime !== null) {
        const elapsed = Date.now() - state.timerStartTime;
        set({ elapsedTimeMs: elapsed });
      }
    }, 100); // Update every 100ms for smooth display
  },

  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({ isTimerRunning: false });
  },

  updateElapsedTime: () => {
    const state = get();
    if (state.timerStartTime !== null) {
      const elapsed = Date.now() - state.timerStartTime;
      set({ elapsedTimeMs: elapsed });
    }
  },

  // Metrics actions
  incrementChatAttempts: () =>
    set((state) => ({ chatAttemptsCount: state.chatAttemptsCount + 1 })),

  incrementBoardAttempts: () =>
    set((state) => ({ boardAttemptsCount: state.boardAttemptsCount + 1 })),

  incrementHints: () =>
    set((state) => ({ hintsCount: state.hintsCount + 1 })),

  // Chat actions
  setChatTurns: (turns) => set({ chatTurns: turns }),

  addChatTurn: (turn) =>
    set((state) => ({ chatTurns: [...state.chatTurns, turn] })),

  // UI actions
  openResultsModal: () => set({ isResultsModalOpen: true }),

  closeResultsModal: () => set({ isResultsModalOpen: false }),

  setTriggerMessage: (message) => set({ triggerMessage: message }),

  // Reset session
  resetSession: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({
      problemText: "",
      sessionId: null,
      isTimerRunning: false,
      elapsedTimeMs: 0,
      timerStartTime: null,
      chatAttemptsCount: 0,
      boardAttemptsCount: 0,
      hintsCount: 0,
      chatTurns: [],
      isResultsModalOpen: false,
      triggerMessage: null,
    });
  },
}));

