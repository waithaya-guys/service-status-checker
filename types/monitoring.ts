export type MonitorType = "http" | "https" | "http-post" | "https-post" | "ping" | "postgres" | "oracle" | "tcp";

export interface Service {
    id: string;
    name: string;
    description?: string;
    type: MonitorType;
    url: string; // Connection string, URL, or IP
    payload?: string; // Body for POST requests
    interval: number; // Seconds
    timeout?: number; // Milliseconds (default 5000)
    isPublic: boolean;
    showTarget?: boolean; // Whether to show URL/IP to public
    latencyThreshold?: number; // Threshold in ms for DEGRADED status
    order?: number; // Display order
    createdAt: string;
    updatedAt: string;
}

export type ServiceStatus = "UP" | "DOWN" | "DEGRADED";

export interface LogEntry {
    id: string;
    serviceId: string;
    timestamp: string;
    status: ServiceStatus;
    latency: number; // ms
    statusCode?: number;
    message?: string;
}

export interface Incident {
    id: string;
    serviceId: string;
    startTime: string;
    endTime?: string;
    status: ServiceStatus;
    description: string;
    cause?: string; // Root cause or explanation
    duration?: number; // Duration in minutes
}

export interface AppNotification {
    id: string;
    type: "DOWN" | "UP" | "INFO";
    message: string;
    timestamp: string;
    read: boolean;
    serviceId?: string;
}

export interface ServiceStats {
    serviceId: string;
    uptime: number;
    avgLatency: number;
}
