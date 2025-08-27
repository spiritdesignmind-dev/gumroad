import { useConversation } from "@helperai/react";
import React, { useEffect } from "react";

import { assertDefined } from "$app/utils/assert";

import { showAlert } from "$app/components/server-components/Alert";
import { SupportHeader } from "$app/components/server-components/support/Header";
import { ChatModal } from "$app/components/support/ChatModal";
import { NewTicketModal } from "$app/components/support/NewTicketModal";
import { useGlobalEventListener } from "$app/components/useGlobalEventListener";
import { useOriginalLocation } from "$app/components/useOriginalLocation";

import { ConversationDetail } from "./ConversationDetail";
import { ConversationList } from "./ConversationList";

export default function SupportPortal() {
  const { searchParams } = new URL(useOriginalLocation());
  const [selectedConversationSlug, setSelectedConversationSlug] = React.useState<string | null>(searchParams.get("id"));
  const [isNewTicketOpen, setIsNewTicketOpen] = React.useState(!!searchParams.get("new_ticket"));
  const [chatConversationState, setChatConversationState] = React.useState<{
    slug: string;
    message?: string;
    attachments?: File[];
  } | null>(searchParams.get("chat") ? { slug: assertDefined(searchParams.get("chat")) } : null);
  const { data: chatConversation } = useConversation(
    chatConversationState?.slug ?? "",
    {},
    { enabled: !!chatConversationState?.slug },
  );

  useEffect(() => {
    const url = new URL(location.href);
    if (!isNewTicketOpen && url.searchParams.get("new_ticket")) {
      url.searchParams.delete("new_ticket");
      history.replaceState(null, "", url.toString());
    }
  }, [isNewTicketOpen]);

  useEffect(() => {
    const url = new URL(location.href);
    if (selectedConversationSlug) {
      url.searchParams.set("id", selectedConversationSlug);
    } else {
      url.searchParams.delete("id");
    }
    if (url.toString() !== window.location.href) history.pushState(null, "", url.toString());
  }, [selectedConversationSlug]);

  useGlobalEventListener("popstate", () => {
    const params = new URL(location.href).searchParams;
    setSelectedConversationSlug(params.get("id"));
    setIsNewTicketOpen(!!params.get("new_ticket"));
    setChatConversationState(params.get("chat") ? { slug: assertDefined(params.get("chat")) } : null);
  });

  if (selectedConversationSlug != null) {
    return (
      <ConversationDetail
        conversationSlug={selectedConversationSlug}
        onBack={() => setSelectedConversationSlug(null)}
      />
    );
  }

  return (
    <>
      <main>
        <header>
          <SupportHeader onOpenNewTicket={() => setIsNewTicketOpen(true)} />
        </header>
        <ConversationList onSelect={setSelectedConversationSlug} onOpenNewTicket={() => setIsNewTicketOpen(true)} />
      </main>
      <NewTicketModal
        open={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onCreated={(slug, message, attachments) => {
          setIsNewTicketOpen(false);
          setChatConversationState({ slug, message, attachments });
        }}
      />
      <ChatModal
        open={!!chatConversationState?.slug}
        initialMessage={
          chatConversationState?.message
            ? { content: chatConversationState.message, attachments: chatConversationState.attachments ?? [] }
            : undefined
        }
        onClose={(isEscalated) => {
          setChatConversationState(null);
          if (isEscalated) {
            showAlert("Our support team will respond to your message shortly. Thank you for your patience.", "success");
          }
        }}
        conversation={chatConversation}
      />
    </>
  );
}
