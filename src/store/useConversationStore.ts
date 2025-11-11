import { create } from "zustand";
import type { UploadedImage } from "@/types/files";

interface ConversationStore {
  // Conversation selection
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;

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

  // Reset functions
  resetProblem: () => void;
  resetConversation: () => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  selectedConversationId: null,
  setSelectedConversationId: (id) => set({ selectedConversationId: id }),

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

  resetProblem: () =>
    set({
      uploadedImages: [],
      lastAnswerValidation: null,
      isProblemSolved: false,
      answerAttempts: 0,
      consecutiveWrongAttempts: 0,
      hintsUsedInProblem: 0,
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
    }),
}));

