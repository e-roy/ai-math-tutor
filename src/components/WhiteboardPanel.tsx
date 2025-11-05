"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

import { Whiteboard } from "@/components/Whiteboard";
import { ProblemHeader } from "@/components/ProblemHeader";
import { EphemeralChatPane } from "@/components/EphemeralChatPane";
import { ResultsModal } from "@/components/ResultsModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { api } from "@/trpc/react";
import type { Turn } from "@/server/db/turns";
import { extractExpectedAnswer } from "@/lib/grading/equivalence";

// Dynamically import Whiteboard to avoid SSR issues with Excalidraw
const DynamicWhiteboard = dynamic(
  () =>
    import("@/components/Whiteboard").then((mod) => ({
      default: mod.Whiteboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[70vh] items-center justify-center rounded-xl border">
        <p className="text-muted-foreground">Loading whiteboard...</p>
      </div>
    ),
  },
);

interface WhiteboardPanelProps {
  conversationId: string;
}

/**
 * WhiteboardPanel component for whiteboard practice mode
 * Features:
 * - Large Excalidraw whiteboard (main focus)
 * - Minimized chat drawer (Sheet, slides from right, default closed)
 * - Problem header with timer and action buttons
 * - Ephemeral chat (not persisted to database)
 * - Results modal on submission
 */
export function WhiteboardPanel({
  conversationId,
}: WhiteboardPanelProps) {
  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const timerStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Problem state
  const [problemText, setProblemText] = useState<string>("");
  const [problemLatex, setProblemLatex] = useState<string | undefined>(
    undefined,
  );

  // Chat drawer state
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Counters for Phase 4
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [hintsCount, setHintsCount] = useState(0);

  // Chat turns state (for extracting student answer)
  const [chatTurns, setChatTurns] = useState<Turn[]>([]);

  // Practice session state
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Results modal state
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  // tRPC mutations
  const createSession = api.practice.createSession.useMutation();

  // Timer effect: update elapsed time every second when running
  useEffect(() => {
    if (isTimerRunning && timerStartRef.current !== null) {
      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - timerStartRef.current!;
        setElapsedTimeMs(elapsed);
      }, 100); // Update every 100ms for smoother display
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  // Clear state when conversationId changes
  useEffect(() => {
    return () => {
      setIsTimerRunning(false);
      setElapsedTimeMs(0);
      setProblemText("");
      setProblemLatex(undefined);
      setIsChatOpen(false);
      setAttemptsCount(0);
      setHintsCount(0);
      setChatTurns([]);
      setSessionId(null);
      setIsResultsModalOpen(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      timerStartRef.current = null;
    };
  }, [conversationId]);

  const handleStartPractice = () => {
    if (!problemText.trim()) return;
    setIsTimerRunning(true);
    timerStartRef.current = Date.now();
    setElapsedTimeMs(0);
  };

  /**
   * Extract student answer from chat turns
   * Prefers LaTeX if available, otherwise uses text from last user message
   */
  const extractStudentAnswer = (turns: Turn[]): string | null => {
    // Find last user turn with math content
    const userTurns = turns.filter((turn) => turn.role === "user");
    if (userTurns.length === 0) return null;

    const lastUserTurn = userTurns[userTurns.length - 1];
    if (!lastUserTurn) return null;

    // Prefer LaTeX if available
    if (lastUserTurn.latex && lastUserTurn.latex.trim()) {
      return lastUserTurn.latex.trim();
    }

    // Fall back to text
    if (lastUserTurn.text && lastUserTurn.text.trim()) {
      return lastUserTurn.text.trim();
    }

    return null;
  };

  const handleFinishSubmit = async () => {
    if (!isTimerRunning) return;
    setIsTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Extract student answer from chat
    const studentAnswer = extractStudentAnswer(chatTurns);

    // Extract expected answer from problem text
    const expectedAnswer = extractExpectedAnswer(problemText);

    // Create practice session
    try {
      const session = await createSession.mutateAsync({
        conversationId,
        rawProblemText: problemText,
        attempts: attemptsCount,
        hintsUsed: hintsCount,
        timeOnTaskMs: elapsedTimeMs,
        studentAnswer: studentAnswer,
        expectedAnswer: expectedAnswer ?? undefined,
      });

      setSessionId(session.id);
      setIsResultsModalOpen(true);
    } catch (error) {
      console.error("Failed to create practice session:", error);
      // Still show modal even if creation fails
      setIsResultsModalOpen(true);
    }
  };

  const handleProblemChange = (text: string, latex?: string) => {
    setProblemText(text);
    setProblemLatex(latex);
  };

  const handleHintUsed = () => {
    setHintsCount((prev) => prev + 1);
  };

  const handleAttempt = () => {
    setAttemptsCount((prev) => prev + 1);
  };

  return (
    <div className="flex h-full flex-col">
      <ProblemHeader
        problemText={problemText}
        problemLatex={problemLatex}
        isTimerRunning={isTimerRunning}
        elapsedTimeMs={elapsedTimeMs}
        onStartPractice={handleStartPractice}
        onFinishSubmit={handleFinishSubmit}
        onProblemChange={handleProblemChange}
      />

      <div className="relative flex-1 overflow-hidden">
        {/* Main whiteboard area */}
        <div className="h-full">
          <DynamicWhiteboard conversationId={conversationId} />
        </div>

        {/* Floating chat toggle button */}
        <Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
          <SheetTrigger asChild>
            <Button
              className="fixed bottom-4 right-4 z-10 h-12 w-12 rounded-full shadow-lg"
              size="icon"
              variant="default"
            >
              <MessageSquare className="h-5 w-5" />
              <span className="sr-only">Open chat</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Practice Chat</SheetTitle>
            </SheetHeader>
            <div className="mt-4 h-[calc(100vh-120px)]">
              <EphemeralChatPane
                conversationId={conversationId}
                onHintUsed={handleHintUsed}
                onAttempt={handleAttempt}
                onTurnsChange={setChatTurns}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results modal */}
      <ResultsModal
        open={isResultsModalOpen}
        onOpenChange={setIsResultsModalOpen}
        conversationId={conversationId}
        timeOnTaskMs={elapsedTimeMs}
        sessionId={sessionId ?? undefined}
      />
    </div>
  );
}

