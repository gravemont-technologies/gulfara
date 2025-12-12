import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '../../../../lib/firebase/admin'

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)?.replace(/\/+$/, '')

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.accessToken) {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 })
  }

  if (!SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase URL is not configured' }, { status: 500 })
  }

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${body.accessToken}` },
  })

  if (!userRes.ok) {
    return NextResponse.json({ error: 'Unable to verify Supabase session' }, { status: 401 })
  }

  const supabaseUser = await userRes.json()
  if (!supabaseUser?.id) {
    return NextResponse.json({ error: 'Supabase user data missing' }, { status: 500 })
  }

  try {
    const firebaseToken = await adminAuth().createCustomToken(supabaseUser.id, {
      role: 'user',
      migratedFrom: 'supabase',
    })
    return NextResponse.json({ firebaseCustomToken: firebaseToken, supabaseUser })
  } catch (error) {
    console.error('Failed to mint Firebase custom token', error)
    return NextResponse.json({ error: 'Failed to mint Firebase token' }, { status: 500 })
  }
}import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminAuth } from '../../../../lib/firebase/admin'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const authHeader = req.headers.get('authorization')
  const token = body?.token ?? body?.supabaseToken ?? authHeader?.replace(/^Bearer\s+/i, '')

  if (!token) {
    return NextResponse.json({ error: 'Supabase session token is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    return NextResponse.json({ error: 'Unable to validate Supabase session' }, { status: 401 })
  }

  try {
    const customToken = await adminAuth().createCustomToken(data.user.id, {
      role: 'user',
      email: data.user.email ?? undefined,
    })
    return NextResponse.json({ token: customToken })
  } catch (createError) {
    console.error('Failed to mint Firebase token', createError)
    return NextResponse.json({ error: 'Firebase token creation failed' }, { status: 500 })
  }
}