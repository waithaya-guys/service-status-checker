import { getServices, getLogs, getIncidents } from "@/lib/storage";
import { DashboardClient } from "@/components/dashboard-client";

export default async function Home() {
  const services = await getServices();
  const logs = await getLogs();
  const incidents = await getIncidents();

  return (
    <section className="flex flex-col gap-6 py-2">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">Service Status</h1>
        <p className="text-default-500">Real-time status updates for all services.</p>
      </div>

      <DashboardClient services={services} logs={logs} incidents={incidents} />
    </section>
  );
}
