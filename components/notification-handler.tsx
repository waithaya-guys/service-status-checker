"use client";

import { useNotifications } from "@/hooks/use-notifications";

export function NotificationHandler() {
    useNotifications();
    return null;
}
