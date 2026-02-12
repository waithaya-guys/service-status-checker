"use client";

import { useEffect, useRef } from "react";
import { addToast } from "@heroui/toast";
import { AppNotification } from "@/types/monitoring";

export function useNotifications() {
    const lastNotificationIdRef = useRef<string | null>(null);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let isMounted = true;

        const pollNotifications = async () => {
            if (!isMounted) return;

            // Don't poll if page is hidden to save resources and avoid network errors on sleep
            if (document.hidden) {
                timeoutId = setTimeout(pollNotifications, 5000);
                return;
            }

            try {
                const res = await fetch("/api/notifications");
                if (res.ok) {
                    const notifications: AppNotification[] = await res.json();

                    if (notifications.length > 0) {
                        const latest = notifications[0];

                        // If we haven't seen any notifications yet, just mark the latest one as seen to avoid spam on load
                        if (!lastNotificationIdRef.current) {
                            lastNotificationIdRef.current = latest.id;
                        }
                        // If the latest notification is different from the last one we saw
                        else if (latest.id !== lastNotificationIdRef.current) {
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
                    }
                }
            } catch (error) {
                // Silently ignore fetch errors (network down, etc) to avoid console spam
                // console.warn("Polling skipped due to network error");
            } finally {
                if (isMounted) {
                    timeoutId = setTimeout(pollNotifications, 5000);
                }
            }
        };

        // Start polling
        pollNotifications();

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, []);
}
