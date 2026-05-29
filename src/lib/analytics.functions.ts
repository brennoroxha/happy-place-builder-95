import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const logPageEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; path: string; userAgent?: string }) => {
    if (!d.sessionId || !d.path) throw new Error("missing");
    return {
      sessionId: String(d.sessionId).slice(0, 80),
      path: String(d.path).slice(0, 200),
      userAgent: d.userAgent ? String(d.userAgent).slice(0, 300) : null,
    };
  })
  .handler(async ({ data }) => {
    await supabaseAdmin.from("page_events").insert({
      session_id: data.sessionId,
      path: data.path,
      user_agent: data.userAgent,
      event_type: "view",
    });
    return { ok: true };
  });

export type AnalyticsSummary = {
  todayViews: number;
  todayUniqueVisitors: number;
  totalViews: number;
  totalUniqueVisitors: number;
  byPathToday: { path: string; views: number }[];
  last7Days: { day: string; views: number }[];
};

export const getAnalyticsSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalyticsSummary> => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [{ data: todayRows }, { data: weekRows }, { data: allRows }] =
      await Promise.all([
        supabaseAdmin
          .from("page_events")
          .select("session_id,path")
          .gte("created_at", startOfToday.toISOString()),
        supabaseAdmin
          .from("page_events")
          .select("session_id,created_at")
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabaseAdmin.from("page_events").select("session_id", { count: "exact" }),
      ]);

    const today = todayRows ?? [];
    const week = weekRows ?? [];
    const todaySessions = new Set(today.map((r) => r.session_id as string));
    const totalSessions = new Set((allRows ?? []).map((r) => r.session_id as string));

    const pathCounts: Record<string, number> = {};
    today.forEach((r) => {
      const p = (r.path as string) || "/";
      pathCounts[p] = (pathCounts[p] ?? 0) + 1;
    });
    const byPathToday = Object.entries(pathCounts)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    const dayCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayCounts[key] = 0;
    }
    week.forEach((r) => {
      const key = String(r.created_at).slice(0, 10);
      if (key in dayCounts) dayCounts[key] += 1;
    });
    const last7Days = Object.entries(dayCounts).map(([day, views]) => ({ day, views }));

    return {
      todayViews: today.length,
      todayUniqueVisitors: todaySessions.size,
      totalViews: allRows?.length ?? 0,
      totalUniqueVisitors: totalSessions.size,
      byPathToday,
      last7Days,
    };
  },
);
