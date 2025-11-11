"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { api } from "@/trpc/react";
import { WhiteboardPanel } from "./WhiteboardPanel";
import { WhiteboardChatSidebar } from "./WhiteboardChatSidebar";
import { ResultsModal } from "./ResultsModal";
import { NavBar } from "@/app/(app)/_components/NavBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { useChatStore } from "@/store/useChatStore";
import { useChildStore } from "@/store/useChildStore";
import { usePracticeStore } from "@/store/usePracticeStore";
import { ChatProvider } from "./ChatContext";

export function WhiteboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get("id");

  const currentChildId = useChildStore((state) => state.currentChildId);
  const storeConversationId = useChatStore((state) => state.conversationId);

  const createConversation = api.conversations.create.useMutation({
    onSuccess: (data) => {
      // Update both stores and URL in one place
      const conversationId = data.conversationId;
      useChatStore.setState({ conversationId });
      usePracticeStore.setState({ conversationId });
      void router.push(`/app/whiteboard?id=${conversationId}`);
    },
  });

  // Fetch tutor persona when child is selected
  const { data: tutorPersona, isLoading: isTutorPersonaLoading } =
    api.children.getTutor.useQuery(
      { childId: currentChildId! },
      { enabled: !!currentChildId },
    );

  // Single useEffect: Initialize conversation from URL or create new one
  useEffect(() => {
    if (conversationIdFromUrl) {
      // Update stores with URL conversation ID
      useChatStore.setState({ conversationId: conversationIdFromUrl });
      usePracticeStore.setState({ conversationId: conversationIdFromUrl });
    } else if (!createConversation.isPending) {
      // No conversation ID in URL, reset stores and create new one
      usePracticeStore.getState().resetSession();
      useChatStore.getState().resetConversation();
      createConversation.mutate({ path: "whiteboard" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  if (
    createConversation.isPending ||
    !conversationIdFromUrl ||
    (storeConversationId && storeConversationId !== conversationIdFromUrl)
  ) {
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
    <ChatProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
          } as React.CSSProperties
        }
      >
        <SidebarInset>
          <NavBar />
          <WhiteboardPanel conversationId={conversationIdFromUrl} />
        </SidebarInset>
        <WhiteboardChatSidebar
          conversationId={conversationIdFromUrl}
          tutorAvatarUrl={tutorPersona?.avatarUrl}
          tutorDisplayName={tutorPersona?.displayName}
        />
        <ResultsModal conversationId={conversationIdFromUrl} />
      </SidebarProvider>
    </ChatProvider>
  );
}
