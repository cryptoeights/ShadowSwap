import { NextRequest, NextResponse } from 'next/server';

const RPC_URL = 'https://sepolia-rollup.arbitrum.io/rpc';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const response = await fetch(RPC_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();
        
        return NextResponse.json(data);
    } catch (error) {
        console.error('RPC proxy error:', error);
        return NextResponse.json(
            { error: 'RPC request failed' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({ status: 'RPC proxy is running' });
}
