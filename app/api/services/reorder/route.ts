
import { NextRequest, NextResponse } from "next/server";
import { getServices, saveServices } from "@/lib/storage";

export async function POST(req: NextRequest) {
    const { orderedIds } = await req.json(); // Array of service IDs in desired order

    if (!Array.isArray(orderedIds)) {
        return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const services = await getServices();

    // Create a map for quick lookup
    const serviceMap = new Map(services.map(s => [s.id, s]));

    // Reconstruct the array based on orderedIds, keeping any missing ones at the end
    const reorderedServices: import("@/types/monitoring").Service[] = [];

    // Add services in the new order
    orderedIds.forEach((id, index) => {
        const service = serviceMap.get(id);
        if (service) {
            service.order = index; // Update order field
            reorderedServices.push(service);
            serviceMap.delete(id);
        }
    });

    // Append any remaining services that weren't in the orderedIds list
    serviceMap.forEach((service) => {
        service.order = reorderedServices.length; // Append at the end
        reorderedServices.push(service);
    });

    await saveServices(reorderedServices);

    return NextResponse.json({ success: true, services: reorderedServices });
}
