import { NextRequest, NextResponse } from 'next/server'
import { setupNewUser } from '../../../actions/admin'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.uid || !body?.email) {
    return NextResponse.json({ error: 'uid and email are required' }, { status: 400 })
  }

  try {
    const payload = await setupNewUser(body.uid, body.email)
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Failed to provision user', error)
    return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 })
  }
}