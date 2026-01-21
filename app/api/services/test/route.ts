
import { NextRequest, NextResponse } from "next/server";
import { Service, LogEntry } from "@/types/monitoring";
import { checkHttp, checkPing, checkPostgres, checkOracle, checkTcp } from "@/lib/checker";

export async function POST(req: NextRequest) {
    try {
        const service: Service = await req.json();

        let result: Partial<LogEntry> = { status: "DOWN", latency: 0 };

        try {
            switch (service.type) {
                case "http":
                case "https":
                case "http-post":
                case "https-post":
                    result = await checkHttp(service);
                    break;
                case "ping":
                    result = await checkPing(service);
                    break;
                case "tcp":
                    result = await checkTcp(service);
                    break;
                case "postgres":
                    result = await checkPostgres(service);
                    break;
                case "oracle":
                    result = await checkOracle(service);
                    break;
                default:
                    result = { status: "DOWN", message: "Unknown type" };
            }
        } catch (e: any) {
            result = { status: "DOWN", message: e.message };
        }

        return NextResponse.json(result);

    } catch (error) {
        return NextResponse.json(
            { status: "DOWN", message: "Internal server error" },
            { status: 500 }
        );
    }
}
