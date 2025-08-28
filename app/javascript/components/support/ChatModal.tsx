import { ConversationDetails, Message } from "@helperai/client";
import { MessageContent, useAttachments, useChat, useHelperClient } from "@helperai/react";
import cx from "classnames";
import pinkIcon from "images/pink-icon.png";
import React from "react";

import FileUtils from "$app/utils/file";

import { Button } from "$app/components/Button";
import { FileRowContent } from "$app/components/FileRowContent";
import { Icon } from "$app/components/Icons";
import { Modal } from "$app/components/Modal";
import { useRunOnce } from "$app/components/useRunOnce";

function ChatMessageItem({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const attachments = [...message.publicAttachments, ...message.privateAttachments];

  return (
    <div
      className={cx("mb-4 flex gap-3", {
        "justify-end": isUser,
        "justify-start": !isUser,
      })}
    >
      {!isUser && (
        <img
          className="border-gray-200 mt-1 h-8 w-8 flex-shrink-0 rounded-full border"
          src={pinkIcon}
          alt="Assistant"
        />
      )}
      <div
        className={cx("max-w-[80%] rounded-lg px-4 py-2", {
          "bg-blue-500 text-white": isUser,
          "bg-gray-100 text-gray-900": !isUser,
        })}
      >
        <MessageContent className="prose prose-sm" message={message} />
        {attachments.length > 0 && (
          <div role="list" className="mt-3 w-full max-w-[500px]" aria-label="Attachments">
            {attachments.map((attachment, index) => (
              <div
                role="listitem"
                className={cx("mb-2 last:mb-0", {
                  "p-0": attachment.contentType?.startsWith("image/"),
                })}
                key={`${attachment.url}-${index}`}
              >
                {attachment.contentType?.startsWith("image/") ? (
                  <img src={attachment.url} alt={attachment.name ?? "Attachment"} className="w-full rounded-sm" />
                ) : (
                  <div
                    className={cx("rounded border p-2", {
                      "border-blue-300 bg-blue-400": isUser,
                      "border-gray-200 bg-white": !isUser,
                    })}
                  >
                    <FileRowContent
                      name={FileUtils.getFileNameWithoutExtension(attachment.name ?? "Attachment")}
                      extension={FileUtils.getFileExtension(attachment.name ?? "Attachment").toUpperCase()}
                      externalLinkUrl={null}
                      isUploading={false}
                      details={<li>{attachment.contentType?.split("/")[1]}</li>}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div
          className={cx("mt-1 text-xs opacity-70", {
            "text-blue-100": isUser,
            "text-gray-500": !isUser,
          })}
        >
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {isUser ? (
        <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
          <Icon name="solid-user" className="h-4 w-4 text-white" />
        </div>
      ) : null}
    </div>
  );
}

function ChatContent({
  conversation,
  initialMessage,
  onClose,
}: {
  conversation: ConversationDetails;
  initialMessage: { content: string; attachments: File[] } | undefined;
  onClose: (isEscalated: boolean) => void;
}) {
  const { messages, agentTyping, input, handleInputChange, handleSubmit, append, status } = useChat({
    conversation,
  });
  const formRef = React.useRef<HTMLFormElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const { attachments, addAttachments, removeAttachment, clearAttachments, prepareAttachments } = useAttachments();
  const [feedbackButtonsStatus, setFeedbackButtonsStatus] = React.useState<
    "hidden" | "initialButtons" | "moreDetailsPrompt" | "talkToHuman" | "dismissed"
  >("hidden");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const lastMessage = messages.filter((m) => !!m.content).at(-1);
  const shouldShowFeedbackButtons =
    status === "ready" &&
    lastMessage?.role === "assistant" &&
    (feedbackButtonsStatus === "initialButtons" || feedbackButtonsStatus === "talkToHuman");

  const handleSolvedIt = () => {
    onClose(false);
  };

  const handleDidntHelp = () => {
    if (feedbackButtonsStatus === "talkToHuman") {
      void append({
        role: "user",
        content: "I need to talk to a human",
      });
      setFeedbackButtonsStatus("dismissed");
    } else {
      setFeedbackButtonsStatus("moreDetailsPrompt");
    }
  };

  const { client } = useHelperClient();

  useRunOnce(() => {
    const sendInitialMessage = async () => {
      if (initialMessage && messages.length === 0) {
        void append({
          role: "user",
          content: initialMessage.content,
          experimental_attachments: await Promise.all(attachments.map(client.chat.attachment)),
        }).then(() => {
          setFeedbackButtonsStatus("initialButtons");
        });
      }
    };
    void sendInitialMessage();
  });

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  React.useEffect(() => {
    if (conversation.isEscalated) {
      onClose(true);
    }
  }, [conversation.isEscalated]);

  const submitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSubmit(e, { experimental_attachments: await prepareAttachments() });
    clearAttachments();
    setFeedbackButtonsStatus((status) => (status === "moreDetailsPrompt" ? "talkToHuman" : "initialButtons"));
  };

  return (
    <>
      <div className="bg-gray-50 flex-1 overflow-y-auto rounded-t-lg p-4">
        {messages
          .filter((message) => !!message.content)
          .map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))}

        {agentTyping || status === "submitted" ? (
          <div className="mb-4 flex gap-3">
            <img
              className="border-gray-200 mt-1 h-8 w-8 flex-shrink-0 rounded-full border"
              src={pinkIcon}
              alt="Assistant"
            />
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-white"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.1s" }}></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-white" style={{ animationDelay: "0.2s" }}></div>
              </div>
            </div>
          </div>
        ) : null}

        <div ref={messagesEndRef} />
      </div>

      {shouldShowFeedbackButtons ? (
        <div className="border-gray-200 border-t px-4 py-3">
          <div className="flex justify-center gap-2">
            <Button type="button" color="success" onClick={handleSolvedIt} className="text-sm">
              That solved it!
            </Button>
            <Button type="button" outline onClick={handleDidntHelp} className="text-sm">
              {feedbackButtonsStatus === "talkToHuman" ? "Talk to a human" : "This didn't help"}
            </Button>
          </div>
        </div>
      ) : null}

      {feedbackButtonsStatus === "moreDetailsPrompt" ? (
        <div className="border-gray-200 border-t px-4 py-3">
          <div className="text-gray-600 text-center text-sm">Why didn't this help? Be as specific as you can.</div>
        </div>
      ) : null}

      <form onSubmit={(e) => void submitForm(e)} ref={formRef}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length === 0) return;
            addAttachments(files);
            e.currentTarget.value = "";
          }}
        />

        {attachments.length > 0 && (
          <div role="list" className="border-gray-200 mb-2 rounded-lg border p-2" aria-label="Attachments">
            {attachments.map((file, index) => (
              <div role="listitem" key={`${file.name}-${index}`} className="mb-2 flex items-center gap-2 last:mb-0">
                <div className="flex-1">
                  <FileRowContent
                    name={FileUtils.getFileNameWithoutExtension(file.name)}
                    extension={FileUtils.getFileExtension(file.name).toUpperCase()}
                    externalLinkUrl={null}
                    isUploading={false}
                    details={<li>{FileUtils.getReadableFileSize(file.size)}</li>}
                  />
                </div>
                <Button outline color="danger" aria-label="Remove attachment" onClick={() => removeAttachment(index)}>
                  <Icon name="trash2" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" outline onClick={() => fileInputRef.current?.click()} className="self-end">
            <Icon name="paperclip" />
          </Button>
          <textarea
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message here..."
            className="border-gray-300 flex-1 resize-none rounded-lg border px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            color="primary"
            disabled={!input.trim() && attachments.length === 0}
            className="self-end"
          >
            <Icon name="arrow-right" />
          </Button>
        </div>
      </form>
    </>
  );
}

export function ChatModal({
  conversation,
  initialMessage,
  open,
  onClose,
}: {
  conversation: ConversationDetails | undefined;
  initialMessage: { content: string; attachments: File[] } | undefined;
  open: boolean;
  onClose: (isEscalated: boolean) => void;
}) {
  return (
    <Modal open={open} onClose={() => onClose(false)} title={conversation?.subject ?? ""} footer={null}>
      <div className="flex h-[600px] flex-col md:w-[700px]">
        {conversation ? (
          <ChatContent conversation={conversation} initialMessage={initialMessage} onClose={onClose} />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-4">
                <div className="border-gray-200 mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-blue-500"></div>
              </div>
              <p className="text-gray-500">Loading conversation...</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
