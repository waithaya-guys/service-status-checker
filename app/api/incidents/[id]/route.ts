import { NextResponse } from "next/server";
import { getIncidents, saveIncident } from "@/lib/storage";
import { Incident } from "@/types/monitoring";

interface RouteParams {
    params: {
        id: string;
    };
}

export async function PUT(request: Request, { params }: RouteParams) {
    try {
        const { id } = params;
        const body = await request.json();
        const { description, cause, status, endTime } = body;

        const incidents = await getIncidents();
        const incident = incidents.find((i) => i.id === id);

        if (!incident) {
            return NextResponse.json({ error: "Incident not found" }, { status: 404 });
        }

        // Logic to handle endTime based on status change
        let newEndTime = endTime !== undefined ? endTime : incident.endTime;

        if (status === "UP") {
            // If resolving but no endTime set, set it to now
            if (!newEndTime) {
                newEndTime = new Date().toISOString();
            }
        } else if (status === "DOWN" || status === "DEGRADED") {
            // If reopening, clear endTime
            newEndTime = undefined;
        }

        // Update fields
        const updatedIncident: Incident = {
            ...incident,
            description: description ?? incident.description,
            cause: cause ?? incident.cause,
            status: status ?? incident.status,
            endTime: newEndTime,
        };

        // Recalculate duration if endTime is updated or present
        if (updatedIncident.endTime) {
            const start = new Date(updatedIncident.startTime).getTime();
            const end = new Date(updatedIncident.endTime).getTime();
            updatedIncident.duration = Math.round((end - start) / (1000 * 60)); // Minutes
        } else {
            updatedIncident.duration = undefined;
        }

        await saveIncident(updatedIncident);

        return NextResponse.json(updatedIncident);
    } catch (error) {
        console.error("Failed to update incident:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
