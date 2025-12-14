const admin = require('firebase-admin');

function initAdmin() {
  if (admin.apps.length) return admin;
  const keyBase64 = process.env.FIREBASE_ADMIN_KEY;
  if (!keyBase64) throw new Error('FIREBASE_ADMIN_KEY not set');
  const keyJson = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf8'));
  admin.initializeApp({ credential: admin.credential.cert(keyJson) });
  return admin;
}

module.exports = async (req, res) => {
  try {
    const adminSdk = initAdmin();
    const db = adminSdk.firestore();
    const body = req.body || {};
    const doc = {
      action: body.action || 'unknown',
      details: body.details || null,
      ts: Date.now(),
      source: req.ip || req.headers['x-forwarded-for'] || 'vercel',
    };
    await db.collection('blocked_actions').add(doc);
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err && err.message && err.message.includes('FIREBASE_ADMIN_KEY')) {
      res.status(500).json({ ok: false, error: 'Missing FIREBASE_ADMIN_KEY. See api/README.md' });
      return;
    }
    console.error('logBlocked error', err && (err.stack || err.message || err));
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
