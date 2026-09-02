import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ensureMaster } from "@/lib/chat.functions";

const MASTER_EMAIL = "navyapanchal0000@gmail.com";
const MASTER_PASSWORD = "628922";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Choreography — Private Group Chat" },
      {
        name: "description",
        content:
          "Choreography is an invite-only real-time group chat. Sign in with the credentials your master user gave you.",
      },
      { property: "og:title", content: "Choreography — Private Group Chat" },
      {
        property: "og:description",
        content: "Invite-only real-time group chat with live presence and shared media.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const prepareMaster = useServerFn(ensureMaster);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat", replace: true });
    });
  }, [navigate]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      if (cleanEmail === MASTER_EMAIL && password === MASTER_PASSWORD) {
        await prepareMaster({ data: { email: cleanEmail, password } });
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error || !data.user) {
        toast.error("Those credentials aren't recognised. Ask your master user for access.");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", data.user.id)
        .maybeSingle();
      if (!profile) {
        await supabase.auth.signOut();
        toast.error("This account isn't registered in Choreography yet.");
        return;
      }
      await supabase
        .from("profiles")
        .update({ last_seen: new Date().toISOString(), force_signout_at: null })
        .eq("id", data.user.id);
      await supabase
        .from("activity_logs")
        .insert({ action: "sign_in", actor_name: profile.name, target_name: profile.name });
      navigate({ to: "/chat", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="aurora relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_50%_0%,oklch(0.24_0.02_275),transparent_70%)]" />
      <div className="w-full max-w-md animate-rise">
        <div className="mb-9 text-center">
          <p className="text-[0.7rem] font-medium uppercase tracking-[0.42em] text-primary/80">
            Invite only
          </p>
          <h1 className="mt-4 text-5xl font-bold text-foreground">Choreography</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            One room. Everyone in sync, in real time.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="glass-panel rounded-3xl p-7 shadow-[var(--shadow-panel)]"
        >
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-[0.18em]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl bg-surface/70 pl-10 text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-[0.18em]">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="6-digit password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-surface/70 px-10 text-base tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl text-base font-semibold shadow-[var(--shadow-glow)] transition-transform active:scale-[0.98]"
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : "Log in"}
            </Button>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Accounts are created by the master user only. There is no self sign-up.
          </p>
        </form>
      </div>
    </main>
  );
}
