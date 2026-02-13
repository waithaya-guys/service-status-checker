import { getServices, getIncidents } from "@/lib/storage";
import { AdminClient } from "@/components/admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const services = await getServices();
    const incidents = await getIncidents();

    return (
        <div className="py-2">
            <AdminClient services={services} incidents={incidents} />
        </div>
    );
}
