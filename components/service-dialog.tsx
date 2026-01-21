import { Service, LogEntry, Incident } from "@/types/monitoring";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { FaExclamationCircle, FaCheckCircle, FaClock } from "react-icons/fa";
import { StatusTimeline } from "./status-timeline";
import { getStatusTimeline, calculateUptime } from "@/lib/statistics";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { format, differenceInMinutes, parseISO } from "date-fns";
import { useTheme } from "next-themes";

interface ServiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    service: Service | null;
    logs: LogEntry[];
    incidents: Incident[];
}

const CustomTooltip = ({ active, payload, label, theme }: TooltipProps<number, string> & { theme: string | undefined }) => {
    if (active && payload && payload.length) {
        return (
            <div className={`p-3 rounded-lg shadow-lg border ${theme === 'dark' ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-black'}`}>
                <p className="font-semibold mb-1">{label}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <span className="text-sm">Latency: <span className="font-mono font-bold">{payload[0].value}ms</span></span>
                </div>
            </div>
        );
    }
    return null;
};

export function ServiceDialog({ isOpen, onClose, service, logs, incidents }: ServiceDialogProps) {
    const { theme, resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    if (!service) return null;

    const timeline = getStatusTimeline(logs);
    const uptime = calculateUptime(logs);

    // Prepare chart data (last 50 logs for better density)
    const chartData = logs.slice(-50).map(log => ({
        time: format(new Date(log.timestamp), "HH:mm"),
        latency: log.latency,
        status: log.status
    }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" backdrop="blur" placement="center" className={isDark ? "dark" : ""} scrollBehavior="outside">
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">{service.name}</span>
                                <Chip size="sm" color={service.isPublic ? "primary" : "secondary"} variant="flat">{service.type}</Chip>
                            </div>
                            <span className="text-small font-normal text-default-500">
                                {service.showTarget !== false ? service.url : "Target Hidden"}
                            </span>
                        </ModalHeader>
                        <ModalBody>
                            <div className="flex justify-between items-center mb-4 p-4 rounded-xl bg-default-50">
                                <div>
                                    <p className="text-tiny uppercase text-default-500 font-bold">Current Status</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className={`w-3 h-3 rounded-full ${logs[logs.length - 1]?.status === "UP" ? "bg-success" : "bg-danger"} animate-pulse`} />
                                        <span className={`text-xl font-bold ${logs[logs.length - 1]?.status === "UP" ? "text-success" : "text-danger"}`}>
                                            {logs[logs.length - 1]?.status || "UNKNOWN"}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-tiny uppercase text-default-500 font-bold">Uptime (30d)</p>
                                    <p className="text-xl font-bold mt-1">{uptime.toFixed(2)}%</p>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h4 className="text-small font-bold mb-2 text-default-600">Status History</h4>
                                <StatusTimeline timeline={timeline} />
                            </div>

                            <div className="h-[280px] w-full bg-default-50 rounded-xl p-4 border border-default-100">
                                <h4 className="text-small font-bold mb-4 text-default-600">Latency Response (Last 50 times)</h4>
                                <ResponsiveContainer width="100%" height="90%">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0070f3" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#0070f3" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#3f3f46" : "#e4e4e7"} strokeOpacity={0.5} />
                                        <XAxis
                                            dataKey="time"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: isDark ? "#a1a1aa" : "#71717a", fontSize: 12 }}
                                            dy={10}
                                            minTickGap={30}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: isDark ? "#a1a1aa" : "#71717a", fontSize: 12 }}
                                            dx={-10}
                                        />
                                        <RechartsTooltip content={<CustomTooltip theme={resolvedTheme} />} />
                                        <Area
                                            type="monotone"
                                            dataKey="latency"
                                            stroke="#0070f3"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorLatency)"
                                            activeDot={{ r: 6, strokeWidth: 0, fill: "#0070f3" }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Recent Incidents */}
                            <div className="mt-4">
                                <h4 className="text-small font-bold mb-2 text-default-600">Recent Incidents</h4>
                                <div className="space-y-2">
                                    {incidents.slice(0, 5).map(incident => {
                                        const startTime = new Date(incident.startTime);
                                        const endTime = incident.endTime ? new Date(incident.endTime) : null;

                                        return (
                                            <div key={incident.id} className="flex gap-3 items-start bg-danger-50 dark:bg-danger-900/20 p-3 rounded-lg border border-danger-100 dark:border-danger-900/50">
                                                <FaExclamationCircle className="text-danger flex-shrink-0 mt-1" />
                                                <div className="flex flex-col flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <span className="text-small font-bold text-danger">Service Outage</span>
                                                        <Chip size="sm" variant="flat" color={incident.endTime ? "success" : "danger"} className="h-6">
                                                            {incident.endTime ? "Resolved" : "Ongoing"}
                                                        </Chip>
                                                    </div>
                                                    <p className="text-tiny text-default-600 mt-1 break-all">{incident.description}</p>

                                                    <div className="flex gap-4 mt-2 text-tiny text-default-500">
                                                        <div className="flex items-center gap-1">
                                                            <FaClock size={10} />
                                                            <span>Started: {format(startTime, "PP pp")}</span>
                                                        </div>
                                                        {endTime && (
                                                            <div className="flex items-center gap-1">
                                                                <FaCheckCircle size={10} />
                                                                <span>Resolved: {format(endTime, "PP pp")}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="mt-1 text-tiny font-bold text-default-600">
                                                        Duration: {incident.duration !== undefined ? `${incident.duration} minutes` : "Ongoing"}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {incidents.length === 0 && (
                                        <div className="p-4 rounded-lg border border-dashed border-default-200 text-center">
                                            <p className="text-small text-default-500">No incidents reported recently. System is healthy.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose}>
                                Close
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
