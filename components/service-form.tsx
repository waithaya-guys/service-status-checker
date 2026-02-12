"use client";

import { Service, MonitorType } from "@/types/monitoring";
import { Input, Textarea } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Checkbox } from "@heroui/checkbox";
import { Button } from "@heroui/button";
import { useState } from "react";
import { FaCheckCircle, FaTimesCircle, FaPlay as Faplay } from "react-icons/fa";
import { LogEntry } from "@/types/monitoring";

interface ServiceFormProps {
    initialData?: Service | null;
    onSubmit: (data: Omit<Service, "id" | "createdAt" | "updatedAt">) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const MONITOR_TYPES: { key: MonitorType; label: string }[] = [
    { key: "http", label: "HTTP/HTTPS (Get)" },
    { key: "http-post", label: "HTTP/HTTPS (Post)" },
    { key: "ping", label: "Ping (IP Address)" },
    { key: "tcp", label: "TCP Port (Host:Port)" },
    { key: "postgres", label: "PostgreSQL Database" },
    { key: "oracle", label: "Oracle Database" },
];

export function ServiceForm({ initialData, onSubmit, onCancel, isLoading }: ServiceFormProps) {
    // Helper to map legacy types to new consolidated types
    const getInitialType = (type?: MonitorType): MonitorType => {
        if (type === 'https') return 'http';
        if (type === 'https-post') return 'http-post';
        return type || 'http';
    };

    const [formData, setFormData] = useState<Partial<Service>>({
        name: initialData?.name || "",
        description: initialData?.description || "",
        type: getInitialType(initialData?.type),
        url: initialData?.url || "",
        payload: initialData?.payload || "",
        interval: initialData?.interval || 60,
        timeout: initialData?.timeout || 5000,
        isPublic: initialData?.isPublic ?? true,
        showTarget: initialData?.showTarget ?? false,
        allowUnauthorized: initialData?.allowUnauthorized ?? false,
        latencyThreshold: initialData?.latencyThreshold || 0,
        authType: initialData?.authType || "none",
        authToken: initialData?.authToken || "",
    });

    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<Partial<LogEntry> | null>(null);

    const handleTestConnection = async () => {
        if (!formData.url || !formData.type) return;
        setIsTesting(true);
        setTestResult(null);

        try {
            const res = await fetch("/api/services/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            setTestResult(data);
        } catch (error) {
            setTestResult({ status: "DOWN", message: "Failed to reach test API" });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name && formData.url && formData.type && formData.interval) {
            // Safe cast as we validate relevant fields
            onSubmit(formData as Omit<Service, "id" | "createdAt" | "updatedAt">);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
                label="Service Name"
                placeholder="e.g. Main Website"
                value={formData.name}
                onValueChange={(val) => setFormData({ ...formData, name: val })}
                isRequired
            />

            <Textarea
                label="Description"
                placeholder="Brief description of the service"
                value={formData.description}
                onValueChange={(val) => setFormData({ ...formData, description: val })}
            />

            <Select
                label="Service Type"
                placeholder="Select a monitor type"
                selectedKeys={formData.type ? [formData.type] : []}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as MonitorType })}
                isRequired
            >
                {MONITOR_TYPES.map((type) => (
                    <SelectItem key={type.key}>
                        {type.label}
                    </SelectItem>
                ))}
            </Select>

            <div>
                <Input
                    label="Target URL/IP/Connection String"
                    placeholder={formData.type === 'ping' ? '127.0.0.1' : 'https://example.com'}
                    value={formData.url}
                    onValueChange={(val) => setFormData({ ...formData, url: val })}
                    isRequired
                // Removed description prop
                />
                <div className="flex justify-start items-center gap-4 mt-2">
                    <Button
                        size="sm"
                        color={testResult?.status === 'UP' ? "success" : "secondary"}
                        variant="flat"
                        isLoading={isTesting}
                        onPress={handleTestConnection}
                        startContent={!isTesting && <Faplay />}
                    >
                        Test Connection
                    </Button>

                    {testResult && (
                        <div className={`flex items-center gap-1 font-bold ${testResult.status === 'UP' ? 'text-success' : 'text-danger'}`}>
                            {testResult.status === 'UP' ? <FaCheckCircle /> : <FaTimesCircle />}
                            <span>{testResult.status === 'UP' ? `Connected (${testResult.latency}ms)` : `Failed: ${testResult.message}`}</span>
                        </div>
                    )}
                </div>
            </div>

            {(formData.type === 'http-post') && (
                <Textarea
                    label="JSON Payload (Body)"
                    placeholder='{"key": "value"}'
                    value={formData.payload}
                    onValueChange={(val) => setFormData({ ...formData, payload: val })}
                />
            )}

            {(formData.type && ['http', 'http-post', 'https', 'https-post'].includes(formData.type) && (
                <div className="flex gap-4">
                    <Select
                        className="flex-1"
                        label="Authentication Type"
                        selectedKeys={formData.authType ? [formData.authType] : ["none"]}
                        onChange={(e) => setFormData({ ...formData, authType: e.target.value as "none" | "bearer" })}
                    >
                        <SelectItem key="none">None</SelectItem>
                        <SelectItem key="bearer">Bearer Token</SelectItem>
                    </Select>

                    {formData.authType === 'bearer' && (
                        <Input
                            className="flex-1"
                            label="Auth Token"
                            placeholder="e.g. eyJhbGciOiJIUzI1Ni..."
                            value={formData.authToken}
                            onValueChange={(val) => setFormData({ ...formData, authToken: val })}
                        />
                    )}
                </div>
            ))}

            {(formData.type && ['http', 'http-post', 'https', 'https-post'].includes(formData.type) && (
                <Checkbox
                    isSelected={formData.allowUnauthorized}
                    onValueChange={(val) => setFormData({ ...formData, allowUnauthorized: val })}
                >
                    Treat 401 (Unauthorized) as UP
                </Checkbox>
            ))}

            <div className="flex gap-4">
                <Input
                    className="flex-1"
                    label="Check Interval (seconds)"
                    type="number"
                    value={formData.interval?.toString()}
                    onValueChange={(val) => setFormData({ ...formData, interval: parseInt(val) || 60 })}
                    isRequired
                    min={15}
                />

                <Input
                    className="flex-1"
                    label="Timeout (ms)"
                    type="number"
                    value={formData.timeout?.toString()}
                    onValueChange={(val) => setFormData({ ...formData, timeout: parseInt(val) || 5000 })}
                    isRequired
                    min={1}
                />
            </div>

            <Input
                label="Latency Threshold (ms)"
                description="If response time > threshold, service will be marked as Degraded (0 to disable)"
                type="number"
                value={formData.latencyThreshold?.toString()}
                onValueChange={(val) => setFormData({ ...formData, latencyThreshold: parseInt(val) || 0 })}
                min={0}
            />

            <Checkbox
                isSelected={formData.isPublic}
                onValueChange={(val) => setFormData({ ...formData, isPublic: val })}
            >
                Public Service (Visible on Dashboard)
            </Checkbox>

            <Checkbox
                isSelected={formData.showTarget ?? false}
                onValueChange={(val) => setFormData({ ...formData, showTarget: val })}
            >
                Show Target URL/IP to Public
            </Checkbox>

            <div className="flex justify-end gap-2 mt-4">
                <Button variant="flat" color="danger" onPress={onCancel} isDisabled={isLoading}>
                    Cancel
                </Button>
                <Button color="primary" type="submit" isLoading={isLoading}>
                    {initialData ? "Update Service" : "Add Service"}
                </Button>
            </div>
        </form>
    );
}
