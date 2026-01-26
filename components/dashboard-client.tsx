"use client";

import { Service, LogEntry, Incident } from "@/types/monitoring";
import { ServiceCard } from "@/components/service-card";
import { ServiceDialog } from "@/components/service-dialog";
import { useState, useEffect } from "react";

interface DashboardClientProps {
    services: Service[];
    logs: LogEntry[];
    incidents: Incident[];
}

export function DashboardClient({ services: initialServices, logs: initialLogs, incidents: initialIncidents }: DashboardClientProps) {
    const [services, setServices] = useState<Service[]>(initialServices);
    const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
    const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [stats, setStats] = useState<Record<string, { uptime: number; avgLatency: number }>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/status");
                if (res.ok) {
                    const data = await res.json();
                    setServices(data.services);
                    setLogs(data.logs);
                    setIncidents(data.incidents);
                    setStats(data.stats);
                }
            } catch (error) {
                console.error("Failed to fetch updates:", error);
            }
        };

        const interval = setInterval(fetchData, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const handleCardClick = (service: Service) => {
        setSelectedService(service);
    };

    const handleClose = () => {
        setSelectedService(null);
    };

    return (
        <>
            <div className="flex justify-end gap-4 mb-0 text-small">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success"></div>
                    <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-warning"></div>
                    <span>Degraded</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-danger"></div>
                    <span>Outage</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {services.map((service) => (
                    <ServiceCard
                        key={service.id}
                        service={{
                            ...service,
                            incidents: incidents.filter(i => i.serviceId === service.id)
                        }}
                        logs={logs.filter((log) => log.serviceId === service.id)}
                        stats={stats[service.id]}
                        onClick={handleCardClick}
                    />
                ))}
                {services.length === 0 && (
                    <p>No services found.</p>
                )}
            </div>

            <ServiceDialog
                isOpen={!!selectedService}
                onClose={handleClose}
                service={selectedService}
                initialIncidents={selectedService ? incidents.filter(i => i.serviceId === selectedService.id) : []}
            />
        </>
    );
}
