
import { Service, LogEntry } from "@/types/monitoring";
import axios from "axios";
import ping from "ping";
import { Client } from "pg";
import * as net from "net";

// @ts-ignore
import oracledb from "oracledb";

// Enable Thin mode (no local Oracle client required)
try {
    oracledb.initOracleClient({ libDir: undefined });
} catch (err) {
    // Ignore error if already initialized or not needed for thin mode in ver 6+
}

export async function checkHttp(service: Service): Promise<Partial<LogEntry>> {
    const start = Date.now();
    try {
        let response;
        const config: any = { timeout: service.timeout || 5000 };

        // Add Authentication Headers
        if (service.authType === 'bearer' && service.authToken) {
            config.headers = {
                ...config.headers,
                'Authorization': `Bearer ${service.authToken}`
            };
        }

        if (service.type === 'http-post' || service.type === 'https-post') {
            const payload = service.payload ? JSON.parse(service.payload) : {};
            response = await axios.post(service.url, payload, config);
        } else {
            response = await axios.get(service.url, config);
        }

        const latency = Date.now() - start;

        let status: "UP" | "DOWN" = "DOWN";
        if (response.status >= 200 && response.status < 300) {
            status = "UP";
        } else if (service.allowUnauthorized && response.status === 401) {
            status = "UP";
        }

        return {
            status,
            latency,
            statusCode: response.status,
            message: response.statusText,
        };
    } catch (error: any) {
        // Handle specific status codes that might be thrown as errors by axios
        const status = error.response?.status || 0;
        let serviceStatus: "UP" | "DOWN" = "DOWN";

        if (service.allowUnauthorized && status === 401) {
            serviceStatus = "UP";
        }

        return {
            status: serviceStatus,
            latency: Date.now() - start,
            statusCode: status,
            message: error.message,
        };
    }
}

export async function checkPing(service: Service): Promise<Partial<LogEntry>> {
    try {
        const timeoutSeconds = (service.timeout || 5000) / 1000;
        const res = await ping.promise.probe(service.url, { timeout: timeoutSeconds });
        // Safe handling for time which can be 'unknown' string or number
        let latency = 0;
        const time = res.time as any;
        if (time !== "unknown" && typeof time === 'number') {
            latency = time;
        }

        return {
            status: res.alive ? "UP" : "DOWN",
            latency: latency,
            message: res.output,
        };
    } catch (e: any) {
        return {
            status: "DOWN",
            latency: 0,
            message: e.message,
        };
    }
}

export async function checkPostgres(service: Service): Promise<Partial<LogEntry>> {
    const start = Date.now();
    const client = new Client({
        connectionString: service.url,
        connectionTimeoutMillis: service.timeout || 5000,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        await client.query("SELECT 1");
        await client.end();
        return {
            status: "UP",
            latency: Date.now() - start,
            message: "Connected",
        };
    } catch (error: any) {
        return {
            status: "DOWN",
            latency: Date.now() - start,
            message: error.message,
        };
    }
}

export async function checkOracle(service: Service): Promise<Partial<LogEntry>> {
    const start = Date.now();
    let connection;
    try {
        // Parse connection string logic
        let config: oracledb.ConnectionAttributes = {};

        // Simple parser for the .NET style connection string
        if (service.url.includes("Data Source=") || service.url.includes("User Id=")) {
            const parts = service.url.split(';');
            for (const part of parts) {
                const [key, ...valParts] = part.split('=');
                if (!key) continue;
                const val = valParts.join('=');
                const trimKey = key.trim().toLowerCase();

                if (trimKey === 'data source') config.connectString = val.trim();
                else if (trimKey === 'user id') config.user = val.trim();
                else if (trimKey === 'password') config.password = val.trim();
            }
        } else {
            config.connectString = service.url;
        }

        if (!config.connectString || !config.user || !config.password) {
            if (!config.connectString && !config.user) {
                return { status: "DOWN", message: "Invalid Connection String. Require: Data Source=...;User Id=...;Password=..." };
            }
        }

        connection = await oracledb.getConnection(config);
        await connection.execute("SELECT 1 FROM DUAL");

        const latency = Date.now() - start;
        return {
            status: "UP",
            latency,
            message: "Oracle Connected",
        };

    } catch (error: any) {
        return {
            status: "DOWN",
            latency: Date.now() - start,
            message: error.message,
        };
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing oracle connection:", err);
            }
        }
    }
}

export async function checkTcp(service: Service): Promise<Partial<LogEntry>> {
    const start = Date.now();
    return new Promise((resolve) => {
        const [host, portStr] = service.url.split(":");
        const port = parseInt(portStr);

        if (!host || isNaN(port)) {
            resolve({
                status: "DOWN",
                latency: 0,
                message: "Invalid Host:Port format",
            });
            return;
        }

        const socket = new net.Socket();
        socket.setTimeout(service.timeout || 5000);

        socket.on("connect", () => {
            const latency = Date.now() - start;
            socket.destroy();
            resolve({
                status: "UP",
                latency,
                message: "Connection successful",
            });
        });

        socket.on("timeout", () => {
            socket.destroy();
            resolve({
                status: "DOWN",
                latency: 5000,
                message: "Connection timed out",
            });
        });

        socket.on("error", (err) => {
            socket.destroy();
            resolve({
                status: "DOWN",
                latency: Date.now() - start,
                message: err.message,
            });
        });

        socket.connect(port, host);
    });
}
