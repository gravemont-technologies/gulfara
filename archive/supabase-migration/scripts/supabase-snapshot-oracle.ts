// ARCHIVED: Supabase snapshot tool (legacy)
// Retained for audit/migration history only. This repository now uses
// Firebase for persistence — do not run this script against production
// unless you specifically intend to interact with a Supabase instance.

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

// Tables we expect to inspect. Extend as needed.
const tables = [
  { name: 'users' },
  { name: 'decks' },
  { name: 'cards' },
  { name: 'srs_data' },
  { name: 'user_progress' },
  { name: 'user_api_usage' },
  { name: 'vouchers' }
];

const batchSize = 4000;

const orderColumns: Record<string, string> = {
  cards: 'id',
  users: 'id',
  decks: 'id',
  srs_data: 'id',
  user_progress: 'id',
  user_api_usage: 'id',
  vouchers: 'id'
};

async function fingerprintTable(table: string) {
  let count: number | null = null;
  let md5: string | null = null;
  let errorMessage: string | null = null;

  try {
    const { data: countData, error: countError } = await supabase
      .from(table)
      .select('id', { head: true, count: 'exact' });
    if (countError) throw countError;
    count = (countData as any)?.count ?? null;

    md5 = await computeTableHash(table);
  } catch (err) {
    errorMessage = (err as Error).message;
    console.warn(`Table ${table} error:`, errorMessage);
  }

  return { table, count, md5, aggregates: null, error: errorMessage };
}

async function computeTableHash(table: string) {
  const hash = crypto.createHash('md5');
  const orderBy = orderColumns[table] ?? 'id';
  let cursor = 0;

  while (true) {
    const rangeEnd = cursor + batchSize - 1;
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(cursor, rangeEnd);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      hash.update(JSON.stringify(row));
    }

    cursor += data.length;
    if (data.length < batchSize) break;
  }

  return hash.digest('hex');
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function collectAggregates() {
  const agg: Record<string, Record<string, unknown>> = {};

  const { data: progressAgg } = await supabase
    .from('user_progress')
    .select('sum(points) as total_points, avg(level) as average_level, count(id) as actor_count');
  agg.progress = (progressAgg?.[0] ?? {}) as Record<string, unknown>;

  const { data: srsAgg } = await supabase
    .from('srs_data')
    .select('count(id) as total_rows, sum(repetitions) as total_repetitions, avg(ease) as average_ease, avg(quality) as average_quality, count(last_review) as reviewed_count');
  agg.srs = (srsAgg?.[0] ?? {}) as Record<string, unknown>;

  const { data: usage } = await supabase
    .from('user_api_usage')
    .select('sum(tokens_used) as tokens, sum(cost) as total_cost');
  agg.api_usage = (usage?.[0] ?? {}) as Record<string, unknown>;

  const { data: voucherAgg } = await supabase
    .from('vouchers')
    .select('count(id) as voucher_count, sum(points_cost) as total_redeemed_cost');
  agg.vouchers = (voucherAgg?.[0] ?? {}) as Record<string, unknown>;

  for (const key of Object.keys(agg)) {
    const row = agg[key];
    for (const metric of Object.keys(row)) {
      row[metric] = normalizeNumber(row[metric]);
    }
  }

  return agg;
}

async function runOracle() {
  const result: any = {
    generatedAt: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    tables: [] as any[]
  };

  for (const t of tables) {
    const info = await fingerprintTable(t.name);
    result.tables.push(info);
  }

  result.aggregates = await collectAggregates();

  // Simple schema fingerprint based on table names + counts + md5s
  const fingerprintSource = result.tables
    .map((t: any) => `${t.table}:${t.count}:${t.md5}`)
    .join('|');
  const schemaFingerprint = crypto.createHash('md5').update(fingerprintSource).digest('hex');

  result.schemaFingerprint = schemaFingerprint;

  // Ensure db dir exists
  const outDir = path.resolve(__dirname, '..', 'db');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, 'oracle-prepivot.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), { encoding: 'utf8' });

  console.log(`✓ Supabase Snapshot Oracle saved to ${outPath}`);
}

runOracle().catch((err) => {
  console.error('Oracle failed:', err);
  process.exit(1);
});
