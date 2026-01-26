"use client";

import { Incident, Service } from "@/types/monitoring";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { FaEdit } from "react-icons/fa";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";

interface IncidentsManagerProps {
    incidents: Incident[];
    services: Service[];
}

export function IncidentsManager({ incidents: initialIncidents, services }: IncidentsManagerProps) {
    const [incidents, setIncidents] = useState(initialIncidents);
    const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<{
        description: string;
        cause: string;
        status: string;
    }>({ description: "", cause: "", status: "DOWN" });

    const handleEdit = (incident: Incident) => {
        setEditingIncident(incident);
        setFormData({
            description: incident.description,
            cause: incident.cause || "",
            status: incident.status,
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!editingIncident) return;

        try {
            const res = await fetch(`/api/incidents/${editingIncident.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: formData.description,
                    cause: formData.cause,
                    status: formData.status,
                }),
            });

            if (res.ok) {
                const updatedIncident = await res.json();
                setIncidents((prev) =>
                    prev.map((inc) => (inc.id === updatedIncident.id ? updatedIncident : inc))
                );
                setIsModalOpen(false);
                addToast({
                    title: "Success",
                    description: "Incident updated successfully",
                    color: "success",
                    variant: "flat"
                });
            } else {
                addToast({
                    title: "Error",
                    description: "Failed to update incident",
                    color: "danger",
                    variant: "flat"
                });
            }
        } catch (error) {
            console.error("Error updating incident:", error);
            alert("Error updating incident");
        }
    };

    const getServiceName = (id: string) => {
        return services.find(s => s.id === id)?.name || "Unknown Service";
    };

    const statusColorMap: Record<string, "success" | "warning" | "danger"> = {
        UP: "success",
        DEGRADED: "warning",
        DOWN: "danger",
    };

    return (
        <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold">Incident History</h2>

            <div className="border border-default-200 rounded-xl overflow-hidden shadow-sm bg-content1">
                <Table aria-label="Incident History">
                    <TableHeader>
                        <TableColumn>Service</TableColumn>
                        <TableColumn>Starts At</TableColumn>
                        <TableColumn>Duration</TableColumn>
                        <TableColumn>Status</TableColumn>
                        <TableColumn>Cause / Description</TableColumn>
                        <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent={"No incidents found."}>
                        {incidents.map((incident) => (
                            <TableRow key={incident.id} className="hover:bg-default-100 transition-colors">
                                <TableCell className="font-medium">{getServiceName(incident.serviceId)}</TableCell>
                                <TableCell className="text-sm">{format(new Date(incident.startTime), "dd MMM yyyy HH:mm")}</TableCell>
                                <TableCell className="text-sm">{incident.duration !== undefined ? `${incident.duration}m` : "Ongoing"}</TableCell>
                                <TableCell>
                                    <Chip size="sm" color={statusColorMap[incident.status] || "default"} variant="flat">
                                        {incident.status}
                                    </Chip>
                                </TableCell>
                                <TableCell className="text-sm max-w-xs truncate">
                                    <div className="flex flex-col">
                                        {incident.cause && <span className="font-semibold text-primary">{incident.cause}</span>}
                                        <span className="text-default-500 truncate">{incident.description}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(incident)}>
                                        <FaEdit />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} size="lg" backdrop="blur">
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Edit Incident</ModalHeader>
                            <ModalBody className="gap-4">
                                <Select
                                    label="Status"
                                    selectedKeys={[formData.status]}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <SelectItem key="DOWN">DOWN</SelectItem>
                                    <SelectItem key="DEGRADED">DEGRADED</SelectItem>
                                    <SelectItem key="UP">UP</SelectItem>
                                </Select>

                                <Input
                                    label="Root Cause"
                                    placeholder="e.g. Network Failure, Server Maintenance"
                                    value={formData.cause}
                                    onValueChange={(val) => setFormData({ ...formData, cause: val })}
                                />

                                <Textarea
                                    label="Description"
                                    placeholder="Incident details..."
                                    value={formData.description}
                                    onValueChange={(val) => setFormData({ ...formData, description: val })}
                                />
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button color="primary" onPress={handleSave}>
                                    Save Changes
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
