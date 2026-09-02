import { useEffect, useRef } from "react";

import { Attachment } from "./Attachment";

export type ChatMessage = {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  created_at: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function time(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageList({ messages, myId }: { messages: ChatMessage[]; myId: string }) {
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
        <p className="font-display text-lg text-foreground">The floor is yours</p>
        <p className="max-w-xs text-sm text-muted-foreground">
          Send the first message and everyone in the room sees it instantly.
        </p>
      </div>
    );
  }

  return (
    <div className="scroll-slim flex-1 space-y-3 overflow-y-auto px-4 py-5">
      {messages.map((message) => {
        const mine = message.sender_id === myId;
        return (
          <div
            key={message.id}
            className={`flex animate-bubble items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
          >
            {!mine && (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-raised text-[0.65rem] font-semibold text-muted-foreground">
                {initials(message.sender_name)}
              </span>
            )}
            <div
              className={`max-w-[78%] space-y-1.5 rounded-2xl px-3.5 py-2.5 ${
                mine
                  ? "rounded-br-md bg-bubble-mine text-bubble-mine-foreground"
                  : "rounded-bl-md bg-bubble-other text-bubble-other-foreground"
              }`}
            >
              {!mine && (
                <p className="text-[0.7rem] font-semibold tracking-wide text-primary">
                  {message.sender_name}
                </p>
              )}
              {message.attachment_url && (
                <Attachment
                  path={message.attachment_url}
                  type={message.attachment_type}
                  name={message.attachment_name}
                />
              )}
              {message.content && (
                <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed">
                  {message.content}
                </p>
              )}
              <p className="text-right text-[0.62rem] opacity-60">{time(message.created_at)}</p>
            </div>
          </div>
        );
      })}
      <div ref={bottom} />
    </div>
  );
}
