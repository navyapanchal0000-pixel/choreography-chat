import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, MoreVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Composer } from "@/components/chat/Composer";
import { MessageList, type ChatMessage } from "@/components/chat/MessageList";
import { RoomDialog, type ActivityLog } from "@/components/chat/RoomDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isOnline, useChatSession, type Profile } from "@/hooks/useChatSession";
import { supabase } from "@/integrations/supabase/client";
import { addUser, deleteUser, signOutUser } from "@/lib/chat.functions";

export const Route = createFileRoute("/chat")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Room — Choreography" },
      {
        name: "description",
        content:
          "The Choreography group room: real-time messages, shared photos, videos and songs, and live member presence.",
      },
      { property: "og:title", content: "Room — Choreography" },
      {
        property: "og:description",
        content: "Real-time group messaging with live presence and shared media.",
      },
    ],
  }),
  component: ChatRoom,
});

function ChatRoom() {
  const navigate = useNavigate();
  const { session, profile, loading } = useChatSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tab, setTab] = useState("users");
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [, setTick] = useState(0);
  const loginAt = useRef(Date.now());

  const addUserFn = useServerFn(addUser);
  const signOutUserFn = useServerFn(signOutUser);
  const deleteUserFn = useServerFn(deleteUser);

  const myId = session?.user.id ?? "";

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/", replace: true });
  }, [loading, session, navigate]);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").order("created_at");
    setUsers((data as Profile[] | null) ?? []);
  }, []);

  const loadLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data as ActivityLog[] | null) ?? []);
  }, []);

  // Initial data + realtime streams
  useEffect(() => {
    if (!myId) return;
    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at")
        .limit(300);
      setMessages((data as ChatMessage[] | null) ?? []);
    })();
    void loadUsers();
    void loadLogs();

    const channel = supabase
      .channel("choreography-room")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) =>
        setMessages((prev) => {
          const next = payload.new as ChatMessage;
          return prev.some((m) => m.id === next.id) ? prev : [...prev, next];
        }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void loadUsers();
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => setLogs((prev) => [payload.new as ActivityLog, ...prev]),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [myId, loadUsers, loadLogs]);

  // Presence heartbeat + periodic re-render so online badges stay accurate
  useEffect(() => {
    if (!myId) return;
    const beat = () =>
      void supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("id", myId);
    beat();
    const heartbeat = setInterval(beat, 20_000);
    const ticker = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => {
      clearInterval(heartbeat);
      clearInterval(ticker);
    };
  }, [myId]);

  const signOut = useCallback(
    async (reason: "self" | "forced") => {
      if (profile && reason === "self") {
        await supabase
          .from("activity_logs")
          .insert({ action: "sign_out", actor_name: profile.name, target_name: profile.name });
      }
      await supabase
        .from("profiles")
        .update({ last_seen: new Date(Date.now() - 600_000).toISOString() })
        .eq("id", myId);
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    },
    [myId, navigate, profile],
  );

  // Master-triggered remote sign out
  const me = users.find((u) => u.id === myId) ?? profile;
  useEffect(() => {
    if (!me?.force_signout_at) return;
    if (new Date(me.force_signout_at).getTime() > loginAt.current) {
      toast.info("You were signed out by the master user");
      void signOut("forced");
    }
  }, [me?.force_signout_at, signOut]);

  const onlineCount = useMemo(() => users.filter(isOnline).length, [users]);

  async function sendText(content: string) {
    if (!me) return;
    const { error } = await supabase
      .from("messages")
      .insert({ sender_id: me.id, sender_name: me.name, content });
    if (error) toast.error("Message not sent. Try again.");
  }

  async function sendFile(file: File) {
    if (!me) return;
    const path = `${me.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage.from("chat-media").upload(path, file);
    if (uploadError) {
      toast.error(uploadError.message);
      return;
    }
    const { error } = await supabase.from("messages").insert({
      sender_id: me.id,
      sender_name: me.name,
      attachment_url: path,
      attachment_type: file.type,
      attachment_name: file.name,
    });
    if (error) toast.error("Attachment not sent. Try again.");
  }

  if (loading || !me) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="glass-panel z-10 flex items-center gap-3 border-b px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] uppercase tracking-[0.34em] text-primary/80">Choreography</p>
          <button
            type="button"
            onClick={() => {
              setTab("users");
              setDialogOpen(true);
            }}
            className="flex items-center gap-1.5 text-left transition-opacity active:opacity-70"
          >
            <span className="font-display text-lg font-semibold">{me.name}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          <p className="text-xs text-muted-foreground">
            {users.length} members · {onlineCount} online
          </p>
        </div>

        {me.is_master && (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Master menu"
              className="grid size-10 place-items-center rounded-full transition-colors hover:bg-surface-raised"
            >
              <MoreVertical className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl">
              {[
                { key: "users", label: "Active users & status" },
                { key: "logs", label: "History logs" },
                { key: "add", label: "Add user" },
              ].map((item) => (
                <DropdownMenuItem
                  key={item.key}
                  onSelect={() => {
                    setTab(item.key);
                    setDialogOpen(true);
                  }}
                >
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <MessageList messages={messages} myId={myId} />
      <Composer onSendText={sendText} onSendFile={sendFile} />

      <RoomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        users={users}
        logs={logs}
        me={me}
        tab={tab}
        onTabChange={setTab}
        onRequestSignOut={() => setConfirmSignOut(true)}
        onForceSignOut={async (user) => {
          try {
            await signOutUserFn({ data: { userId: user.id } });
            toast.success(`${user.name} was signed out`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not sign out that user");
          }
        }}
        onDelete={async (user) => {
          try {
            await deleteUserFn({ data: { userId: user.id } });
            toast.success(`${user.name} was removed`);
            void loadUsers();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not delete that user");
          }
        }}
        onAddUser={async (input) => {
          if (!/^\d{6}$/.test(input.password)) {
            toast.error("Password must be exactly 6 digits");
            throw new Error("invalid password");
          }
          try {
            await addUserFn({ data: input });
            toast.success(`${input.name} can now log in`);
            void loadUsers();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not add that user");
            throw error;
          }
        }}
      />

      <AlertDialog open={confirmSignOut} onOpenChange={setConfirmSignOut}>
        <AlertDialogContent className="rounded-3xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Sign out of Choreography?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll need your email and password to get back into the room.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={() => void signOut("self")}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
