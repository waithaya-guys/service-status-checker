
import { getLogsDangerously, saveStats, getServices } from "../lib/storage";
import { format } from "date-fns";
import { DailyStats, ServiceStats } from "../types/monitoring";

async function migrate() {
    console.log("Starting migration of logs to stats.json...");
    console.time("Migration");

    const services = await getServices();
    const serviceIds = new Set(services.map(s => s.id));

    // 1. Load ALL logs (Warning: This will be heavy, but it's a one-time script)
    // We can't use getLogsDangerously() blindly if it crashes memory, but for now let's hope it fits
    // or we should iterate file by file. 
    // Actually, getLogsDangerously reads ALL files. If the user already has 17GB issue, running this might crash.
    // BETTER APPROACH: Read file by file manually here to avoid loading all at once.

    // But wait, lib/storage.ts export getLogsDangerously which loads everything.
    // I should implement a "stream" or "day by day" processing here.

    const stats: ServiceStats = {};
    const fs = require('fs/promises');
    const path = require('path');

    const DATA_DIR = path.join(process.cwd(), "data");
    const LOGS_DIR = path.join(DATA_DIR, "logs");

    try {
        const files = await fs.readdir(LOGS_DIR);
        const logFiles = files.filter((f: string) => f.startsWith("Log_") && f.endsWith(".json"));

        console.log(`Found ${logFiles.length} log files to process.`);

        for (const file of logFiles) {
            // Extract date from filename Log_YYYY-MM-DD.json
            const dateStr = file.replace("Log_", "").replace(".json", "");
            console.log(`Processing ${dateStr}...`);

            const filePath = path.join(LOGS_DIR, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const logs = JSON.parse(content);

            for (const log of logs) {
                if (!serviceIds.has(log.serviceId)) continue;

                if (!stats[log.serviceId]) {
                    stats[log.serviceId] = { days: {} };
                }

                // We rely on the file date, but let's trust log.timestamp for accuracy if needed
                // But for aggregation, using the file's date is faster/easier grouping if logs are rotated correctly.
                // However, logs might contain mixed dates if not rotated perfectly? 
                // Standard storage writes to Log_YYYY-MM-DD.json based on today's date.

                const logDate = dateStr; // Close enough

                if (!stats[log.serviceId].days[logDate]) {
                    stats[log.serviceId].days[logDate] = {
                        date: logDate,
                        up: 0,
                        down: 0,
                        degraded: 0,
                        totalLatency: 0,
                        count: 0
                    };
                }

                const dayStat = stats[log.serviceId].days[logDate];
                dayStat.count++;
                dayStat.totalLatency += (log.latency || 0);

                if (log.status === "UP") dayStat.up++;
                else if (log.status === "DOWN") dayStat.down++;
                else if (log.status === "DEGRADED") dayStat.degraded++;
            }

            // Optional: garbage collect?
        }

        await saveStats(stats);
        console.log("Migration completed successfully.");
        console.timeEnd("Migration");

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

migrate();
