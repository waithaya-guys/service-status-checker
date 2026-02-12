"use client";

import { Service } from "@/types/monitoring";
import { ServiceForm } from "@/components/service-form";
import { Button } from "@heroui/button";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { useState, useEffect } from "react";
import { FaEdit, FaTrash, FaPlus, FaGripVertical } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { Tabs, Tab } from "@heroui/tabs";
import { IncidentsManager } from "./incidents-manager";
import { Incident } from "@/types/monitoring";
import { addToast } from "@heroui/toast";

// Dnd Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AdminClientProps {
    services: Service[];
    incidents: Incident[];
}

// Sortable Row Component
function SortableServiceRow({ service, index, onEdit, onDelete }: {
    service: Service;
    index: number;
    onEdit: (s: Service) => void;
    onDelete: (id: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: service.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as 'relative',
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className="border-b border-default-200 hover:bg-default-100 transition-colors"
        >
            <td className="p-3">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-move p-2 text-default-400 hover:text-default-600 touch-none w-fit"
                >
                    <FaGripVertical />
                </div>
            </td>
            <td className="p-3 font-medium">{service.name}</td>
            <td className="p-3 capitalize">{service.type}</td>
            <td className="p-3 text-sm text-default-500 max-w-xs truncate">{service.url}</td>
            <td className="p-3 text-sm">{service.interval}s</td>
            <td className="p-3">
                <div className="flex gap-2">
                    <Button isIconOnly size="sm" variant="light" onPress={() => onEdit(service)}>
                        <FaEdit />
                    </Button>
                    <Button isIconOnly size="sm" color="danger" variant="light" onPress={() => onDelete(service.id)}>
                        <FaTrash />
                    </Button>
                </div>
            </td>
        </tr>
    );
}

export function AdminClient({ services: initialServices, incidents: initialIncidents }: AdminClientProps) {
    const router = useRouter();
    const [services, setServices] = useState(initialServices);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sync state with props if they change (e.g. from server refresh)
    useEffect(() => {
        setServices(initialServices);
    }, [initialServices]);

    // Sensors for drag detection
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Wait for 5px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleOpenAdd = () => {
        setEditingService(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (service: Service) => {
        setEditingService(service);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setServiceToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);

        try {
            await fetch(`/api/services`, {
                method: 'DELETE',
                body: JSON.stringify({ id: serviceToDelete }),
                headers: { 'Content-Type': 'application/json' }
            });
            addToast({
                title: "Service Deleted",
                description: "The service has been successfully removed.",
                color: "success",
                variant: "flat"
            });
            router.refresh();
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to delete service.",
                color: "danger",
                variant: "flat"
            });
        } finally {
            setIsDeleteModalOpen(false);
            setServiceToDelete(null);
            setIsDeleting(false);
        }
    };

    const handleSubmit = async (data: any) => {
        setIsSaving(true);
        const method = editingService ? 'PUT' : 'POST';
        const body = editingService ? { ...data, id: editingService.id } : data;

        try {
            const res = await fetch('/api/services', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                addToast({
                    title: editingService ? "Service Updated" : "Service Created",
                    description: editingService ? "Service details have been updated." : "New service has been added.",
                    color: "success",
                    variant: "flat"
                });
            } else {
                throw new Error("Failed to save");
            }

            setIsModalOpen(false);
            router.refresh();
        } catch (error) {
            addToast({
                title: "Error",
                description: "Failed to save service details.",
                color: "danger",
                variant: "flat"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setServices((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger API update in background
                const orderedIds = newItems.map(s => s.id);
                fetch('/api/services/reorder', {
                    method: 'POST',
                    body: JSON.stringify({ orderedIds }),
                    headers: { 'Content-Type': 'application/json' }
                }).then(() => {
                    // router.refresh(); // Optional: might cause flicker if we are already optimistic
                });

                return newItems;
            });
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Admin Dashboard</h2>
            </div>

            <Tabs aria-label="Admin Options">
                <Tab key="services" title="Services">
                    <div className="flex flex-col gap-6 pt-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Manage Services</h3>
                            <Button color="primary" startContent={<FaPlus />} onPress={handleOpenAdd}>
                                Add Service
                            </Button>
                        </div>

                        <div className="border border-default-200 rounded-xl overflow-x-auto shadow-sm bg-content1">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <table className="w-full text-left border-collapse min-w-[600px]">
                                    <thead className="bg-default-100 text-default-500 text-xs uppercase font-semibold">
                                        <tr>
                                            <th className="p-3 w-12"></th>
                                            <th className="p-3">Name</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Target</th>
                                            <th className="p-3">Interval</th>
                                            <th className="p-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-default-200">
                                        <SortableContext
                                            items={services.map(s => s.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {services.map((service, index) => (
                                                <SortableServiceRow
                                                    key={service.id}
                                                    service={service}
                                                    index={index}
                                                    onEdit={handleOpenEdit}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </SortableContext>
                                        {services.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-default-400">
                                                    No services found. Click "Add Service" to create one.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </DndContext>
                        </div>
                    </div>
                </Tab>

                <Tab key="incidents" title="Incidents">
                    <IncidentsManager incidents={initialIncidents} services={services} />
                </Tab>
            </Tabs>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                size="2xl"
                backdrop="blur"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>{editingService ? 'Edit Service' : 'Add New Service'}</ModalHeader>
                            <ModalBody className="pb-6">
                                <ServiceForm
                                    initialData={editingService}
                                    onSubmit={handleSubmit}
                                    onCancel={onClose}
                                    isLoading={isSaving}
                                />
                            </ModalBody>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                size="sm"
                backdrop="blur"
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader>Confirm Deletion</ModalHeader>
                            <ModalBody>
                                <p>Are you sure you want to delete this service? This action cannot be undone.</p>
                            </ModalBody>
                            <ModalFooter>
                                <Button variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button color="danger" onPress={confirmDelete} isLoading={isDeleting}>
                                    Delete
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>
        </div>
    );
}
