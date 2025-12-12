import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebaseEnabled: process.env.NEXT_PUBLIC_USE_FIREBASE === 'true',
  })
}