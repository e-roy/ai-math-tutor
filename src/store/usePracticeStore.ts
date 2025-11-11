import { create } from "zustand";
import type { Turn } from "@/server/db/turns";

interface PracticeStore {
  // Conversation tracking
  conversationId: string | null;

  // Problem and session state
  problemText: string;
  sessionId: string | null;
  isInitialized: boolean;

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

  // Actions - Initialization
  initializeSession: (
    conversationId: string,
    generateProblem: () => Promise<string>
  ) => Promise<void>;
  setConversationId: (id: string | null) => void;

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
  conversationId: null,
  problemText: "",
  sessionId: null,
  isInitialized: false,
  isTimerRunning: false,
  elapsedTimeMs: 0,
  timerStartTime: null,
  chatAttemptsCount: 0,
  boardAttemptsCount: 0,
  hintsCount: 0,
  chatTurns: [],
  isResultsModalOpen: false,
  triggerMessage: null,

  // Initialization actions
  initializeSession: async (conversationId, generateProblem) => {
    const state = get();
    
    // If conversation changed, reset first
    if (state.conversationId !== conversationId) {
      get().resetSession();
      set({ conversationId });
    }

    // Only generate if not already initialized or no problem text
    if (!state.isInitialized || !state.problemText) {
      try {
        const problemText = await generateProblem();
        set({ problemText, isInitialized: true });
      } catch (error) {
        console.error("Failed to generate problem:", error);
        set({ problemText: "3 + 4", isInitialized: true }); // Fallback
      }
    }
  },

  setConversationId: (id) => {
    const state = get();
    // Auto-reset if conversation changes
    if (state.conversationId !== id && state.conversationId !== null) {
      get().resetSession();
    }
    set({ conversationId: id });
  },

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
      isInitialized: false,
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

