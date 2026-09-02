import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MASTER_EMAIL = "navyapanchal0000@gmail.com";
const MASTER_PASSWORD = "628922";
const MAX_USERS = 40;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Creates the hardcoded master account on first login attempt. Public by design:
 *  it only ever acts when the exact hardcoded master credentials are supplied. */
export const ensureMaster = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string(), password: z.string() }).parse(d))
  .handler(async ({ data }) => {
    if (data.email.trim().toLowerCase() !== MASTER_EMAIL || data.password !== MASTER_PASSWORD) {
      return { created: false };
    }
    const db = await admin();
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .eq("email", MASTER_EMAIL)
      .maybeSingle();
    if (profile) return { created: false };

    let userId: string | undefined;
    const { data: created, error } = await db.auth.admin.createUser({
      email: MASTER_EMAIL,
      password: MASTER_PASSWORD,
      email_confirm: true,
    });
    if (created?.user) {
      userId = created.user.id;
    } else {
      const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      userId = list?.users.find((u) => u.email?.toLowerCase() === MASTER_EMAIL)?.id;
      if (!userId) throw new Error(error?.message ?? "Could not prepare master account");
      await db.auth.admin.updateUserById(userId, { password: MASTER_PASSWORD });
    }

    await db
      .from("profiles")
      .upsert({ id: userId, email: MASTER_EMAIL, name: "Navya", is_master: true });
    return { created: true };
  });

async function assertMaster(supabase: {
  from: (t: string) => {
    select: (c: string) => {
      eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
    };
  };
}, userId: string) {
  const db = await admin();
  const { data } = await db
    .from("profiles")
    .select("is_master, name")
    .eq("id", userId)
    .maybeSingle();
  if (!data?.is_master) throw new Error("Only the master user can do this");
  return data as { is_master: boolean; name: string };
}

export const addUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        name: z.string().trim().min(1, "Name is required").max(40),
        email: z.string().trim().email("Enter a valid email"),
        password: z.string().regex(/^\d{6}$/, "Password must be exactly 6 digits"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const master = await assertMaster(context.supabase as never, context.userId);
    const db = await admin();
    const email = data.email.toLowerCase();

    const { count } = await db.from("profiles").select("id", { count: "exact", head: true });
    if ((count ?? 0) >= MAX_USERS) throw new Error(`User limit reached (${MAX_USERS} users)`);

    const { data: dupe } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    if (dupe) throw new Error("That email is already registered");

    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created?.user) throw new Error(error?.message ?? "Could not create the user");

    const { error: profileError } = await db
      .from("profiles")
      .insert({ id: created.user.id, email, name: data.name, is_master: false });
    if (profileError) {
      await db.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }

    await db.from("activity_logs").insert({
      action: "user_added",
      actor_name: master.name,
      target_name: data.name,
      detail: email,
    });
    return { id: created.user.id };
  });

export const signOutUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const master = await assertMaster(context.supabase as never, context.userId);
    const db = await admin();
    const { data: target } = await db
      .from("profiles")
      .select("name, is_master")
      .eq("id", data.userId)
      .maybeSingle();
    if (target?.is_master) throw new Error("The master user cannot be signed out remotely");

    await db
      .from("profiles")
      .update({
        force_signout_at: new Date().toISOString(),
        last_seen: new Date(Date.now() - 600000).toISOString(),
      })
      .eq("id", data.userId);
    await db.from("activity_logs").insert({
      action: "forced_sign_out",
      actor_name: master.name,
      target_name: target?.name ?? "Unknown",
    });
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const master = await assertMaster(context.supabase as never, context.userId);
    const db = await admin();
    const { data: target } = await db
      .from("profiles")
      .select("name, is_master")
      .eq("id", data.userId)
      .maybeSingle();
    if (target?.is_master) throw new Error("The master user cannot be deleted");

    await db.from("profiles").delete().eq("id", data.userId);
    await db.auth.admin.deleteUser(data.userId);
    await db.from("activity_logs").insert({
      action: "user_deleted",
      actor_name: master.name,
      target_name: target?.name ?? "Unknown",
    });
    return { ok: true };
  });
