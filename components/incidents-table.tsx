"use client";

import { Incident, Service } from "@/types/monitoring";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
    getKeyValue,
    Chip,
    Input,
} from "@heroui/react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { FaSearch } from "react-icons/fa";

interface IncidentsTableProps {
    incidents: Incident[];
    services: Service[];
}

export function IncidentsTable({ incidents, services }: IncidentsTableProps) {
    const [filterValue, setFilterValue] = useState("");

    const hasSearchFilter = Boolean(filterValue);

    const serviceMap = useMemo(() => {
        return services.reduce((acc, service) => {
            acc[service.id] = service.name;
            return acc;
        }, {} as Record<string, string>);
    }, [services]);

    const filteredItems = useMemo(() => {
        let filteredIncidents = [...incidents];

        if (hasSearchFilter) {
            filteredIncidents = filteredIncidents.filter((incident) => {
                const serviceName = serviceMap[incident.serviceId] || "Unknown Service";
                return (
                    serviceName.toLowerCase().includes(filterValue.toLowerCase()) ||
                    incident.description.toLowerCase().includes(filterValue.toLowerCase())
                );
            });
        }

        // Sort by start time desc
        return filteredIncidents.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [incidents, filterValue, serviceMap]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between gap-3 items-end">
                <Input
                    isClearable
                    className="w-full sm:max-w-[44%]"
                    placeholder="Search by service or description..."
                    startContent={<FaSearch />}
                    value={filterValue}
                    onClear={() => setFilterValue("")}
                    onValueChange={setFilterValue}
                />
            </div>
            <Table aria-label="Incidents table">
                <TableHeader>
                    <TableColumn key="status">STATUS</TableColumn>
                    <TableColumn key="service">SERVICE</TableColumn>
                    <TableColumn key="description">DESCRIPTION</TableColumn>
                    <TableColumn key="startTime">START TIME</TableColumn>
                    <TableColumn key="endTime">END TIME</TableColumn>
                    <TableColumn key="duration">DURATION</TableColumn>
                </TableHeader>
                <TableBody items={filteredItems} emptyContent={"No incidents found."}>
                    {(item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <Chip
                                    color={item.endTime ? "success" : "danger"}
                                    variant="flat"
                                    size="sm"
                                >
                                    {item.endTime ? "Resolved" : "Ongoing"}
                                </Chip>
                            </TableCell>
                            <TableCell>
                                {serviceMap[item.serviceId] || item.serviceId}
                            </TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                                {format(new Date(item.startTime), "PP pp")}
                            </TableCell>
                            <TableCell>
                                {item.endTime ? format(new Date(item.endTime), "PP pp") : "-"}
                            </TableCell>
                            <TableCell>
                                {item.duration !== undefined ? `${item.duration}m` : "-"}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
