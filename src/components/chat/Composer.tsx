import { Loader2, Plus, SendHorizontal } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File) => Promise<void>;
};

export function Composer({ onSendText, onSendFile }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function send() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setText("");
    try {
      await onSendText(value);
    } finally {
      setBusy(false);
    }
  }

  async function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await onSendFile(file);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-panel sticky bottom-0 border-t px-3 py-3">
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={pickFile}
        />
        <button
          type="button"
          aria-label="Attach photo, video or song"
          onClick={() => fileInput.current?.click()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-raised text-foreground transition-transform hover:bg-secondary active:scale-90"
        >
          <Plus className="size-5" />
        </button>
        <textarea
          rows={1}
          value={text}
          placeholder="Message the room…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="scroll-slim max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-surface/80 px-4 py-3 text-[0.95rem] outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
        <Button
          type="button"
          onClick={() => void send()}
          disabled={busy || text.trim().length === 0}
          aria-label="Send message"
          className="size-11 shrink-0 rounded-full p-0 shadow-[var(--shadow-glow)] transition-transform active:scale-90"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <SendHorizontal className="size-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
