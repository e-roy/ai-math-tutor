import { create } from "zustand";
import type { Turn } from "@/server/db/turns";
import type { TurnType } from "@/types/ai";

interface ChatStore {
  conversationId: string | null;
  turns: Turn[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingText: string;
  streamingTurnType: TurnType | null;

  setConversationId: (id: string | null) => void;
  setTurns: (turns: Turn[]) => void;
  addTurn: (turn: Turn) => void;
  clearTurns: () => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  appendStreamingText: (text: string) => void;
  setStreamingTurnType: (type: TurnType | null) => void;
  finalizeStreaming: (turn: Turn) => void;
  clearStreaming: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  conversationId: null,
  turns: [],
  isLoading: false,
  isStreaming: false,
  streamingText: "",
  streamingTurnType: null,

  setConversationId: (id) => set({ conversationId: id }),

  setTurns: (turns) => set({ turns }),

  addTurn: (turn) =>
    set((state) => ({
      turns: [...state.turns, turn],
    })),

  clearTurns: () => set({ turns: [] }),

  setLoading: (loading) => set({ isLoading: loading }),

  setStreaming: (streaming) =>
    set({ isStreaming: streaming, streamingText: "", streamingTurnType: null }),

  appendStreamingText: (text) =>
    set((state) => ({
      streamingText: state.streamingText + text,
    })),

  setStreamingTurnType: (type) => set({ streamingTurnType: type }),

  finalizeStreaming: (turn) =>
    set((state) => ({
      turns: [...state.turns, turn],
      isStreaming: false,
      streamingText: "",
      streamingTurnType: null,
    })),

  clearStreaming: () =>
    set({
      isStreaming: false,
      streamingText: "",
      streamingTurnType: null,
    }),
}));

