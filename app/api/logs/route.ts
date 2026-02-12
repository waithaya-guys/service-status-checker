import { NextRequest, NextResponse } from "next/server";
import { getLogsDangerously } from "@/lib/storage";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const serviceId = searchParams.get("serviceId");

    const allLogs = await getLogsDangerously();

    if (serviceId) {
        const serviceLogs = allLogs.filter(l => l.serviceId === serviceId);
        return NextResponse.json(serviceLogs);
    }

    return NextResponse.json(allLogs);
}
