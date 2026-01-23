"use client";

import { useEffect, useRef } from "react";
import { addToast } from "@heroui/toast";
import { AppNotification } from "@/types/monitoring";

export function useNotifications() {
    const lastNotificationIdRef = useRef<string | null>(null);

    useEffect(() => {
        const pollNotifications = async () => {
            try {
                const res = await fetch("/api/notifications");
                if (!res.ok) return;

                const notifications: AppNotification[] = await res.json();
                if (notifications.length === 0) return;

                const latest = notifications[0];

                // If we haven't seen any notifications yet, just mark the latest one as seen to avoid spam on load
                if (!lastNotificationIdRef.current) {
                    lastNotificationIdRef.current = latest.id;
                    return;
                }

                // If the latest notification is different from the last one we saw
                if (latest.id !== lastNotificationIdRef.current) {
                    // It's a new notification!
                    lastNotificationIdRef.current = latest.id;

                    // Display Toast
                    addToast({
                        title: latest.type === "DOWN" ? "Service Alert" : "Service Recovered",
                        description: latest.message,
                        color: latest.type === "DOWN" ? "danger" : "success",
                        variant: "flat",
                        timeout: 5000,
                    });
                }

            } catch (error) {
                console.error("Failed to poll notifications:", error);
            }
        };

        // Poll every 5 seconds
        const intervalId = setInterval(pollNotifications, 5000);

        // Initial poll
        pollNotifications();

        return () => clearInterval(intervalId);
    }, []);
}
