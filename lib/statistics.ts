import { LogEntry } from "@/types/monitoring";
import { startOfDay, subDays, addDays, format, isSameDay } from "date-fns";

export interface DayStatus {
    date: string;
    status: "up" | "down" | "degraded" | "empty";
    count: number;
}

export function calculateUptime(logs: LogEntry[], days = 30): number {
    if (logs.length === 0) return 100;

    const now = new Date();
    // Start of the period (30 days ago)
    const startTime = startOfDay(subDays(now, days - 1));

    const relevantLogs = logs.filter(
        (log) => new Date(log.timestamp) >= startTime
    );

    if (relevantLogs.length === 0) return 100;

    const totalChecks = relevantLogs.length;
    const upChecks = relevantLogs.filter((log) => log.status === "UP" || log.status === "DEGRADED").length;

    return (upChecks / totalChecks) * 100;
}

export function getStatusTimeline(logs: LogEntry[], days = 30): DayStatus[] {
    const timeline: DayStatus[] = [];
    const now = new Date();
    const today = startOfDay(now);

    for (let i = days - 1; i >= 0; i--) {
        const currentDayStart = subDays(today, i);
        const nextDayStart = addDays(currentDayStart, 1);

        const dayLogs = logs.filter((log) => {
            const logDate = new Date(log.timestamp);
            return logDate >= currentDayStart && logDate < nextDayStart;
        });

        let status: DayStatus["status"] = "empty";
        if (dayLogs.length > 0) {
            const downCount = dayLogs.filter((log) => log.status === "DOWN").length;
            const totalCount = dayLogs.length;

            if (downCount === totalCount) status = "down"; // All down = Red
            else if (downCount > 0) status = "degraded"; // Partial down = Orange
            else status = "up"; // All up = Green
        }

        timeline.push({
            date: format(currentDayStart, "yyyy-MM-dd"),
            status,
            count: dayLogs.length
        });
    }

    return timeline;
}

export function getAverageResponseTime(logs: LogEntry[]): number {
    if (logs.length === 0) return 0;
    const total = logs.reduce((acc, log) => acc + log.latency, 0);
    return Math.round(total / logs.length);
}
