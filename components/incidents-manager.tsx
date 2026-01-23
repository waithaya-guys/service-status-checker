"use client";

import { Incident, Service } from "@/types/monitoring";
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { FaEdit } from "react-icons/fa";
import { Chip } from "@heroui/chip";

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
            } else {
                alert("Failed to update incident");
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
                <table className="w-full text-left border-collapse">
                    <thead className="bg-default-100 text-default-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="p-3">Service</th>
                            <th className="p-3">Starts At</th>
                            <th className="p-3">Duration</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Cause / Description</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-default-200">
                        {incidents.map((incident) => (
                            <tr key={incident.id} className="hover:bg-default-100 transition-colors">
                                <td className="p-3 font-medium">{getServiceName(incident.serviceId)}</td>
                                <td className="p-3 text-sm">{format(new Date(incident.startTime), "dd MMM yyyy HH:mm")}</td>
                                <td className="p-3 text-sm">{incident.duration ? `${incident.duration}m` : "Ongoing"}</td>
                                <td className="p-3">
                                    <Chip size="sm" color={statusColorMap[incident.status] || "default"} variant="flat">
                                        {incident.status}
                                    </Chip>
                                </td>
                                <td className="p-3 text-sm max-w-xs truncate">
                                    <div className="flex flex-col">
                                        {incident.cause && <span className="font-semibold text-primary">{incident.cause}</span>}
                                        <span className="text-default-500 truncate">{incident.description}</span>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(incident)}>
                                        <FaEdit />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
