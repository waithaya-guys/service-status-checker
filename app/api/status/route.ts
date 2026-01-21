import { NextResponse } from "next/server";
import { getServices, getLogs, getIncidents } from "@/lib/storage";

export const dynamic = 'force-dynamic';

export async function GET() {
    const services = await getServices();
    const logs = await getLogs();
    const incidents = await getIncidents();

    const sanitizedServices = services.map(service => ({
        ...service,
        url: service.showTarget === false ? "Target Hidden" : service.url,
        // Optional: Hide payload as well if target is hidden
        payload: service.showTarget === false ? undefined : service.payload
    }));

    return NextResponse.json({ services: sanitizedServices, logs, incidents });
}
