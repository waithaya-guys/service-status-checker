import fs from "fs/promises";
import path from "path";
import { Service, LogEntry, Incident, AppNotification } from "../types/monitoring";

const DATA_DIR = path.join(process.cwd(), "data");
const SERVICES_FILE = path.join(DATA_DIR, "services.json");
const LOGS_FILE = path.join(DATA_DIR, "logs.json");
const INCIDENTS_FILE = path.join(DATA_DIR, "incidents.json");

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

export async function getLogs(): Promise<LogEntry[]> {
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
