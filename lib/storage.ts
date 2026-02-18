import { Service, LogEntry, Incident, AppNotification, ServiceStats } from "../types/monitoring";
import { query } from "./db";
import { encrypt, decrypt } from "./crypto";
import { format, subDays } from "date-fns";
import * as crypto from "crypto";

// Services
export async function getServices(): Promise<Service[]> {
    const res = await query(`
        SELECT * FROM services ORDER BY order_index ASC
    `);

    return res.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description || "",
        type: row.type,
        url: decrypt(row.url),
        payload: row.payload || "",
        interval: row.interval,
        timeout: row.timeout,
        latencyThreshold: row.latency_threshold,
        isPublic: row.is_public,
        showTarget: row.show_target,
        allowUnauthorized: row.allow_unauthorized,
        authType: row.auth_type,
        authToken: row.auth_token || "",
        order: row.order_index,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    }));
}

export async function saveServices(services: Service[]): Promise<void> {
    // This function is tricky because it usually saves the whole list.
    // Ideally we should update individual services, but for compatibility with existing frontend/logic:
    // We will upsert each service.

    for (const service of services) {
        await query(`
            INSERT INTO services (id, name, description, type, url, payload, "interval", timeout, latency_threshold, is_public, show_target, allow_unauthorized, auth_type, auth_token, order_index, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                type = EXCLUDED.type,
                url = EXCLUDED.url,
                payload = EXCLUDED.payload,
                "interval" = EXCLUDED.interval,
                timeout = EXCLUDED.timeout,
                latency_threshold = EXCLUDED.latency_threshold,
                is_public = EXCLUDED.is_public,
                show_target = EXCLUDED.show_target,
                allow_unauthorized = EXCLUDED.allow_unauthorized,
                auth_type = EXCLUDED.auth_type,
                auth_token = EXCLUDED.auth_token,
                order_index = EXCLUDED.order_index,
                updated_at = NOW()
        `, [
            service.id,
            service.name,
            service.description,
            service.type,
            encrypt(service.url), // Encrypt before saving
            service.payload,
            service.interval,
            service.timeout,
            service.latencyThreshold,
            service.isPublic,
            service.showTarget,
            service.allowUnauthorized,
            service.authType,
            service.authToken,
            (service as any).order // Cast to any to access 'order' property mapping to order_index
        ]);
    }
}

export async function deleteService(id: string): Promise<void> {
    await query(`
        DELETE FROM services WHERE id = $1
    `, [id]);
}

// Logs
export async function getLogsDangerously(): Promise<LogEntry[]> {
    // Limit to last 1000 logs to avoid crashing
    const res = await query(`
        SELECT * FROM logs ORDER BY timestamp DESC LIMIT 1000
    `);

    return res.rows.map(row => ({
        id: row.id,
        serviceId: row.service_id,
        timestamp: row.timestamp.toISOString(),
        status: row.status,
        latency: row.latency,
        message: row.message,
        statusCode: row.status_code
    })).reverse(); // Return oldest to newest to match previous behavior if expected
}

export async function getServiceLogs(serviceId: string, days: number = 30): Promise<LogEntry[]> {
    const res = await query(`
        SELECT * FROM logs 
        WHERE service_id = $1 
        AND timestamp >= NOW() - INTERVAL '${days} days'
        ORDER BY timestamp ASC
    `, [serviceId]);

    return res.rows.map(row => ({
        id: row.id,
        serviceId: row.service_id,
        timestamp: row.timestamp.toISOString(),
        status: row.status,
        latency: row.latency,
        message: row.message,
        statusCode: row.status_code
    }));
}

export async function getRecentLogs(hours: number = 24): Promise<LogEntry[]> {
    const res = await query(`
        SELECT * FROM logs 
        WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp ASC
    `);

    return res.rows.map(row => ({
        id: row.id,
        serviceId: row.service_id,
        timestamp: row.timestamp.toISOString(),
        status: row.status,
        latency: row.latency,
        message: row.message,
        statusCode: row.status_code
    }));
}

export async function appendLog(log: LogEntry): Promise<void> {
    await query(`
        INSERT INTO logs (id, service_id, timestamp, status, latency, message, status_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
        log.id,
        log.serviceId,
        log.timestamp,
        log.status,
        log.latency,
        log.message,
        log.statusCode
    ]);
}

// Notifications
export async function getNotifications(): Promise<AppNotification[]> {
    const res = await query(`
        SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 100
    `);

    return res.rows.map(row => ({
        id: row.id,
        serviceId: row.service_id,
        type: row.type,
        message: row.message,
        timestamp: row.timestamp.toISOString(),
        read: row.is_read
    }));
}

export async function saveNotification(notification: AppNotification): Promise<void> {
    await query(`
        INSERT INTO notifications (id, service_id, type, message, timestamp, is_read)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, [
        notification.id,
        notification.serviceId,
        notification.type,
        notification.message,
        notification.timestamp,
        notification.read
    ]);
}

export async function markNotificationRead(id: string): Promise<void> {
    await query(`
        UPDATE notifications SET is_read = true WHERE id = $1
    `, [id]);
}

export async function markAllNotificationsRead(): Promise<void> {
    await query(`
        UPDATE notifications SET is_read = true
    `);
}

// Incidents
export async function getIncidents(): Promise<Incident[]> {
    const res = await query(`
        SELECT * FROM incidents ORDER BY start_time DESC
    `);

    return res.rows.map(row => ({
        id: row.id,
        serviceId: row.service_id,
        startTime: row.start_time.toISOString(),
        endTime: row.end_time ? row.end_time.toISOString() : undefined,
        status: row.status,
        description: row.description,
        duration: row.duration
    }));
}

export async function saveIncident(incident: Incident): Promise<void> {
    await query(`
        INSERT INTO incidents (id, service_id, start_time, end_time, status, description, duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
            end_time = EXCLUDED.end_time,
            status = EXCLUDED.status,
            description = EXCLUDED.description,
            duration = EXCLUDED.duration
    `, [
        incident.id,
        incident.serviceId,
        incident.startTime,
        incident.endTime,
        incident.status,
        incident.description,
        incident.duration
    ]);
}

export async function saveIncidents(incidents: Incident[]): Promise<void> {
    for (const incident of incidents) {
        await saveIncident(incident);
    }
}

// Optimization Helpers
export async function getLatestLogs(limitPerService: number = 24): Promise<LogEntry[]> {
    // Use window function to get recent logs for each service
    const res = await query(`
        WITH RankedLogs AS (
            SELECT *,
                ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY timestamp DESC) as rn
            FROM logs
            WHERE timestamp >= NOW() - INTERVAL '2 days'
        )
        SELECT * FROM RankedLogs WHERE rn <= $1 ORDER BY timestamp ASC
    `, [limitPerService]);

    return res.rows.map(row => ({
        id: row.id,
        serviceId: row.service_id,
        timestamp: row.timestamp.toISOString(),
        status: row.status,
        latency: row.latency,
        message: row.message,
        statusCode: row.status_code
    }));
}

// Statistics
export async function getStats(): Promise<ServiceStats> {
    // Reconstruct the ServiceStats object from DB
    // This might be expensive if lots of data, but we filter by recent 30 days usually in frontend logic
    // But the type signature implies returning EVERYTHING.
    // For now, let's fetch last 90 days.

    const res = await query(`
        SELECT * FROM daily_stats 
        WHERE date >= CURRENT_DATE - INTERVAL '90 days'
        ORDER BY date ASC
    `);

    const stats: ServiceStats = {};

    for (const row of res.rows) {
        const serviceId = row.service_id;
        const dateStr = format(row.date, "yyyy-MM-dd");

        if (!stats[serviceId]) {
            stats[serviceId] = { days: {} };
        }

        stats[serviceId].days[dateStr] = {
            date: dateStr,
            up: row.up_count,
            down: row.down_count,
            degraded: row.degraded_count,
            totalLatency: parseInt(row.total_latency),
            count: row.total_count
        };
    }

    return stats;
}

export async function saveStats(stats: ServiceStats): Promise<void> {
    // This is called by monitor.ts to save ALL stats. 
    // But monitor.ts usually updates just one day for one service in a loop (conceptually),
    // but the actual code passes the WHOLE object.

    // Efficiency Note: This is bad pattern for DB. We should expose `updateDailyStat` instead.
    // But to match interface, we iterate.

    // However, the caller `monitor.ts` has been refactored in my mind to update incrementally.
    // If we look at `scripts/monitor.ts`, it calls `saveStats(allStats)`.
    // We should refactor `monitor.ts` to NOT load all stats and save all stats.

    // For now, to be safe and compatible without changing `monitor.ts` logic too much yet (or if we do),
    // we should implementation `saveStats` to upsert.
    // BUT `monitor.ts` fetches `getStats` then adds one, then `saveStats`.
    // We should optimized this.

    // Let's implement a smarter way.
    // We will assume `stats` object contains the latest state.
    // We will iterate and upsert. THIS IS VERY HEAVY.

    // Better approach: Since we are going to update `monitor.ts` anyway, 
    // let's export a specialized function `incrementDailyStat` and use that in `monitor.ts`.
    // But we must stick to the signature of `saveStats` for now if other parts use it.
    // Actually, only `monitor.ts` uses `saveStats`.

    for (const serviceId of Object.keys(stats)) {
        const serviceStats = stats[serviceId];
        for (const date of Object.keys(serviceStats.days)) {
            const dayStat = serviceStats.days[date];
            await query(`
                INSERT INTO daily_stats (service_id, date, up_count, down_count, degraded_count, total_latency, total_count)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (service_id, date) DO UPDATE SET
                    up_count = EXCLUDED.up_count,
                    down_count = EXCLUDED.down_count,
                    degraded_count = EXCLUDED.degraded_count,
                    total_latency = EXCLUDED.total_latency,
                    total_count = EXCLUDED.total_count
            `, [
                serviceId,
                dayStat.date,
                dayStat.up,
                dayStat.down,
                dayStat.degraded,
                dayStat.totalLatency,
                dayStat.count
            ]);
        }
    }
}

export async function getServiceStats(): Promise<Record<string, { uptime: number; avgLatency: number }>> {
    const res = await query(`
        SELECT 
            service_id,
            SUM(up_count) as total_up,
            SUM(total_count) as total_checks,
            SUM(total_latency) as total_latency_sum,
            SUM(CASE WHEN total_count > 0 THEN total_count ELSE 0 END) as latency_count 
        FROM daily_stats
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY service_id
    `);

    const result: Record<string, { uptime: number; avgLatency: number }> = {};
    const services = await getServices();

    // Initialize all with 100% uptime (default)
    for (const service of services) {
        result[service.id] = { uptime: 100, avgLatency: 0 };
    }

    for (const row of res.rows) {
        const totalChecks = parseInt(row.total_checks);
        const totalUp = parseInt(row.total_up);
        const totalLatency = parseInt(row.total_latency_sum);

        const uptime = totalChecks > 0 ? (totalUp / totalChecks) * 100 : 100;
        const avgLatency = totalChecks > 0 ? Math.round(totalLatency / totalChecks) : 0;

        result[row.service_id] = { uptime, avgLatency };
    }

    return result;
}

// New helper for monitor to avoid full fetch-save cycle
export async function updateDailyStat(
    serviceId: string,
    date: string,
    increment: { up: number, down: number, degraded: number, latency: number, count: number }
): Promise<void> {
    await query(`
        INSERT INTO daily_stats (service_id, date, up_count, down_count, degraded_count, total_latency, total_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (service_id, date) DO UPDATE SET
            up_count = daily_stats.up_count + EXCLUDED.up_count,
            down_count = daily_stats.down_count + EXCLUDED.down_count,
            degraded_count = daily_stats.degraded_count + EXCLUDED.degraded_count,
            total_latency = daily_stats.total_latency + EXCLUDED.total_latency,
            total_count = daily_stats.total_count + EXCLUDED.total_count
    `, [
        serviceId,
        date,
        increment.up,
        increment.down,
        increment.degraded,
        increment.latency,
        increment.count
    ]);
}

