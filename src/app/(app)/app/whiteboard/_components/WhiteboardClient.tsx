"use client";

import { useState, useEffect } from "react";
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
import { usePracticeStore } from "@/store/usePracticeStore";

export function WhiteboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("id");

  const currentChildId = useChildStore((state) => state.currentChildId);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(conversationIdFromUrl);

  const setConversationId = useChatStore(
    (state) => state.setConversationId,
  ) as (id: string | null) => void;

  const createConversation = api.conversations.create.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.conversationId);
      router.push(`/app/whiteboard?id=${data.conversationId}`);
    },
  });

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

  // Reset practice session when conversation changes
  useEffect(() => {
    if (selectedConversationId) {
      usePracticeStore.getState().resetSession();
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
          <ProblemHeader conversationId={selectedConversationId} />
          <WhiteboardPanel conversationId={selectedConversationId} />
        </div>
      </SidebarInset>
      <WhiteboardChatSidebar conversationId={selectedConversationId} />
      <ResultsModal conversationId={selectedConversationId} />
    </SidebarProvider>
  );
}
