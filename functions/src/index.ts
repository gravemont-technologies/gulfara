/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
	try {
		const keyB64 = process.env.FIREBASE_ADMIN_KEY;
		if (keyB64) {
			const keyJson = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf-8'));
			admin.initializeApp({ credential: admin.credential.cert(keyJson) });
			logger.info('admin initialized from FIREBASE_ADMIN_KEY');
		} else {
			admin.initializeApp();
			logger.info('admin initialized with default credentials');
		}
	} catch (err) {
		logger.error('admin.initializeApp failed, falling back to default', err);
		try { admin.initializeApp(); } catch (err2) { logger.error('fallback admin.initializeApp failed', err2); }
	}
}

export const helloWorld = onRequest(async (request, response) => {
	// Read kill-switch with retries to tolerate transient Firestore errors
	async function getDocWithRetries(path: string) {
		const maxAttempts = 3;
		let attempt = 0;
		while (true) {
			try {
				return await admin.firestore().doc(path).get();
			} catch (err: any) {
				attempt++;
				const code = err && (err.code || err.status || err.codeNumber);
				const isTransient = !code || typeof code === 'string' && (code.startsWith('5') || code === 'ECONNRESET' || code === 'ENOTFOUND' || code === 'EAI_AGAIN');
				if (attempt >= maxAttempts || !isTransient) {
					throw err;
				}
				const backoff = Math.min(500 * Math.pow(2, attempt), 2000) + Math.floor(Math.random() * 100);
				logger.warn('transient firestore read error, retrying', { attempt, backoff, err });
				await new Promise((r) => setTimeout(r, backoff));
			}
		}
	}

	try {
		const doc = await getDocWithRetries('kill_switch/helloWorld');
		const enabled = doc.exists ? !!doc.data()?.enabled : false; // default OFF
		if (!enabled) {
			logger.warn('helloWorld request rejected: ENABLED=false');
			response.status(503).json({ ok: false, reason: 'ENABLED=false' });
			return;
		}

		logger.info('helloWorld served');
		response.json({ ok: true, msg: 'hello world' });
		return;
	} catch (e) {
		logger.error('helloWorld error', e);
		response.status(500).json({ ok: false, error: 'internal' });
		return;
	}
});

export const logBlocked = onRequest(async (request, response) => {
	// Optional API key protection (set LOGBLOCKED_API_KEY to require)
	const requiredKey = process.env.LOGBLOCKED_API_KEY;
	if (requiredKey) {
		const got = (request.headers['x-logblocked-key'] || request.headers['x-logblocked-key'.toLowerCase()]) as string | undefined;
		if (!got || got !== requiredKey) {
			logger.warn('logBlocked unauthorized request');
			response.status(401).json({ ok: false, reason: 'unauthorized' });
			return;
		}
	}

	if (request.method !== 'POST') {
		response.status(405).json({ ok: false, reason: 'POST only' });
		return;
	}

	const body = request.body || {};
	const action = body.action || body.type || 'unknown';
	const details = body.details || body;

	// Helper: add with retries/backoff for transient Firestore errors
	async function addWithRetries(collectionRef: admin.firestore.CollectionReference, doc: any) {
		const maxAttempts = 3;
		let attempt = 0;
		while (true) {
			try {
				return await collectionRef.add(doc);
			} catch (err: any) {
				attempt++;
				const code = err && (err.code || err.status || err.codeNumber);
				const isTransient = !code || typeof code === 'string' && (code.startsWith('5') || code === 'ECONNRESET' || code === 'ENOTFOUND' || code === 'EAI_AGAIN');
				if (attempt >= maxAttempts || !isTransient) {
					throw err;
				}
				const backoff = Math.min(1000 * Math.pow(2, attempt), 5000) + Math.floor(Math.random() * 200);
				logger.warn('transient firestore write error, retrying', { attempt, backoff, err });
				await new Promise((r) => setTimeout(r, backoff));
			}
		}
	}

	try {
		const col = admin.firestore().collection('blocked_actions');
		await addWithRetries(col, { action, details, ts: Date.now() });
		logger.info('logged blocked action', { action });
		response.json({ ok: true });
		return;
	} catch (e) {
		logger.error('logBlocked error', e);
		response.status(500).json({ ok: false });
		return;
	}
});
