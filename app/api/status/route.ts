import { NextResponse } from "next/server";
import { getServices, getLatestLogs, getIncidents, getServiceStats } from "@/lib/storage";

export const dynamic = 'force-dynamic';

export async function GET() {
    // Fetch critical data in parallel
    const [services, latestLogs, incidents, stats] = await Promise.all([
        getServices(),
        getLatestLogs(50), // 50 logs per service for sparklines
        getIncidents(),
        getServiceStats()
    ]);

    const sanitizedServices = services.map(service => ({
        ...service,
        url: service.showTarget === false ? "Target Hidden" : service.url,
        payload: service.showTarget === false ? undefined : service.payload
    }));

    return NextResponse.json({
        services: sanitizedServices,
        logs: latestLogs, // Renamed to keep frontend compatible or we can rename to latestLogs
        incidents,
        stats
    });
}
