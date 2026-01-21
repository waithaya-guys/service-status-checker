"use client";

import { Service, LogEntry } from "@/types/monitoring";
import { Card, CardHeader, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { calculateUptime, getAverageResponseTime } from "@/lib/statistics";
import { FaCheckCircle, FaExclamationCircle, FaArrowRight, FaGlobe, FaNetworkWired, FaAppStoreIos } from "react-icons/fa";
import { SiPostgresql, SiOracle } from "react-icons/si";

interface ServiceCardProps {
    service: Service;
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
    const isUp = latestLog?.status === "UP";
    const uptime = calculateUptime(logs);
    const avgResponse = getAverageResponseTime(logs);

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
                <Chip
                    color={isUp ? "success" : "danger"}
                    variant="flat"
                    startContent={isUp ? <FaCheckCircle size={14} /> : <FaExclamationCircle size={14} />}
                >
                    {isUp ? "Operational" : "Downtime"}
                </Chip>
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
                <div className="flex justify-end mt-4 text-primary text-small items-center gap-1 group-hover:gap-2 transition-all">
                    Details <FaArrowRight />
                </div>
            </CardBody>
        </Card>
    );
}
