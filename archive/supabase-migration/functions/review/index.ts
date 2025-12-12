// ARCHIVED: Supabase-based review function (legacy)
// Retained for historical/migration reference only. The active persistence
// layer is Firebase. Do not use or enable this function in Firebase-only
// deployments without a deliberate migration rollback.
import { createClient } from 'jsr:@supabase/supabase-js';
import { z } from 'jsr:zod';
import { srsEngine, buildDefaultSrs, type SRSData } from '../lib/srsEngine';
import { getAuthenticatedUserId } from '../lib/auth';

const reviewSchema = z.object({
  userId: z.string().uuid(),
  cardId: z.string().uuid(),
  quality: z.number().int().min(0).max(5),
  timeSpent: z.number().int().min(0),
  correct: z.boolean(),
  pointsEarned: z.number().int().min(0),
  reviewId: z.string().uuid().optional()
});

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

const jsonHeaders = { 'Content-Type': 'application/json' };

async function fetchExistingSrs(userId: string, cardId: string) {
  if (!supabase) return null;
  const { data } = await supabase
    .from('srs_data')
    .select('*')
    .eq('user_id', userId)
    .eq('card_id', cardId)
    .single();

  if (!data) return null;

  return normalizeRow(data);
}

function normalizeRow(row: Record<string, unknown>): SRSData {
  return {
    cardId: (row.card_id ?? row.cardId) as string,
    userId: (row.user_id ?? row.userId) as string,
    ease: Number(row.ease ?? 2.5),
    interval: Number(row.interval ?? 1),
    repetitions: Number(row.repetitions ?? 0),
    lastReview: new Date(row.last_review as string ?? row.lastReview as string ?? new Date().toISOString()),
    nextReview: new Date(row.next_review as string ?? row.nextReview as string ?? new Date().toISOString()),
    quality: Number(row.quality ?? 0)
  };
}

async function persistSrs(userId: string, cardId: string, srs: SRSData) {
  if (!supabase) return;
  await supabase.from('srs_data').upsert({
    user_id: userId,
    card_id: cardId,
    ease: srs.ease,
    interval: srs.interval,
    repetitions: srs.repetitions,
    last_review: srs.lastReview.toISOString(),
    next_review: srs.nextReview.toISOString(),
    quality: srs.quality
  }, { onConflict: 'user_id,card_id' });
}

async function updateProgress(userId: string, points: number) {
  if (!supabase) return points;
  const { data } = await supabase
    .from('user_progress')
    .select('points')
    .eq('user_id', userId)
    .single();

  const current = Number(data?.points ?? 0);
  const next = current + points;
  await supabase.from('user_progress').upsert({
    user_id: userId,
    points: next
  }, { onConflict: 'user_id' });
  return next;
}

export default async function reviewHandler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authUserId = await getAuthenticatedUserId(request);
  if (!authUserId) {
    import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
    import { z } from "https://esm.sh/zod@3.21.4";
    import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
        const parsed = ReviewSchema.safeParse(raw);
        if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid payload", issues: parsed.error.issues }), { status: 400, headers: jsonHeaders });

        const body = parsed.data;
        if (payload.sub !== body.userId) return new Response(JSON.stringify({ error: "Forbidden: user mismatch" }), { status: 403, headers: jsonHeaders });

        const { data: existing, error: readErr } = await supabaseAdmin
          .from("srs_data")
          .select("*")
          .eq("user_id", body.userId)
          .eq("card_id", body.cardId)
          .maybeSingle();

        if (readErr) console.error("srs read error", readErr.message ?? readErr);

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

        let ease = Number(srsRow.ease ?? 2.5);
        let interval = Number(srsRow.interval ?? 1);
        let repetitions = Number(srsRow.repetitions ?? 0);

        if (body.quality >= 3) {
          ease = Math.max(1.3, ease + 0.1 - (5 - body.quality) * 0.08);
          if (repetitions === 0) interval = 1;
          else if (repetitions === 1) interval = 6;
          else interval = Math.round(interval * ease);
          repetitions += 1;
        } else {
          ease = Math.max(1.3, ease - 0.2);
          interval = 1;
          repetitions = 0;
        }

        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + interval);

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
