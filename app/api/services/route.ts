import { NextRequest, NextResponse } from "next/server";
import { getServices, saveServices } from "@/lib/storage";
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
    const { id } = await req.json();
    let services = await getServices();
    services = services.filter(s => s.id !== id);
    await saveServices(services);
    return NextResponse.json({ success: true });
}
