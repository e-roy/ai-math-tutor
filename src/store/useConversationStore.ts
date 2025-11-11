import { create } from "zustand";
import type { UploadedImage } from "@/types/files";
import type { DifficultyLevel } from "@/types/conversation";

export interface CompletionData {
  problemText: string;
  finalAnswer: string;
  score?: number;
  masteryLevel?: "low" | "medium" | "high";
  attempts: number;
  hintsUsed: number;
  timeElapsed?: number;
}

interface ConversationStore {
  // Conversation selection
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;

  // Difficulty level
  difficulty: DifficultyLevel;
  setDifficulty: (difficulty: DifficultyLevel) => void;

  // Image uploads
  uploadedImages: UploadedImage[];
  addUploadedImage: (image: UploadedImage) => void;
  updateUploadedImage: (
    fileId: string,
    updates: Partial<UploadedImage>,
  ) => void;
  clearUploadedImages: () => void;

  // Answer validation state
  lastAnswerValidation: { isValid: boolean; answer: string } | null;
  setLastAnswerValidation: (
    validation: { isValid: boolean; answer: string } | null,
  ) => void;
  isProblemSolved: boolean;
  setIsProblemSolved: (solved: boolean) => void;
  answerAttempts: number;
  incrementAnswerAttempts: () => void;
  resetAnswerAttempts: () => void;

  // Stuck detection state
  consecutiveWrongAttempts: number;
  hintsUsedInProblem: number;
  incrementConsecutiveWrong: () => void;
  resetConsecutiveWrong: () => void;
  incrementHintsUsed: () => void;

  // Completion modal state
  isCompletionModalOpen: boolean;
  completionData: CompletionData | null;
  openCompletionModal: (data: CompletionData) => void;
  closeCompletionModal: () => void;

  // Hint requests
  hintRequests: number;
  incrementHintRequests: () => void;

  // Reset functions
  resetProblem: () => void;
  resetConversation: () => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversationId: null,
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),

  difficulty: "balanced",
  setDifficulty: (difficulty) => set({ difficulty }),

  uploadedImages: [],
  addUploadedImage: (image) =>
    set((state) => ({ uploadedImages: [...state.uploadedImages, image] })),
  updateUploadedImage: (fileId, updates) =>
    set((state) => ({
      uploadedImages: state.uploadedImages.map((img) =>
        img.fileId === fileId ? { ...img, ...updates } : img,
      ),
    })),
  clearUploadedImages: () => set({ uploadedImages: [] }),

  lastAnswerValidation: null,
  setLastAnswerValidation: (validation) => set({ lastAnswerValidation: validation }),
  isProblemSolved: false,
  setIsProblemSolved: (solved) => set({ isProblemSolved: solved }),
  answerAttempts: 0,
  incrementAnswerAttempts: () =>
    set((state) => ({ answerAttempts: state.answerAttempts + 1 })),
  resetAnswerAttempts: () => set({ answerAttempts: 0 }),

  consecutiveWrongAttempts: 0,
  hintsUsedInProblem: 0,
  incrementConsecutiveWrong: () =>
    set((state) => ({
      consecutiveWrongAttempts: state.consecutiveWrongAttempts + 1,
    })),
  resetConsecutiveWrong: () => set({ consecutiveWrongAttempts: 0 }),
  incrementHintsUsed: () =>
    set((state) => ({
      hintsUsedInProblem: state.hintsUsedInProblem + 1,
    })),

  isCompletionModalOpen: false,
  completionData: null,
  openCompletionModal: (data) =>
    set({ isCompletionModalOpen: true, completionData: data }),
  closeCompletionModal: () =>
    set({ isCompletionModalOpen: false, completionData: null }),

  hintRequests: 0,
  incrementHintRequests: () =>
    set((state) => ({ hintRequests: state.hintRequests + 1 })),

  resetProblem: () =>
    set({
      uploadedImages: [],
      lastAnswerValidation: null,
      isProblemSolved: false,
      answerAttempts: 0,
      consecutiveWrongAttempts: 0,
      hintsUsedInProblem: 0,
      hintRequests: 0,
      isCompletionModalOpen: false,
      completionData: null,
    }),

  resetConversation: () =>
    set({
      selectedConversationId: null,
      uploadedImages: [],
      lastAnswerValidation: null,
      isProblemSolved: false,
      answerAttempts: 0,
      consecutiveWrongAttempts: 0,
      hintsUsedInProblem: 0,
      hintRequests: 0,
      isCompletionModalOpen: false,
      completionData: null,
    }),
}));

