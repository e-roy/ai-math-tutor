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
import { createEmptyScene } from "@/lib/whiteboard/scene-adapters";
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
  const [chatAttemptsCount, setChatAttemptsCount] = useState(0);
  const [boardAttemptsCount, setBoardAttemptsCount] = useState(0);
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
  const generateProblem = api.practice.generateProblem.useMutation();
  const saveBoard = api.board.save.useMutation();
  const utils = api.useUtils();

  const createConversation = api.conversations.create.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.conversationId);
      router.push(`/app/whiteboard?id=${data.conversationId}`);
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
      router.push(`/app/whiteboard?id=${selectedConversationId}`);
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
      setChatAttemptsCount(0);
      setBoardAttemptsCount(0);
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

  // Track previous modal state to detect when it closes
  const prevModalOpenRef = useRef(isResultsModalOpen);

  // Generate new problem when results modal closes after completion
  useEffect(() => {
    // Only generate if modal was open and is now closed, and we have a sessionId (meaning we just completed a problem)
    const wasOpen = prevModalOpenRef.current;
    const isNowClosed = !isResultsModalOpen;

    if (wasOpen && isNowClosed && sessionId) {
      const generateNewProblem = async () => {
        try {
          const result = await generateProblem.mutateAsync();
          const newProblem = result.problemText;
          setProblemText(newProblem);

          // Clear the board by saving an empty scene
          if (selectedConversationId) {
            try {
              // Get current board to get the version
              const boardData = await utils.board.get.fetch({
                conversationId: selectedConversationId,
              });

              const emptyScene = createEmptyScene();
              await saveBoard.mutateAsync({
                conversationId: selectedConversationId,
                scene: emptyScene,
                version: boardData?.version ?? 1,
              });
            } catch (error) {
              // Log error but don't block problem generation
              console.warn("Failed to clear board:", error);
            }
          }

          // Reset practice session state for new problem
          setSessionId(null);
          setChatAttemptsCount(0);
          setBoardAttemptsCount(0);
          setHintsCount(0);
          setElapsedTimeMs(0);
          setChatTurns([]);
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          timerStartRef.current = null;
        } catch (error) {
          console.error("Failed to generate new problem:", error);
          // Fallback to default problem
          const fallback = "3 + 4";
          setProblemText(fallback);

          // Still try to clear the board even on error
          if (selectedConversationId) {
            try {
              const boardData = await utils.board.get.fetch({
                conversationId: selectedConversationId,
              });
              const emptyScene = createEmptyScene();
              await saveBoard.mutateAsync({
                conversationId: selectedConversationId,
                scene: emptyScene,
                version: boardData?.version ?? 1,
              });
            } catch (boardError) {
              console.warn("Failed to clear board:", boardError);
            }
          }

          setSessionId(null);
          setChatAttemptsCount(0);
          setBoardAttemptsCount(0);
          setHintsCount(0);
          setElapsedTimeMs(0);
          setChatTurns([]);
        }
      };

      void generateNewProblem();
    }

    // Update ref for next render
    prevModalOpenRef.current = isResultsModalOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResultsModalOpen, sessionId]);

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
   * Handles simple numeric answers like "3" or "The answer is 3"
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
            // Skip if the extracted value is empty or just whitespace
            if (cleaned && cleaned.length > 0) {
              // Prefer LaTeX if available for this turn
              if (turn.latex?.trim()) {
                return turn.latex.trim();
              }
              return cleaned;
            }
          }
        }

        // Also check if the text is just a number (simple answer like "3")
        // This handles cases where user just types the number without any markers
        const numericMatch = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(turn.text.trim());
        if (numericMatch?.[1]) {
          // Prefer LaTeX if available
          if (turn.latex?.trim()) {
            return turn.latex.trim();
          }
          return numericMatch[1];
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

    // Fall back to text - check if it's a simple number
    if (lastUserTurn.text?.trim()) {
      const text = lastUserTurn.text.trim();
      // Check if it's just a number
      const numericMatch = /^\s*(\d+(?:\.\d+)?)\s*$/.exec(text);
      if (numericMatch?.[1]) {
        return numericMatch[1];
      }
      return text;
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

    // Track board attempt
    setBoardAttemptsCount((prev) => prev + 1);

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
        chatAttempts: chatAttemptsCount,
        boardAttempts: boardAttemptsCount,
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
        onChatAttempt={() => setChatAttemptsCount((prev) => prev + 1)}
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
