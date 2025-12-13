import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const oraclePath = path.resolve(__dirname, '..', 'db', 'oracle-prepivot.json');
if (!fs.existsSync(oraclePath)) {
  console.error('Missing oracle file. Run scripts/supabase-snapshot-oracle.ts first.');
  process.exit(1);
}

const oracle = JSON.parse(fs.readFileSync(oraclePath, 'utf8'));

// Minimal validator: compare row counts if Postgres env provided
const PGHOST = process.env.PGHOST || process.env.CLOUD_SQL_HOST || null;
const PGUSER = process.env.PGUSER || process.env.CLOUD_SQL_USER || null;
const PGPASSWORD = process.env.PGPASSWORD || process.env.CLOUD_SQL_PASSWORD || null;
const PGDATABASE = process.env.PGDATABASE || process.env.CLOUD_SQL_DATABASE || null;

if (!PGHOST || !PGUSER || !PGPASSWORD || !PGDATABASE) {
  console.log('Postgres credentials not found in env.');
  console.log('Oracle summary:');
  console.log(JSON.stringify({ schemaFingerprint: oracle.schemaFingerprint, tables: oracle.tables.map((t: any) => ({ table: t.table, count: t.count })) }, null, 2));
  console.log('\nTo run validator against Cloud SQL, set PGHOST/PGUSER/PGPASSWORD/PGDATABASE and re-run.');
  process.exit(0);
}

// If postgres creds are present, attempt a comparison using `pg` client if available
let pgPkg: any;
try {
  pgPkg = require('pg');
} catch (err) {
  console.error('`pg` module not installed. Install with `npm i pg` to enable validation against Cloud SQL.');
  process.exit(1);
}

const emptyHash = 'd41d8cd98f00b204e9800998ecf8427e';

function sanitizeTableName(table: string) {
  return table.replace(/[^a-zA-Z0-9_]/g, '');
}

async function computePgChecksum(client: any, table: string) {
  const safeTable = sanitizeTableName(table);
  const query = `
    SELECT COALESCE(md5(string_agg(row_md5, '')), '${emptyHash}') AS checksum
    FROM (
      SELECT md5(to_jsonb(t)::text) AS row_md5
      FROM ${safeTable} t
      ORDER BY id
    ) hashed;
  `;
  const res = await client.query(query);
  return res.rows?.[0]?.checksum ?? emptyHash;
}

(async () => {
  const { Client } = pgPkg;
  const client = new Client({ host: PGHOST, user: PGUSER, password: PGPASSWORD, database: PGDATABASE });
  try {
    await client.connect();
    console.log('Connected to Postgres — comparing counts...');
    let mismatchCount = 0;
    for (const t of oracle.tables) {
      const name = sanitizeTableName(t.table);
      if (!name) continue;
      const res = await client.query(`SELECT count(*)::int AS cnt FROM ${name}`);
      const cnt = res.rows?.[0]?.cnt ?? null;
      const countOk = t.count === null || cnt === t.count;
      let hashOk = true;
      let pgHash: string | null = null;
      if (t.md5) {
        pgHash = await computePgChecksum(client, name);
        hashOk = pgHash === t.md5;
      }
      if (!countOk || !hashOk) {
        mismatchCount += 1;
        console.warn(`Table ${name} mismatch — count:${cnt}/${t.count}, hash:${pgHash}/${t.md5}`);
      } else {
        console.log(`Table ${name} OK — count ${cnt}, checksum ${pgHash ?? t.md5}`);
      }
    }
    if (mismatchCount > 0) {
      console.error(`${mismatchCount} tables mismatched vs oracle. Abort and investigate.`);
      process.exitCode = 2;
    } else {
      console.log('Validator passed: row counts and checksums match the oracle.');
    }
    await client.end();
  } catch (err) {
    console.error('Postgres validation failed:', (err as Error).message);
    process.exit(1);
  }
})();
