import { getServices, getIncidents } from "@/lib/storage";
import { IncidentsTable } from "@/components/incidents-table";

export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
    const services = await getServices();
    const incidents = await getIncidents();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Incidents History</h1>
                <p className="text-default-500">View detailed history of all service incidents.</p>
            </div>

            <IncidentsTable incidents={incidents} services={services} />
        </div>
    );
}
