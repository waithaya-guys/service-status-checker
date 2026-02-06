import { Service, LogEntry, Incident, AppNotification } from "../types/monitoring";
import { getServices, appendLog, getIncidents, saveIncident, saveNotification, getStats, saveStats } from "../lib/storage";
import { format } from "date-fns";
import { checkHttp, checkPing, checkPostgres, checkOracle, checkTcp } from "../lib/checker";
import dotenv from "dotenv";
import path from "path";
import { differenceInMinutes } from "date-fns";
import * as crypto from "crypto";
import fs from "fs";

// Load environment variables with priority: .env.local > .env.production > .env
const envFiles = ["../.env.local", "../.env.production", "../.env"];

for (const envFile of envFiles) {
    const envPath = path.resolve(__dirname, envFile);
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
    }
}

// Helper to wait
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// State management
const activeIncidents = new Map<string, Incident>(); // serviceId -> Incident
const serviceLastRun = new Map<string, number>(); // serviceId -> timestamp (ms)
const serviceChecksInProgress = new Set<string>(); // serviceId

function sanitizeMessage(message: string | undefined, hideTarget: boolean | undefined): string {
    if (!message) return "";

    // 1. Always redact credentials in connection strings
    // Matches schema://user:pass@host
    message = message.replace(/([a-zA-Z0-9+]+:\/\/[^:]+):([^@]+)@/g, '$1:*****@');
    // Matches key=value pairs in typical DB connection strings
    message = message.replace(/(password|pwd|user|uid)=([^;]+)/gi, '$1=*****');

    if (hideTarget) {
        // 2. Redact IPv4 addresses
        message = message.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]');

        // 3. Redact URLs
        message = message.replace(/https?:\/\/[^\s]+/g, '[REDACTED_URL]');
    }

    return message;
}

async function loadActiveIncidents() {
    const allIncidents = await getIncidents();

    // Find incidents that don't have an endTime
    for (const incident of allIncidents) {
        if (!incident.endTime && incident.serviceId) {
            // Check if we already have a newer active incident for this service
            if (!activeIncidents.has(incident.serviceId)) {
                activeIncidents.set(incident.serviceId, incident);
            }
        }
    }
}

async function performCheck(service: Service) {
    // Prevent overlapping checks for the same service
    if (serviceChecksInProgress.has(service.id)) {
        return;
    }

    serviceChecksInProgress.add(service.id);
    console.log(`Checking ${service.name} (${service.type})...`);

    try {
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

        let currentStatus = result.status!;

        // Handle High Latency Degradation
        if (currentStatus === "UP" && service.latencyThreshold && service.latencyThreshold > 0) {
            if ((result.latency || 0) > service.latencyThreshold) {
                result.status = "DEGRADED";
                currentStatus = "DEGRADED"; // Update local variable so log reflects this
                result.message = result.message
                    ? `${result.message} (High Latency: ${result.latency}ms)`
                    : `High Latency: ${result.latency}ms > ${service.latencyThreshold}ms`;
            }
        }

        // Sanitize message
        result.message = sanitizeMessage(result.message, service.showTarget === false);

        const now = new Date();

        // Incident Management
        if (currentStatus === "DOWN") {
            if (!activeIncidents.has(service.id)) {
                // Start new incident
                const newIncident: Incident = {
                    id: crypto.randomUUID(),
                    serviceId: service.id,
                    startTime: now.toISOString(),
                    status: "DOWN",
                    description: result.message || "Service Down",
                };
                activeIncidents.set(service.id, newIncident);
                await saveIncident(newIncident);
                console.log(`[INCIDENT STARTED] ${service.name} is DOWN.`);

                // Send Notification
                const notification: AppNotification = {
                    id: crypto.randomUUID(),
                    type: "DOWN",
                    message: `Service ${service.name} is DOWN: ${result.message || "Unknown error"}`,
                    timestamp: now.toISOString(),
                    read: false,
                    serviceId: service.id
                };
                await saveNotification(notification);
            }
        } else if (currentStatus === "UP" || currentStatus === "DEGRADED") {
            if (activeIncidents.has(service.id)) {
                // Resolve incident
                const incident = activeIncidents.get(service.id)!;
                incident.endTime = now.toISOString();
                incident.duration = differenceInMinutes(now, new Date(incident.startTime));
                incident.status = "UP"; // Close incident as UP even if currently degraded (issues are separate)

                console.log(`[DEBUG] resolving incident ${incident.id} for service ${service.name}`);
                await saveIncident(incident);
                activeIncidents.delete(service.id);
                console.log(`[INCIDENT RESOLVED] ${service.name} is UP. Duration: ${incident.duration} mins.`);

                // Send Notification
                const notification: AppNotification = {
                    id: crypto.randomUUID(),
                    type: "UP",
                    message: `Service ${service.name} is UP. Duration: ${incident.duration} mins.`,
                    timestamp: now.toISOString(),
                    read: false,
                    serviceId: service.id
                };
                await saveNotification(notification);
            }
        }

        const log: LogEntry = {
            id: crypto.randomUUID(),
            serviceId: service.id,
            timestamp: now.toISOString(),
            status: currentStatus,
            latency: result.latency || 0,
            statusCode: result.statusCode,
            message: result.message,
        };

        await appendLog(log);

        // Update Daily Stats
        try {
            const todayDate = format(now, "yyyy-MM-dd");
            const allStats = await getStats();

            if (!allStats[service.id]) {
                allStats[service.id] = { days: {} };
            }

            if (!allStats[service.id].days[todayDate]) {
                allStats[service.id].days[todayDate] = {
                    date: todayDate,
                    up: 0,
                    down: 0,
                    degraded: 0,
                    totalLatency: 0,
                    count: 0
                };
            }

            const dayStat = allStats[service.id].days[todayDate];
            dayStat.count++;
            dayStat.totalLatency += (result.latency || 0);

            if (currentStatus === "UP") dayStat.up++;
            else if (currentStatus === "DOWN") dayStat.down++;
            else if (currentStatus === "DEGRADED") dayStat.degraded++;

            await saveStats(allStats);
        } catch (err) {
            console.error("Failed to update stats:", err);
        }

        let statusColor = "\x1b[31mDOWN\x1b[0m"; // Red
        if (log.status === "UP") statusColor = "\x1b[32mUP\x1b[0m"; // Green
        else if (log.status === "DEGRADED") statusColor = "\x1b[33mDEGRADED\x1b[0m"; // Yellow

        console.log(`Saved log for ${service.name}: ${statusColor} ${log.status === "DOWN" && log.message ? `(${log.message})` : ""}`);

    } catch (err) {
        console.error(`Error checking service ${service.name}:`, err);
    } finally {
        serviceChecksInProgress.delete(service.id);
        serviceLastRun.set(service.id, Date.now());
    }
}

async function monitor() {
    console.log("Starting monitoring service...");
    await loadActiveIncidents();

    let services: Service[] = [];
    let lastServiceLoad = 0;
    const SERVICE_REFRESH_INTERVAL = 60000; // Reload services list every 60s

    while (true) {
        const now = Date.now();

        // Refresh services list periodically
        if (now - lastServiceLoad > SERVICE_REFRESH_INTERVAL) {
            try {
                // console.log("Refreshing services list...");
                services = await getServices();
                lastServiceLoad = now;
            } catch (err) {
                console.error("Failed to load services:", err);
            }
        }

        // Check if any service needs to be run
        for (const service of services) {
            const lastRun = serviceLastRun.get(service.id) || 0;
            // service.interval is in seconds, convert to ms
            const intervalMs = (service.interval || 60) * 1000;

            if (now - lastRun >= intervalMs) {
                // Run check asynchronously - do NOT await here
                performCheck(service);
            }
        }

        // Small delay to prevent CPU spinning
        await delay(1000);
    }
}

// Run if called directly
if (require.main === module) {
    monitor().catch(console.error);
}
