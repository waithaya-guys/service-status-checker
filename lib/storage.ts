import fs from "fs/promises";
import path from "path";
import { Service, LogEntry, Incident, AppNotification, ServiceStats } from "../types/monitoring";

const DATA_DIR = path.join(process.cwd(), "data");
const SERVICES_FILE = path.join(DATA_DIR, "services.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");
const INCIDENTS_FILE = path.join(DATA_DIR, "incidents.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

async function ensureDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

async function readJson<T>(file: string, defaultValue: T): Promise<T> {
    await ensureDir();
    try {
        const data = await fs.readFile(file, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return default
        return defaultValue;
    }
}

async function writeJson<T>(file: string, data: T): Promise<void> {
    await ensureDir();
    await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

import { encrypt, decrypt } from "./crypto";

// Services
export async function getServices(): Promise<Service[]> {
    const services = await readJson<Service[]>(SERVICES_FILE, []);
    return services.map(service => ({
        ...service,
        url: decrypt(service.url)
    }));
}

export async function saveServices(services: Service[]): Promise<void> {
    const encryptedServices = services.map(service => ({
        ...service,
        url: encrypt(service.url)
    }));
    await writeJson(SERVICES_FILE, encryptedServices);
}

// Logs
// Logs
const LOGS_DIR = path.join(DATA_DIR, "logs");

import { format, subDays } from "date-fns";

export async function getLogsDangerously(): Promise<LogEntry[]> {
    console.warn("getLogsDangerously called! This is a heavy operation.");
    const logs: LogEntry[] = [];
    const today = new Date();

    // Read last 30 days (Oldest to Newest)
    for (let i = 29; i >= 0; i--) {
        const date = subDays(today, i);
        const fileName = `Log_${format(date, "yyyy-MM-dd")}.json`;
        const filePath = path.join(LOGS_DIR, fileName);

        const dayLogs = await readJson<LogEntry[]>(filePath, []);
        logs.push(...dayLogs);
    }

    // Sort logs by timestamp just in case (optional, but good for merging)
    return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function getRecentLogs(hours: number = 24): Promise<LogEntry[]> {
    const logs: LogEntry[] = [];
    const today = new Date();
    // Calculate how many days we need to look back based on hours
    // e.g. 25 hours = today + yesterday
    const daysToLookBack = Math.ceil(hours / 24);

    for (let i = daysToLookBack; i >= 0; i--) {
        const date = subDays(today, i);
        const fileName = `Log_${format(date, "yyyy-MM-dd")}.json`;
        const filePath = path.join(LOGS_DIR, fileName);

        const dayLogs = await readJson<LogEntry[]>(filePath, []);
        logs.push(...dayLogs);
    }

    // Sort and filter strictly by time if needed, but for now date-file granularity is okay-ish to avoid complexity
    // but better to filter strict time to save bandwidth
    const cutOff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return logs.filter(l => new Date(l.timestamp) >= cutOff)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

class Mutex {
    private mutex = Promise.resolve();

    lock(): Promise<() => void> {
        let unlockNext: () => void = () => { };
        const willUnlock = new Promise<void>(resolve => {
            unlockNext = resolve;
        });

        const willAcquire = this.mutex.then(() => unlockNext);

        this.mutex = this.mutex.then(() => willUnlock);

        return willAcquire;
    }

    async dispatch<T>(fn: (() => T | PromiseLike<T>)): Promise<T> {
        const unlock = await this.lock();
        try {
            return await Promise.resolve(fn());
        } finally {
            unlock();
        }
    }
}

const fileLock = new Mutex();

export async function appendLog(log: LogEntry): Promise<void> {
    await fileLock.dispatch(async () => {
        await ensureDir(); // Ensure main data dir
        try {
            await fs.access(LOGS_DIR);
        } catch {
            await fs.mkdir(LOGS_DIR, { recursive: true });
        }

        const today = new Date();
        const fileName = `Log_${format(today, "yyyy-MM-dd")}.json`;
        const filePath = path.join(LOGS_DIR, fileName);

        const logs = await readJson<LogEntry[]>(filePath, []);
        logs.push(log);

        await writeJson(filePath, logs);
    });
}

// Incidents
const INCIDENTS_DIR = path.join(DATA_DIR, "incidents");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");

// ... (existing code)

// Notifications
export async function getNotifications(): Promise<AppNotification[]> {
    return await readJson<AppNotification[]>(NOTIFICATIONS_FILE, []);
}

export async function saveNotification(notification: AppNotification): Promise<void> {
    await ensureDir();
    const notifications = await getNotifications();
    notifications.unshift(notification); // Add to beginning
    // Keep only last 100 notifications
    if (notifications.length > 100) {
        notifications.length = 100;
    }
    await writeJson(NOTIFICATIONS_FILE, notifications);
}

export async function markNotificationRead(id: string): Promise<void> {
    await ensureDir();
    const notifications = await getNotifications();
    const index = notifications.findIndex(n => n.id === id);
    if (index !== -1) {
        notifications[index].read = true;
        await writeJson(NOTIFICATIONS_FILE, notifications);
    }
}

export async function markAllNotificationsRead(): Promise<void> {
    await ensureDir();
    const notifications = await getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    await writeJson(NOTIFICATIONS_FILE, updated);
}

export async function getIncidents(): Promise<Incident[]> {
    await ensureDir();
    try {
        await fs.access(INCIDENTS_DIR);
    } catch {
        // If dir doesn't exist, return empty
        return [];
    }

    const files = await fs.readdir(INCIDENTS_DIR);
    const incidentFiles = files.filter(f => f.startsWith("Incident_") && f.endsWith(".json"));

    const incidents: Incident[] = [];
    for (const file of incidentFiles) {
        const incident = await readJson<Incident>(path.join(INCIDENTS_DIR, file), {} as Incident);
        if (incident.id) incidents.push(incident);
    }

    // Sort by start time descending
    return incidents.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export async function saveIncident(incident: Incident): Promise<void> {
    await ensureDir();
    try {
        await fs.access(INCIDENTS_DIR);
    } catch {
        await fs.mkdir(INCIDENTS_DIR, { recursive: true });
    }

    const filePath = path.join(INCIDENTS_DIR, `Incident_${incident.id}.json`);
    await writeJson(filePath, incident);
}

// Alias for compatibility if needed, but saveIncident is preferred for single updates
export async function saveIncidents(incidents: Incident[]): Promise<void> {
    for (const incident of incidents) {
        await saveIncident(incident);
    }
}

// Optimization Helpers
export async function getLatestLogs(limitPerService: number = 24): Promise<LogEntry[]> {
    // Read only today and yesterday to minimize IO
    const logs: LogEntry[] = [];
    const today = new Date();
    const range = [0, 1]; // Today and Yesterday

    for (const i of range) {
        const date = subDays(today, i);
        const fileName = `Log_${format(date, "yyyy-MM-dd")}.json`;
        const filePath = path.join(LOGS_DIR, fileName);
        const dayLogs = await readJson<LogEntry[]>(filePath, []);
        logs.push(...dayLogs);
    }

    // Sort by timestamp desc
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Group by service and take top N
    const relevantLogs: LogEntry[] = [];
    const services = await getServices();

    for (const service of services) {
        const serviceLogs = logs.filter(l => l.serviceId === service.id).slice(0, limitPerService);
        relevantLogs.push(...serviceLogs);
    }

    // Return chronological order for charts
    return relevantLogs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

import { calculateUptime, getAverageResponseTime } from "./statistics";

// Statistics
export async function getStats(): Promise<ServiceStats> {
    return await readJson<ServiceStats>(STATS_FILE, {});
}

export async function saveStats(stats: ServiceStats): Promise<void> {
    await ensureDir();
    await writeJson(STATS_FILE, stats);
}

export async function getServiceStats(): Promise<Record<string, { uptime: number; avgLatency: number }>> {
    const stats = await getStats();
    const result: Record<string, { uptime: number; avgLatency: number }> = {};
    const services = await getServices();

    // Loop through 30 days
    const now = new Date();
    const daysToCheck: string[] = [];
    for (let i = 0; i < 30; i++) {
        daysToCheck.push(format(subDays(now, i), "yyyy-MM-dd"));
    }

    for (const service of services) {
        const serviceStats = stats[service.id];
        if (!serviceStats || !serviceStats.days) {
            result[service.id] = { uptime: 100, avgLatency: 0 };
            continue;
        }

        let totalUp = 0;
        let totalChecks = 0;
        let totalLatency = 0;
        let latencyCount = 0;

        for (const date of daysToCheck) {
            const dayStat = serviceStats.days[date];
            if (dayStat) {
                totalUp += dayStat.up;
                totalChecks += dayStat.count;
                totalLatency += dayStat.totalLatency;
                latencyCount += dayStat.count; // Assuming every check has latency, otherwise track separately
            }
        }

        const uptime = totalChecks > 0 ? (totalUp / totalChecks) * 100 : 100;
        const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;

        result[service.id] = { uptime, avgLatency };
    }

    return result;
}
