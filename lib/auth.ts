import { createSupabaseServerClient, supabaseAuthConfigured } from "./supabaseServer";
import { getSupabaseAdmin } from "./supabase";

export async function getCurrentUser() {
  if (!supabaseAuthConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Resolve the current user's workspace id (personal workspace auto-created on
 * signup). Returns null when not logged in or Supabase is not configured.
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("auth: workspace lookup failed", error);
    return null;
  }
  return data?.workspace_id ?? null;
}
