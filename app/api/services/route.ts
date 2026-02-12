import { NextRequest, NextResponse } from "next/server";
import { getServices, saveServices, deleteService } from "@/lib/storage";
import { Service } from "@/types/monitoring";

export async function GET() {
    const services = await getServices();
    // Sort by order if available, otherwise by createdAt
    services.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return NextResponse.json(services);
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const services = await getServices();

    // Calculate next order value
    const maxOrder = services.reduce((max, s) => Math.max(max, s.order ?? 0), 0);

    const newService: Service = {
        ...body,
        id: crypto.randomUUID(),
        order: maxOrder + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    services.push(newService);
    await saveServices(services);

    return NextResponse.json(newService);
}

export async function PUT(req: NextRequest) {
    const body = await req.json();
    const services = await getServices();
    const index = services.findIndex(s => s.id === body.id);

    if (index === -1) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    services[index] = {
        ...services[index],
        ...body,
        updatedAt: new Date().toISOString()
    };

    await saveServices(services);
    return NextResponse.json(services[index]);
}

export async function DELETE(req: NextRequest) {
    // Check if ID is in body or query params
    // Frontend seems to send body { id } based on previous code
    try {
        const body = await req.json();
        const { id } = body;

        if (!id) {
            // Fallback to query param if body is empty (standard REST practice)
            const url = new URL(req.url);
            const queryId = url.searchParams.get("id");
            if (queryId) {
                await deleteService(queryId);
                return NextResponse.json({ success: true });
            }
            return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
        }

        await deleteService(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
    }
}
