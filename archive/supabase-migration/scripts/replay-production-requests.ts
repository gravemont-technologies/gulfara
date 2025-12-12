import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

type ReplayRecord = {
	name?: string;
	method: string;
	path: string;
	headers?: Record<string, string>;
	body?: Record<string, unknown> | string;
	expectedStatus?: number;
};

type ReplayResult = {
	status: number;
	body: unknown;
	text: string;
};

const stagingBase = process.env.REPLAY_STAGING_URL;
// ARCHIVED: Replay tool referencing Supabase (legacy)
// This script was used to replay captured requests against Supabase during
// migration verification. It is retained for historical purposes only.
// Do not run unless you explicitly intend to target a Supabase instance.

const productionBase = process.env.REPLAY_PRODUCTION_URL || process.env.SUPABASE_URL;
const mismatchTolerance = Number(process.env.REPLAY_MAX_MISMATCH_RATE ?? '0.01');
const replayFile = path.resolve(__dirname, '..', 'db', 'replay-requests.ndjson');
const exampleFile = path.resolve(__dirname, '..', 'db', 'replay-requests.example.ndjson');

if (!stagingBase || !productionBase) {
	console.error('Set REPLAY_STAGING_URL and REPLAY_PRODUCTION_URL (or SUPABASE_URL) in .env before running this script.');
	process.exit(1);
}

if (!fs.existsSync(replayFile)) {
	console.error(`Missing replay script input (${replayFile}).`);
	if (fs.existsSync(exampleFile)) {
		console.error(`Copy ${path.basename(exampleFile)} → ${path.basename(replayFile)} and edit.`);
	}
	process.exit(1);
}

function normalizeBase(base: string) {
	return base.endsWith('/') ? base.slice(0, -1) : base;
}

async function sendRequest(base: string, record: ReplayRecord): Promise<ReplayResult> {
	const url = `${normalizeBase(base)}${record.path.startsWith('/') ? record.path : `/${record.path}`}`;
	const method = (record.method || 'GET').toUpperCase();
	const headers: Record<string, string> = {
		Accept: 'application/json',
		...record.headers
	};
	let body: string | undefined;
	if (record.body) {
		if (typeof record.body === 'string') {
			body = record.body;
		} else {
			headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
			body = JSON.stringify(record.body);
		}
	}

	const res = await fetch(url, { method, headers, body });
	const text = await res.text();
	let parsedBody: unknown = text;
	try {
		parsedBody = JSON.parse(text);
	} catch (err) {
		// fall through — keep raw text
	}

	return { status: res.status, body: parsedBody, text };
}

function compareBodies(a: unknown, b: unknown) {
	if (typeof a === 'string' && typeof b === 'string') return a === b;
	return JSON.stringify(a) === JSON.stringify(b);
}

async function runReplay() {
	const lines = fs
		.readFileSync(replayFile, 'utf8')
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	if (lines.length === 0) {
		console.error('Replay file is empty. Add JSON records (one per line).');
		process.exit(1);
	}

	let mismatchCount = 0;
	const sampleDiffs: any[] = [];

	for (const line of lines) {
		const record: ReplayRecord = JSON.parse(line);
		console.log(`→ replaying ${record.name ?? record.path}`);

		const [staging, production] = await Promise.all([
			sendRequest(stagingBase, record),
			sendRequest(productionBase, record)
		]);

		const statusMatch = staging.status === production.status;
		const bodyMatch = compareBodies(staging.body, production.body);
		const ok = statusMatch && bodyMatch;
		if (!ok) {
			mismatchCount += 1;
			sampleDiffs.push({
				label: record.name ?? record.path,
				staging: { status: staging.status, body: staging.body },
				production: { status: production.status, body: production.body },
				misc: { expected: record.expectedStatus }
			});
			console.warn(`  ✖ mismatch (${mismatchCount}/${lines.length})`);
		} else {
			console.log('  ✓ match');
		}
	}

	const mismatchRate = mismatchCount / lines.length;
	console.log('\nReplay summary:');
	console.log(`  total requests: ${lines.length}`);
	console.log(`  mismatches: ${mismatchCount}`);
	console.log(`  mismatch rate: ${(mismatchRate * 100).toFixed(2)}% (tolerance ${mismatchTolerance * 100}%)`);

	if (sampleDiffs.length > 0) {
		console.log('Sample mismatches:');
		console.log(JSON.stringify(sampleDiffs.slice(0, 3), null, 2));
	}

	if (mismatchRate > mismatchTolerance) {
		console.error('Mismatch rate exceeded tolerance — replay failed.');
		process.exit(2);
	}
}

runReplay().catch((err) => {
	console.error('Replay failed:', err);
	process.exit(1);
});
