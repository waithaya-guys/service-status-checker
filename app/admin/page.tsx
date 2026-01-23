import { getServices, getIncidents } from "@/lib/storage";
import { AdminClient } from "@/components/admin-client";

export default async function AdminPage() {
    const services = await getServices();
    const incidents = await getIncidents();

    return (
        <div className="py-8">
            <AdminClient services={services} incidents={incidents} />
        </div>
    );
}
