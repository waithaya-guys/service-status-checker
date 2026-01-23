"use client";

import { Service, LogEntry } from "@/types/monitoring";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Tooltip } from "@heroui/tooltip";
import { calculateUptime, getAverageResponseTime } from "@/lib/statistics";
import { FaCheckCircle, FaExclamationCircle, FaArrowRight, FaGlobe, FaNetworkWired, FaAppStoreIos } from "react-icons/fa";
import { SiPostgresql, SiOracle } from "react-icons/si";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface ServiceCardProps {
    service: Service & { incidents?: any[] };
    logs: LogEntry[];
    onClick: (service: Service) => void;
}

const getServiceIcon = (type: string) => {
    switch (type) {
        case "http":
        case "https":
        case "http-post":
            return <FaGlobe size={24} />;
        case "ping":
        case "tcp":
            return <FaNetworkWired size={24} />;
        case "postgres":
            return <SiPostgresql size={24} />;
        case "oracle":
            return <SiOracle color="Red" size={24} />;
        default:
            return <FaAppStoreIos size={24} />;
    }
};

export function ServiceCard({ service, logs, onClick }: ServiceCardProps) {
    const latestLog = logs[logs.length - 1];

    // Check for active incident first
    const activeIncident = service.incidents?.find(i => !i.endTime);

    // Status logic priority: Active Incident > Latest Log > Default UP
    let status: "UP" | "DOWN" | "DEGRADED" = "UP";
    if (activeIncident) {
        status = activeIncident.status || "DOWN";
    } else if (latestLog) {
        status = latestLog.status;
    }

    const uptime = calculateUptime(logs);
    const avgResponse = getAverageResponseTime(logs);

    // Color/Label Mapping
    let statusColor: "success" | "warning" | "danger" = "success";
    let statusLabel = "Available";
    let statusIcon = <FaCheckCircle size={14} />;

    if (status === "DOWN") {
        statusColor = "danger";
        statusLabel = "Outage";
        statusIcon = <FaExclamationCircle size={14} />;
    } else if (status === "DEGRADED") {
        statusColor = "warning";
        statusLabel = "Degraded";
        statusIcon = <FaExclamationCircle size={14} />;
    }

    let tooltipContent = activeIncident?.description || latestLog?.message || statusLabel;
    if (status === "UP") {
        tooltipContent = `Service Is available (${latestLog?.latency || 0}ms)`;
    }

    return (
        <Card
            className="cursor-pointer hover:border-primary border-2 border-transparent transition-colors"
            isPressable
            onPress={() => onClick(service)}
        >
            <CardHeader className="flex justify-between items-start pb-2">
                <div className="flex gap-3 items-center">
                    <div className="p-2 rounded-lg bg-default-100 text-primary">
                        {getServiceIcon(service.type)}
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-large font-bold">{service.name}</h3>
                        <p className="text-small text-default-500 uppercase font-semibold">{service.type}</p>
                    </div>
                </div>
                <Tooltip content={tooltipContent}>
                    <Chip
                        // className="cursor-help"
                        color={statusColor}
                        variant="flat"
                        startContent={statusIcon}
                    >
                        {statusLabel}
                    </Chip>
                </Tooltip>
            </CardHeader>
            <CardBody className="pt-0">
                <div className="flex justify-between items-end mt-2">
                    <div>
                        <p className="text-small text-default-500">Uptime (30d)</p>
                        <p className={`text-xl font-semibold ${uptime >= 99 ? 'text-success' : 'text-warning'}`}>
                            {uptime.toFixed(2)}%
                        </p>
                    </div>
                    <div>
                        <p className="text-small text-default-500 text-right">Avg. Latency</p>
                        <p className="text-xl font-semibold text-right">{avgResponse}ms</p>
                    </div>
                </div>
                <div className="flex justify-between items-end mt-4">
                    {/* Mini Sparkline Graph */}
                    <div className="w-full h-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={logs.slice(-20)}>
                                <defs>
                                    <linearGradient id={`colorLatency-${service.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={status === "UP" ? "#17c964" : "#f5a524"} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={status === "UP" ? "#17c964" : "#f5a524"} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="latency"
                                    stroke={status === "UP" ? "#17c964" : "#f5a524"}
                                    fillOpacity={1}
                                    fill={`url(#colorLatency-${service.id})`}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex text-primary text-small items-center gap-1 group-hover:gap-2 transition-all">
                        Details <FaArrowRight />
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
