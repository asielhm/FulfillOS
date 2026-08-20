import { getWorkspaceContext } from "@/lib/workspace";

export async function getFloorContext() {
  const context = await getWorkspaceContext();
  const { supabase, organization, userId } = context;

  const [profileResult, warehouseResult] = await Promise.all([
    supabase
      .from("team_profiles")
      .select("display_name, job_title")
      .eq("organization_id", organization.id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("warehouses")
      .select("id, name, code, is_primary")
      .eq("organization_id", organization.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("name")
      .limit(1)
      .maybeSingle(),
  ]);

  if (profileResult.error) throw new Error(profileResult.error.message);
  if (warehouseResult.error) throw new Error(warehouseResult.error.message);

  return {
    ...context,
    worker: {
      displayName:
        profileResult.data?.display_name ??
        context.email.split("@")[0] ??
        "Team member",
      jobTitle: profileResult.data?.job_title ?? null,
    },
    defaultWarehouse: warehouseResult.data ?? null,
  };
}
