import { getNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET() {
    const notifications = await getNotifications();
    return NextResponse.json(notifications);
}

export async function PUT(request: Request) {
    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
        await markAllNotificationsRead();
        return NextResponse.json({ success: true });
    }

    if (id) {
        await markNotificationRead(id);
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
