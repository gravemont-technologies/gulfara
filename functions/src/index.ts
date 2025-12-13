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
	admin.initializeApp();
}

export const helloWorld = onRequest(async (request, response) => {
	try {
		const doc = await admin.firestore().doc('kill_switch/helloWorld').get();
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
	try {
		const body = request.body || {};
		const action = body.action || body.type || 'unknown';
		const details = body.details || body;

		await admin.firestore().collection('blocked_actions').add({
			action,
			details,
			ts: Date.now(),
		});

		logger.info('logged blocked action', { action });
		response.json({ ok: true });
		return;
	} catch (e) {
		logger.error('logBlocked error', e);
		response.status(500).json({ ok: false });
		return;
	}
});
