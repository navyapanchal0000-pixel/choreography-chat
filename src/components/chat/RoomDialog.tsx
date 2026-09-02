import { LogOut, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isOnline, type Profile } from "@/hooks/useChatSession";

export type ActivityLog = {
  id: string;
  action: string;
  actor_name: string | null;
  target_name: string | null;
  detail: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  user_added: "added",
  user_deleted: "deleted",
  sign_in: "signed in",
  sign_out: "signed out",
  forced_sign_out: "was signed out by master",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: Profile[];
  logs: ActivityLog[];
  me: Profile;
  tab: string;
  onTabChange: (tab: string) => void;
  onRequestSignOut: () => void;
  onForceSignOut: (user: Profile) => Promise<void>;
  onDelete: (user: Profile) => Promise<void>;
  onAddUser: (input: { name: string; email: string; password: string }) => Promise<void>;
};

export function RoomDialog({
  open,
  onOpenChange,
  users,
  logs,
  me,
  tab,
  onTabChange,
  onRequestSignOut,
  onForceSignOut,
  onDelete,
  onAddUser,
}: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [adding, setAdding] = useState(false);

  async function run(key: string, action: () => Promise<void>) {
    setPending(key);
    try {
      await action();
    } finally {
      setPending(null);
    }
  }

  const userList = (
    <div className="scroll-slim max-h-[46vh] space-y-2 overflow-y-auto pr-1">
      {users.map((user) => {
        const online = isOnline(user);
        return (
          <div
            key={user.id}
            className="flex items-center gap-3 rounded-2xl bg-surface/70 px-3 py-2.5"
          >
            <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-surface-raised text-xs font-semibold">
              {user.name.slice(0, 2).toUpperCase()}
              <span
                className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${
                  online ? "animate-pulse-soft bg-online" : "bg-offline"
                }`}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {user.name}
                {user.is_master && <ShieldCheck className="size-3.5 text-primary" />}
                {user.id === me.id && <span className="text-xs text-muted-foreground">(you)</span>}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {online ? "Online now" : "Offline"} · {user.email}
              </p>
            </div>
            {me.is_master && !user.is_master && (
              <div className="flex shrink-0 gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Sign out ${user.name}`}
                  disabled={pending === `out-${user.id}`}
                  onClick={() => void run(`out-${user.id}`, () => onForceSignOut(user))}
                >
                  <LogOut className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Delete ${user.name}`}
                  disabled={pending === `del-${user.id}`}
                  onClick={() => void run(`del-${user.id}`, () => onDelete(user))}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] gap-4 overflow-hidden rounded-3xl border-border bg-card sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">
            {me.is_master ? "Room administration" : "Room members"}
          </DialogTitle>
          <DialogDescription>
            {users.length} of 40 seats used · live online status
          </DialogDescription>
        </DialogHeader>

        {me.is_master ? (
          <Tabs value={tab} onValueChange={onTabChange}>
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-surface">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="logs">History</TabsTrigger>
              <TabsTrigger value="add">Add user</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-4">
              {userList}
            </TabsContent>

            <TabsContent value="logs" className="mt-4">
              <div className="scroll-slim max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                {logs.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
                )}
                {logs.map((log) => (
                  <div key={log.id} className="rounded-2xl bg-surface/70 px-3 py-2.5 text-sm">
                    <p>
                      <span className="font-medium">{log.actor_name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_LABEL[log.action] ?? log.action}
                      </span>{" "}
                      {log.target_name && log.target_name !== log.actor_name && (
                        <span className="font-medium">{log.target_name}</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                      {log.detail ? ` · ${log.detail}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="add" className="mt-4">
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAdding(true);
                  void onAddUser(form)
                    .then(() => setForm({ name: "", email: "", password: "" }))
                    .finally(() => setAdding(false));
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="new-name">User name</Label>
                  <Input
                    id="new-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="h-11 rounded-xl bg-surface/70"
                    placeholder="Ananya"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-email">User email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="h-11 rounded-xl bg-surface/70"
                    placeholder="ananya@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">6-digit password</Label>
                  <Input
                    id="new-password"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value.replace(/\D/g, "").slice(0, 6) })
                    }
                    className="h-11 rounded-xl bg-surface/70 tracking-[0.4em]"
                    placeholder="000000"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={adding}
                  className="h-11 w-full rounded-xl font-semibold"
                >
                  <UserPlus className="mr-2 size-4" />
                  {adding ? "Adding…" : "Add user"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          userList
        )}

        <Button
          variant="outline"
          onClick={onRequestSignOut}
          className="h-11 w-full rounded-xl border-border bg-surface/60"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </Button>
      </DialogContent>
    </Dialog>
  );
}
