import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/wardog-burns")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { executePendingBurns } = await import("@/lib/money/burn-executor.server");
        try {
          return Response.json({ ok: true, ...(await executePendingBurns()) });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "failed";
          const refused = /money_paths_disabled|config_incomplete|treasury/.test(msg);
          return Response.json({ ok: false, error: msg.split(":")[0] }, { status: refused ? 503 : 500 });
        }
      },
    },
  },
});
