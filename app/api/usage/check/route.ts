import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const response = await fetch(`${backendUrl}/api/usage/check`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Usage check failed with status ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.warn('Usage check fallback triggered:', error);

    return NextResponse.json({
      used: 0,
      limit: 1000000,
      isOverLimit: false,
      message: 'Backend unavailable, using safe fallback',
    });
  }
}
