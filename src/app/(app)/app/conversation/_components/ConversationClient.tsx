"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/trpc/react";
import { ProblemPanel } from "./ProblemPanel";
import { ConversationSidebar } from "./ConversationSidebar";
import { TutorHeader } from "./TutorHeader";
import { NavBar } from "@/app/(app)/_components/NavBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useChatStore } from "@/store/useChatStore";
import { useConversationStore } from "@/store/useConversationStore";
import { useChildStore } from "@/store/useChildStore";
import { getConversationPath } from "@/types/conversation";

export function ConversationClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("id");

  const currentChildId = useChildStore((state) => state.currentChildId);
  const selectedConversationId = useConversationStore(
    (state) => state.selectedConversationId,
  );
  const setSelectedConversationId = useConversationStore(
    (state) => state.setSelectedConversationId,
  );
  const resetConversation = useConversationStore(
    (state) => state.resetConversation,
  );

  const setConversationId = useChatStore((state) => state.setConversationId);
  const setTurns = useChatStore((state) => state.setTurns);
  const clearTurns = useChatStore((state) => state.clearTurns);

  // Fetch tutor persona when child is selected
  const { data: tutorPersona, isLoading: isTutorPersonaLoading } =
    api.children.getTutor.useQuery(
      { childId: currentChildId! },
      { enabled: !!currentChildId },
    );

  // Load conversation data to get path
  const { data: conversationData } = api.conversations.getById.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId },
  );

  // Load turns when conversation is selected
  const { data: loadedTurns } = api.conversations.getTurns.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: !!selectedConversationId },
  );

  const createConversation = api.conversations.create.useMutation({
    onSuccess: (data) => {
      setSelectedConversationId(data.conversationId);
      setConversationId(data.conversationId);
      router.push(`/app/conversation?id=${data.conversationId}`);
    },
  });

  // Single effect: Sync URL -> Store -> Chat, and handle conversation creation
  useEffect(() => {
    if (
      conversationIdFromUrl &&
      conversationIdFromUrl !== selectedConversationId
    ) {
      // URL changed, sync to store
      setSelectedConversationId(conversationIdFromUrl);
      setConversationId(conversationIdFromUrl);
      if (loadedTurns) {
        setTurns(loadedTurns);
      }
    } else if (
      !conversationIdFromUrl &&
      !selectedConversationId &&
      !createConversation.isPending
    ) {
      // No conversation selected, create new one
      createConversation.mutate({ path: "conversation" });
    } else if (selectedConversationId && loadedTurns) {
      // Update turns when loaded
      setTurns(loadedTurns);
    }
  }, [
    conversationIdFromUrl,
    selectedConversationId,
    loadedTurns,
    setSelectedConversationId,
    setConversationId,
    setTurns,
    createConversation,
  ]);

  const handleSelectConversation = (conversationId: string) => {
    // Reset state when switching conversations
    resetConversation();
    clearTurns();
    setSelectedConversationId(conversationId);
    setConversationId(conversationId);
    router.push(`/app/conversation?id=${conversationId}`);
  };

  const handleNewConversation = () => {
    // Create new conversation with conversation path
    createConversation.mutate({ path: "conversation" });
  };

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
          <h2 className="text-2xl font-semibold">Creating conversation...</h2>
          <p className="text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  const currentPath = conversationData
    ? getConversationPath(conversationData.meta)
    : "conversation";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <ConversationSidebar
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        variant="inset"
      />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <NavBar />
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <TutorHeader
                currentPath={currentPath}
                tutorPersona={tutorPersona}
              />
              <ProblemPanel
                conversationId={selectedConversationId}
                tutorAvatarUrl={tutorPersona?.avatarUrl}
                tutorDisplayName={tutorPersona?.displayName}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
