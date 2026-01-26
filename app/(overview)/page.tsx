import { getServices, getLatestLogs, getIncidents, getServiceStats } from "@/lib/storage";
import { DashboardClient } from "@/components/dashboard-client";

export default async function Home() {
  // Parallel Fetching for Perfromance
  const [services, logs, incidents, stats] = await Promise.all([
    getServices(),
    getLatestLogs(50), // Fetch only latest logs for sparkline
    getIncidents(),
    getServiceStats() // Pre-calculated stats
  ]);

  return (
    <section className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">Service Status</h1>
        <p className="text-default-500">Real-time status updates for all services.</p>
      </div>

      <DashboardClient services={services} logs={logs} incidents={incidents} stats={stats} />
    </section>
  );
}
