"use client";

import { AppNotification } from "@/types/monitoring";
import { Badge, Button, Popover, PopoverTrigger, PopoverContent, Listbox, ListboxItem, ScrollShadow } from "@heroui/react";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { FaBell, FaCheck, FaExclamationCircle, FaInfoCircle } from "react-icons/fa";

export const NotificationBell = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notifications");
            const data = await res.json();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // Poll for notifications
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // 10 seconds
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = async (id: string) => {
        try {
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            // Update local state
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } catch (error) {
            console.error("Failed to mark as read", error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await fetch("/api/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ markAll: true }),
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "DOWN": return <FaExclamationCircle className="text-danger" />;
            case "UP": return <FaCheck className="text-success" />;
            default: return <FaInfoCircle className="text-primary" />;
        }
    };

    return (
        <Popover placement="bottom-end" isOpen={isOpen} onOpenChange={(open) => setIsOpen(open)}>
            <PopoverTrigger>
                <div className="cursor-pointer relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-default-100 transition-colors">
                    <Badge content={unreadCount > 0 ? unreadCount : null} color="danger" shape="circle" isInvisible={unreadCount === 0}>
                        <FaBell size={20} className="text-default-500" />
                    </Badge>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0">
                <div className="px-4 py-3 border-b border-default-200 flex justify-between items-center">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button size="sm" variant="light" className="text-xs text-primary h-8" onPress={handleMarkAllRead}>
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollShadow className="max-h-[400px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-default-400">
                            No notifications
                        </div>
                    ) : (
                        <Listbox aria-label="Notifications" variant="flat" className="p-0 gap-0 divide-y divide-default-100">
                            {notifications.map((item) => (
                                <ListboxItem
                                    key={item.id}
                                    className={`px-4 py-3 rounded-none data-[hover=true]:bg-default-100 ${!item.read ? "bg-default-50" : ""}`}
                                    onPress={() => !item.read && handleMarkAsRead(item.id)}
                                    textValue={item.message}
                                >
                                    <div className="flex gap-3 items-start">
                                        <div className="mt-1 flex-shrink-0">
                                            {getIcon(item.type)}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1">
                                            <p className={`text-sm whitespace-normal break-all ${!item.read ? "font-semibold" : "text-default-600"}`}>
                                                {item.message}
                                            </p>
                                            <p className="text-xs text-default-400">
                                                {format(new Date(item.timestamp), "MMM d, HH:mm")}
                                            </p>
                                        </div>
                                        {!item.read && (
                                            <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                        )}
                                    </div>
                                </ListboxItem>
                            ))}
                        </Listbox>
                    )}
                </ScrollShadow>
            </PopoverContent>
        </Popover>
    );
};
