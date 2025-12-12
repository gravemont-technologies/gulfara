// ARCHIVED: Supabase integration (legacy)
// This file contains Supabase-based server logic retained for historical/migration
// reference only. The runtime stack has migrated to Firebase. Do not enable
// or rely on these scripts in Firebase-only deployments.
//
// If you need to resurrect this code, restore SUPABASE_* env vars and review
// security implications before running.

import { createClient } from 'jsr:@supabase/supabase-js';
import { z } from 'jsr:zod';
import { getAuthenticatedUserId } from '../lib/auth';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const OPENAI_CAP = Number(Deno.env.get('OPENAI_USER_MONTHLY_CAP') ?? '1000');
const jsonHeaders = { 'Content-Type': 'application/json' };

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

const openAiSchema = z.object({
  model: z.string().nonempty(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional()
});

const monthKey = () => new Date().toISOString().slice(0, 7);

async function readUsage(userId: string) {
  if (!supabase) return 0;
  const { data } = await supabase
    .from('user_api_usage')
    .select('tokens_used')
    .eq('user_id', userId)
    .eq('period', monthKey())
    .single();
  return Number(data?.tokens_used ?? 0);
}

async function recordUsage(userId: string, tokens: number) {
  if (!supabase) return;
  await supabase.from('user_api_usage').upsert({
    user_id: userId,
    period: monthKey(),
    tokens_used: tokens
  import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
  import { z } from "https://esm.sh/zod@3.21.4";
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

  const jsonHeaders = { "Content-Type": "application/json" };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
  const OPENAI_USER_MONTHLY_CAP = Number(Deno.env.get("OPENAI_USER_MONTHLY_CAP") ?? "0.01");
  const CLERK_JWKS_URL = Deno.env.get("CLERK_JWKS_URL") ?? "";

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const AiSchema = z.object({
    userId: z.string().uuid(),
    model: z.string().optional(),
    messages: z.array(z.any()).optional(),
    action: z.string().optional(),
  });

  function base64UrlDecodeToString(input: string) {
    input = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = input.length % 4;
    if (pad === 2) input += "==";
    else if (pad === 3) input += "=";
    else if (pad !== 0) input += "===";
    const bytes = Uint8Array.from(atob(input), c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  function base64UrlToUint8Array(input: string) {
    input = input.replace(/-/g, "+").replace(/_/g, "/");
    const pad = input.length % 4;
    if (pad === 2) input += "==";
    else if (pad === 3) input += "=";
    else if (pad !== 0) input += "===";
    const binary = atob(input);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }
  function parseJwt(token: string) {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid JWT format");
    const header = JSON.parse(base64UrlDecodeToString(parts[0]));
    const payload = JSON.parse(base64UrlDecodeToString(parts[1]));
    return { header, payload, signingInput: parts[0] + "." + parts[1], signature: parts[2] };
  }
  async function verifyJwtWithJwksRS256(token: string) {
    if (!CLERK_JWKS_URL) throw new Error("CLERK_JWKS_URL not configured");
    const { header, payload, signingInput, signature } = parseJwt(token);
    if (!header.kid) throw new Error("Missing kid in token header");
    if (header.alg !== "RS256") throw new Error("Only RS256 is supported in this verifier");

    const res = await fetch(CLERK_JWKS_URL);
    if (!res.ok) throw new Error("Failed to fetch JWKS");
    const jwks = await res.json();
    const key = (jwks.keys || []).find((k: any) => k.kid === header.kid);
    if (!key) throw new Error("Key not found in JWKS");

    try {
      const publicKey = await crypto.subtle.importKey(
        "jwk",
        key,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const data = new TextEncoder().encode(signingInput);
      const sig = base64UrlToUint8Array(signature);
      const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, sig, data);
      if (!ok) throw new Error("Invalid signature");
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && now >= payload.exp) throw new Error("Token expired");
      if (payload.nbf && now < payload.nbf) throw new Error("Token not yet valid");
      return payload;
    } catch (e) {
      throw new Error("JWT verification failed: " + String(e));
    }
  }

  serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    try {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

      const auth = req.headers.get("authorization") ?? "";
      if (!auth.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
      const token = auth.replace(/^Bearer\s+/, "");
      const payload = await verifyJwtWithJwksRS256(token).catch(() => null);
      if (!payload || !payload.sub) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: jsonHeaders });

      const raw = await req.json().catch(() => null);
      const parsed = AiSchema.safeParse(raw);
      if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }), { status: 400, headers: jsonHeaders });

      const body = parsed.data;
      if (payload.sub !== body.userId) return new Response(JSON.stringify({ error: "Forbidden: user mismatch" }), { status: 403, headers: jsonHeaders });

      const period = new Date().toISOString().slice(0, 7);
      const { data: rows, error: usageErr } = await supabaseAdmin
        .from("user_api_usage")
        .select("cost_usd")
        .eq("user_id", body.userId)
        .gte("created_at", `${period}-01`);

      if (usageErr) console.error("usage read err", usageErr.message ?? usageErr);
      const totalCost = (rows || []).reduce((s: number, r: any) => s + (Number(r.cost_usd) || 0), 0);
      if (totalCost >= OPENAI_USER_MONTHLY_CAP) return new Response(JSON.stringify({ error: "Monthly cap exceeded", usage: { totalCost, cap: OPENAI_USER_MONTHLY_CAP } }), { status: 429, headers: jsonHeaders });

      if (!OPENAI_API_KEY) return new Response(JSON.stringify({ error: "OpenAI key not configured" }), { status: 500, headers: jsonHeaders });

      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: body.model ?? "gpt-4o-mini", messages: body.messages ?? [], temperature: 0.2, max_tokens: 800 }),
      });

      const data = await openaiRes.json().catch(() => ({}));
      const tokensUsed = Number(data?.usage?.total_tokens ?? 0);
      const costUsd = (tokensUsed / 1000) * 0.0015;

      const { error: logErr } = await supabaseAdmin.from("user_api_usage").insert({ user_id: body.userId, model: body.model ?? null, tokens_used: tokensUsed, cost_usd: costUsd, action: body.action ?? null });
      if (logErr) console.error("usage log err", logErr.message ?? logErr);

      return new Response(JSON.stringify({ choices: data.choices ?? [], usage: { tokensUsed, costUsd } }), { status: 200, headers: jsonHeaders });
    } catch (err) {
      console.error("ai-proxy error", err);
      return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: jsonHeaders });
    }
  });
