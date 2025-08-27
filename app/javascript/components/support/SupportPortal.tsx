import { ConversationDetails } from "@helperai/client";
import { useHelperClient } from "@helperai/react";
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
  const [chatConversationSlug, setChatConversationSlug] = React.useState<string | null>(searchParams.get("chat"));
  const [chatConversation, setChatConversation] = React.useState<ConversationDetails | null>(null);
  const { client } = useHelperClient();

  useEffect(() => {
    const url = new URL(location.href);
    if (!isNewTicketOpen && url.searchParams.get("new_ticket")) {
      url.searchParams.delete("new_ticket");
      history.replaceState(null, "", url.toString());
    }
  }, [isNewTicketOpen]);

  useEffect(() => {
    if (chatConversationSlug && !chatConversation) {
      void client.conversations.get(assertDefined(chatConversationSlug)).then(setChatConversation);
    }
  }, [chatConversationSlug, chatConversation, searchParams]);

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
    setChatConversationSlug(params.get("chat"));
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
        onCreated={(slug) => {
          setIsNewTicketOpen(false);
          setChatConversationSlug(slug);
        }}
      />
      <ChatModal
        open={!!chatConversationSlug}
        onClose={(isEscalated) => {
          setChatConversationSlug(null);
          if (isEscalated) {
            showAlert("Our support team will respond to your message shortly. Thank you for your patience.", "success");
          }
        }}
        conversation={chatConversation}
      />
    </>
  );
}
