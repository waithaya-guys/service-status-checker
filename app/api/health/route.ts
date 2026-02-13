import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Simple query to check database connection
        await query('SELECT 1');
        return NextResponse.json({ status: 'healthy', database: 'connected' }, { status: 200 });
    } catch (error) {
        console.error('Health check failed:', error);
        return NextResponse.json(
            { status: 'unhealthy', database: 'disconnected', error: String(error) },
            { status: 503 }
        );
    }
}
