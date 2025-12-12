> **[ARCHIVED]**: Supabase Edge Functions examples (legacy)
>
> These Edge Function examples demonstrate Supabase-based deployments used
> during the project's historical architecture. The repository has migrated
> to Firebase for persistence — these examples are retained for audit and
> migration reference only. Do not deploy them in Firebase-only environments.

Edge Functions (deployment-ready)
=================================

Purpose
-------
This document provides final, deploy-ready Edge Function source code examples for Supabase's web UI (Edge Functions tab). Each example is provided as: Name, then the complete TypeScript source you can paste into the Supabase editor. The examples use fully-qualified HTTPS ESM imports (no `deno add` required) so the Supabase bundler can resolve them directly from the web UI.

Important notes
---------------
- These examples are intentionally conservative: strict input validation, Clerk JWT verification (via JWKS), CORS preflight handling, and defensive DB writes (upserts). They avoid requiring `deno add` by importing ESM bundles from stable CDNs (`deno.land/std`, `esm.sh`).
- Before flipping any frontend feature flags, ensure the following Supabase secrets exist: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `OPENAI_API_KEY` (for `ai-proxy`), `OPENAI_USER_MONTHLY_CAP`, and `CLERK_JWKS_URL` (for token verification).

Format
------
- Each function section begins with the function name and a complete copy-paste-ready TypeScript file to place into the Supabase Edge Functions editor.

1) Name: `review` (functions/review/index.ts)
--------------------------------------------
```ts
// Review function - deployable in Supabase Edge Functions (paste into index.ts)
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.21.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// Using a small Web Crypto-based JWKS verifier (no external jose dependency)

const jsonHeaders = { "Content-Type": "application/json" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CLERK_JWKS_URL = Deno.env.get("CLERK_JWKS_URL") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const ReviewSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
  timeSpent: z.number().int().min(0),
  correct: z.boolean(),
  pointsEarned: z.number().int().min(0),
  reviewId: z.string().uuid().optional(),
});

/** Small JWKS verifier using Web Crypto (RS256) - paste-ready (no jose) */
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
async function verifyClerkToken(token: string) {
  if (!CLERK_JWKS_URL) throw new Error("CLERK_JWKS_URL not configured");
  const { header, payload, signingInput, signature } = parseJwt(token);
  if (!header.kid) throw new Error("Missing kid in token header");
  if (header.alg !== "RS256") throw new Error("Only RS256 is supported in this verifier");

  const res = await fetch(CLERK_JWKS_URL);
  if (!res.ok) throw new Error("Failed to fetch JWKS");
  const jwks = await res.json();
  const key = (jwks.keys || []).find((k: any) => k.kid === header.kid);
  if (!key) throw new Error("Key not found in JWKS");

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
}

serve(async (req: Request) => {
  // CORS preflight
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
    const payload = await verifyClerkToken(token);
    if (!payload || !payload.sub) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: jsonHeaders });

    const raw = await req.json().catch(() => null);
    const parsed = ReviewSchema.safeParse(raw);
    if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }), { status: 400, headers: jsonHeaders });

    const body = parsed.data;
    // enforce token subject === userId
    if (payload.sub !== body.userId) return new Response(JSON.stringify({ error: "Forbidden: user mismatch" }), { status: 403, headers: jsonHeaders });

    // Read existing SRS row (maybeSingle for safety)
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("srs_data")
      .select("*")
      .eq("user_id", body.userId)
      .eq("card_id", body.cardId)
      .maybeSingle();

    if (readErr) console.error("srs read error", readErr.message ?? readErr);

    // Build default SRS if missing
    const defaultSrs = {
      user_id: body.userId,
      card_id: body.cardId,
      ease: 2.5,
      interval: 1,
      repetitions: 0,
      last_review: new Date().toISOString(),
      next_review: new Date().toISOString(),
      quality: 0,
    };

    const srsRow = existing ?? defaultSrs;

    // Minimal SM-2 like processing (deterministic, simple)
    let ease = Number(srsRow.ease ?? 2.5);
    let interval = Number(srsRow.interval ?? 1);
    let repetitions = Number(srsRow.repetitions ?? 0);

    if (body.quality >= 3) {
      // correct
      ease = Math.max(1.3, ease + 0.1 - (5 - body.quality) * 0.08);
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * ease);
      repetitions += 1;
    } else {
      // incorrect
      ease = Math.max(1.3, ease - 0.2);
      interval = 1;
      repetitions = 0;
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // Upsert SRS row
    const { error: upsertErr } = await supabaseAdmin.from("srs_data").upsert(
      {
        user_id: body.userId,
        card_id: body.cardId,
        ease,
        interval,
        repetitions,
        last_review: new Date().toISOString(),
        next_review: nextReview.toISOString(),
        quality: body.quality,
      },
      { onConflict: "user_id,card_id" }
    );
    if (upsertErr) throw upsertErr;

    // Upsert user progress (add points)
    if (body.pointsEarned && body.pointsEarned > 0) {
      const { data: cur, error: curErr } = await supabaseAdmin
        .from("user_progress")
        .select("points")
        .eq("user_id", body.userId)
        .maybeSingle();
      if (curErr) console.error("progress read err", curErr.message ?? curErr);
      const currentPoints = Number(cur?.points ?? 0);
      const nextPoints = currentPoints + body.pointsEarned;
      const { error: progErr } = await supabaseAdmin.from("user_progress").upsert({ user_id: body.userId, points: nextPoints }, { onConflict: "user_id" });
      if (progErr) console.error("progress upsert err", progErr.message ?? progErr);
    }

    const result = {
      srsData: { ease, interval, repetitions, nextReview: nextReview.toISOString(), lastReview: new Date().toISOString() },
      points: body.pointsEarned ?? 0,
      mastery: Math.min(100, (repetitions / 5) * 100),
    };

    return new Response(JSON.stringify(result), { status: 200, headers: jsonHeaders });
  } catch (err) {
    console.error("review error", err);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: jsonHeaders });
  }
});
```

2) Name: `ai-proxy` (functions/ai-proxy/index.ts)
-------------------------------------------------
```ts
// AI proxy function - deployable in Supabase Edge Functions (paste into index.ts)
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { z } from "https://esm.sh/zod@3.21.4";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
// Using a small Web Crypto-based JWKS verifier (no external jose dependency)

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
async function verifyClerkToken(token: string) {
  if (!CLERK_JWKS_URL) throw new Error("CLERK_JWKS_URL not configured");
  const { header, payload, signingInput, signature } = parseJwt(token);
  if (!header.kid) throw new Error("Missing kid in token header");
  if (header.alg !== "RS256") throw new Error("Only RS256 is supported in this verifier");

  const res = await fetch(CLERK_JWKS_URL);
  if (!res.ok) throw new Error("Failed to fetch JWKS");
  const jwks = await res.json();
  const key = (jwks.keys || []).find((k: any) => k.kid === header.kid);
  if (!key) throw new Error("Key not found in JWKS");

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
}

serve(async (req: Request) => {
  // CORS preflight
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
    const payload = await verifyClerkToken(token);
    if (!payload || !payload.sub) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: jsonHeaders });

    const raw = await req.json().catch(() => null);
    const parsed = AiSchema.safeParse(raw);
    if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }), { status: 400, headers: jsonHeaders });

    const body = parsed.data;
    if (payload.sub !== body.userId) return new Response(JSON.stringify({ error: "Forbidden: user mismatch" }), { status: 403, headers: jsonHeaders });

    // Check monthly usage (period YYYY-MM)
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

    // Forward request to OpenAI
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
    // Use a conservative cost estimate; adjust to your billing plan
    const costUsd = (tokensUsed / 1000) * 0.0015;

    // Log usage (non-blocking)
    const { error: logErr } = await supabaseAdmin.from("user_api_usage").insert({ user_id: body.userId, model: body.model ?? null, tokens_used: tokensUsed, cost_usd: costUsd, action: body.action ?? null });
    if (logErr) console.error("usage log err", logErr.message ?? logErr);

    return new Response(JSON.stringify({ choices: data.choices ?? [], usage: { tokensUsed, costUsd } }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    console.error("ai-proxy error", err);
    return new Response(JSON.stringify({ error: "internal" }), { status: 500, headers: jsonHeaders });
  }
});
```

Deployment checklist
--------------------
- Paste the appropriate code into the Supabase Edge Function editor for the function name (`review` or `ai-proxy`).
- Add the following Supabase secrets (Project Settings → API → Runtime Config / Secrets) before enabling flags:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL`
  - `OPENAI_API_KEY` (for `ai-proxy`)
  - `OPENAI_USER_MONTHLY_CAP`
  - `CLERK_JWKS_URL`

Quick verification commands (local / CI)
--------------------------------------
Run these on your build host if you want to static-check the source before paste-deploy (requires Deno installed):

```powershell
deno check .\gulfara\functions\review\index.ts
deno check .\gulfara\functions\ai-proxy\index.ts
```

If you prefer to deploy from your machine with the Supabase CLI:

```powershell
supabase login
supabase functions deploy review --project <ref>
supabase functions deploy ai-proxy --project <ref>
```

Acceptance checklist (staging)
-----------------------------
- Valid Clerk JWTs with `CLERK_JWKS_URL` configured → requests succeed and DB rows are created/updated.
- Invalid/mismatched userId → 401/403.
- `OPENAI_USER_MONTHLY_CAP` enforced → `ai-proxy` returns 429 when exceeded.
- Logs/console output visible in Supabase logs for 5xx spikes.

Rollback
--------
- Flip frontend feature flags (`VITE_USE_EDGE_REVIEW`, `VITE_USE_EDGE_AI_PROXY`) to `false` to revert clients immediately.
- Redeploy previous function revision from your CI artifact if needed.

Notes & Next Steps
------------------
- These files are optimized for ease of paste-deploy from the Supabase web UI: fully-qualified imports and no `deno add` prereqs. They are intentionally minimal in supporting libraries but include production-critical steps: JWT verification, input validation, and basic error handling.
- Recommended follow-ups (small, high-leverage):
  - Move SRS + progress writes into a Postgres RPC for atomicity.
  - Add unit tests (Vitest) that mock `Deno.env` and HTTP requests.
  - Add observability: structured logs, request IDs, and metrics.

Keep this file canonical and paste the appropriate function code into the Supabase Edge Function editor for a deployment-ready result.

