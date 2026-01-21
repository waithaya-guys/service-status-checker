import { getServices } from "@/lib/storage";
import { AdminClient } from "@/components/admin-client";

export default async function AdminPage() {
    const services = await getServices();

    return (
        <div className="py-8">
            <AdminClient services={services} />
        </div>
    );
}
