"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/trpc/react";
import { WhiteboardPanel } from "./WhiteboardPanel";
import { WhiteboardChatSidebar } from "./WhiteboardChatSidebar";
import { ProblemHeader } from "./ProblemHeader";
import { ResultsModal } from "./ResultsModal";
import { NavBar } from "@/app/(app)/_components/NavBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useChatStore } from "@/store/useChatStore";
import { useChildStore } from "@/store/useChildStore";
import type { Turn } from "@/server/db/turns";
import { extractExpectedAnswer } from "@/lib/grading/equivalence";
import { put } from "@vercel/blob";

export function WhiteboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("id");

  const currentChildId = useChildStore((state) => state.currentChildId);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(conversationIdFromUrl);

  // Chat-related state (lifted from WhiteboardPanel)
  const [problemText, setProblemText] = useState<string>("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [hintsCount, setHintsCount] = useState(0);
  const [chatTurns, setChatTurns] = useState<Turn[]>([]);

  // Timer refs
  const timerStartRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Practice session state
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Results modal state
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  // Trigger message for AI chat (e.g., when whiteboard is submitted)
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  // tRPC mutations and queries
  const createSession = api.practice.createSession.useMutation();
  const getUploadUrl = api.files.getUploadUrl.useMutation();
  const utils = api.useUtils();

  const createConversation = api.conversations.create.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.conversationId);
      router.push(`/tutor/whiteboard?id=${data.conversationId}`);
    },
  });

  const setConversationId = useChatStore(
    (state) => state.setConversationId,
  ) as (id: string | null) => void;

  // Fetch tutor persona when child is selected
  const { isLoading: isTutorPersonaLoading } = api.children.getTutor.useQuery(
    { childId: currentChildId! },
    { enabled: !!currentChildId },
  );

  // Update conversation ID in store when selected
  useEffect(() => {
    if (selectedConversationId) {
      setConversationId(selectedConversationId);
    }
  }, [selectedConversationId, setConversationId]);

  // Sync URL with selected conversation
  useEffect(() => {
    if (
      selectedConversationId &&
      conversationIdFromUrl !== selectedConversationId
    ) {
      router.push(`/tutor/whiteboard?id=${selectedConversationId}`);
    }
  }, [selectedConversationId, conversationIdFromUrl, router]);

  // Initialize from URL param
  useEffect(() => {
    if (
      conversationIdFromUrl &&
      conversationIdFromUrl !== selectedConversationId
    ) {
      setSelectedConversationId(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl, selectedConversationId]);

  // Create conversation automatically if none selected
  useEffect(() => {
    if (
      !selectedConversationId &&
      !createConversation.isPending &&
      !conversationIdFromUrl
    ) {
      createConversation.mutate({ path: "whiteboard" });
    }
  }, [selectedConversationId, createConversation, conversationIdFromUrl]);

  // Timer effect: update elapsed time every 100ms when running
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

  // Clear chat-related state when conversationId changes
  useEffect(() => {
    if (selectedConversationId) {
      setProblemText("");
      setIsTimerRunning(false);
      setElapsedTimeMs(0);
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
    }
  }, [selectedConversationId]);

  // Show loading state while checking if child data is available
  if (currentChildId && isTutorPersonaLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  // Show loading state while creating conversation
  if (createConversation.isPending || !selectedConversationId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-semibold">Creating whiteboard...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  /**
   * Extract student answer from chat turns
   * Looks for explicit answer markers first, then falls back to last user turn with math content
   * Prefers LaTeX if available, otherwise uses text
   */
  const extractStudentAnswer = (turns: Turn[]): string | null => {
    const userTurns = turns.filter((turn) => turn.role === "user");
    if (userTurns.length === 0) return null;

    // Look for explicit answer markers in reverse order (most recent first)
    const answerMarkers = [
      /(?:my\s+)?(?:final\s+)?answer\s+is\s*[:=]\s*(.+)/i,
      /(?:the\s+)?answer\s+is\s*[:=]\s*(.+)/i,
      /(?:my\s+)?answer\s*[:=]\s*(.+)/i,
      /(?:solution\s+is\s*[:=]\s*(.+))/i,
      /(?:i\s+got\s+)(.+)/i,
      /(?:it\s+is\s+)(.+)/i,
    ];

    for (let i = userTurns.length - 1; i >= 0; i--) {
      const turn = userTurns[i];
      if (!turn) continue;

      // Check text for answer markers
      if (turn.text) {
        for (const marker of answerMarkers) {
          const match = marker.exec(turn.text);
          if (match?.[1]) {
            const extracted = match[1].trim();
            // Remove trailing punctuation that might be part of the sentence
            const cleaned = extracted.replace(/[.,;!?]+$/, "").trim();
            if (cleaned) {
              // Prefer LaTeX if available for this turn
              if (turn.latex?.trim()) {
                return turn.latex.trim();
              }
              return cleaned;
            }
          }
        }
      }
    }

    // Fall back to last user turn with math content
    const lastUserTurn = userTurns[userTurns.length - 1];
    if (!lastUserTurn) return null;

    // Prefer LaTeX if available
    if (lastUserTurn.latex?.trim()) {
      return lastUserTurn.latex.trim();
    }

    // Fall back to text
    if (lastUserTurn.text?.trim()) {
      return lastUserTurn.text.trim();
    }

    return null;
  };

  const handleStartPractice = () => {
    if (!problemText.trim()) return;
    timerStartRef.current = Date.now();
    setElapsedTimeMs(0);
    setIsTimerRunning(true);
  };

  const handleWhiteboardSubmit = (
    isCorrect: boolean,
    extractedAnswer: string,
  ) => {
    if (!selectedConversationId || !isTimerRunning) return;

    // Track attempt
    setAttemptsCount((prev) => prev + 1);

    // Trigger AI response by sending a message with the extracted answer
    // Use standard answer format that AI recognizes to trigger checkAnswer tool
    // The AI will use checkAnswer tool to verify and respond appropriately
    const submissionMessage = `The answer is ${extractedAnswer}`;

    // Set trigger message to cause EphemeralChatPane to send it
    setTriggerMessage(submissionMessage);

    // Clear trigger message after a short delay to allow it to be detected
    setTimeout(() => {
      setTriggerMessage(null);
    }, 100);
  };

  const handleFinishSubmit = async () => {
    if (!isTimerRunning || !selectedConversationId) return;
    setIsTimerRunning(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Extract student answer from chat
    const studentAnswer = extractStudentAnswer(chatTurns);

    // Extract expected answer from problem text
    const expectedAnswer = extractExpectedAnswer(problemText);

    // Capture board snapshot (optional - don't block submission if it fails)
    let boardSnapshotBlobRef: string | null = null;
    try {
      // Get current board state
      const boardData = await utils.board.get.fetch({
        conversationId: selectedConversationId,
      });
      if (boardData?.scene) {
        // Convert scene to JSON string
        const sceneJson = JSON.stringify(boardData.scene);
        const blob = new Blob([sceneJson], { type: "application/json" });

        // Get upload URL (using PNG content type as required by API, but we'll upload JSON)
        const uploadInfo = await getUploadUrl.mutateAsync({
          filename: `board-snapshot-${selectedConversationId}-${Date.now()}.png`,
          contentType: "image/png",
        });

        // Upload to Vercel Blob as JSON (despite the PNG content type requirement)
        // The blob will store the JSON data correctly
        const uploadedBlob = await put(
          uploadInfo.pathname.replace(/\.png$/, ".json"),
          blob,
          {
            access: "public",
            token: uploadInfo.token,
            contentType: "application/json",
          },
        );

        boardSnapshotBlobRef = uploadedBlob.url;
      }
    } catch (error) {
      // Log error but don't block submission
      console.warn("Failed to capture board snapshot:", error);
    }

    // Create practice session
    try {
      const session = await createSession.mutateAsync({
        conversationId: selectedConversationId,
        rawProblemText: problemText,
        attempts: attemptsCount,
        hintsUsed: hintsCount,
        timeOnTaskMs: elapsedTimeMs,
        studentAnswer: studentAnswer,
        expectedAnswer: expectedAnswer ?? undefined,
        boardSnapshotBlobRef: boardSnapshotBlobRef ?? undefined,
      });

      setSessionId(session.id);
      setIsResultsModalOpen(true);
    } catch (error) {
      console.error("Failed to create practice session:", error);
      // Still show modal even if creation fails
      setIsResultsModalOpen(true);
    }
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarInset>
        <NavBar />
        <div className="flex h-full flex-col">
          <ProblemHeader
            isTimerRunning={isTimerRunning}
            elapsedTimeMs={elapsedTimeMs}
            onStartPractice={handleStartPractice}
            onFinishSubmit={handleFinishSubmit}
            onProblemChange={setProblemText}
          />
          <WhiteboardPanel
            conversationId={selectedConversationId}
            problemText={problemText}
            isPracticeActive={isTimerRunning}
            onSubmit={handleWhiteboardSubmit}
          />
        </div>
      </SidebarInset>
      <WhiteboardChatSidebar
        conversationId={selectedConversationId}
        problemText={problemText}
        isPracticeActive={isTimerRunning}
        onHintUsed={() => setHintsCount((prev) => prev + 1)}
        onAttempt={() => setAttemptsCount((prev) => prev + 1)}
        onTurnsChange={setChatTurns}
        triggerMessage={triggerMessage}
      />
      <ResultsModal
        open={isResultsModalOpen}
        onOpenChange={setIsResultsModalOpen}
        conversationId={selectedConversationId}
        timeOnTaskMs={elapsedTimeMs}
        sessionId={sessionId ?? undefined}
      />
    </SidebarProvider>
  );
}
