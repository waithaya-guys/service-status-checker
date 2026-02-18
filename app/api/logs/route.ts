import { NextRequest, NextResponse } from "next/server";
import { getLogsDangerously, getServiceLogs } from "@/lib/storage";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const serviceId = searchParams.get("serviceId");

    if (serviceId) {
        const serviceLogs = await getServiceLogs(serviceId);
        return NextResponse.json(serviceLogs);
    }

    const allLogs = await getLogsDangerously();
    return NextResponse.json(allLogs);
}
