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
    const doc = await db.doc('kill_switch/helloWorld').get();
    const data = doc.exists ? doc.data() : { enabled: true };
    if (!data || data.enabled === false) {
      res.status(503).json({ ok: false, message: 'helloWorld disabled (kill switch)' });
      return;
    }
    res.status(200).json({ ok: true, message: 'helloWorld active' });
  } catch (err) {
    if (err && err.message && err.message.includes('FIREBASE_ADMIN_KEY')) {
      res.status(500).json({ ok: false, error: 'Missing FIREBASE_ADMIN_KEY. See api/README.md' });
      return;
    }
    console.error('helloWorld error', err && (err.stack || err.message || err));
    res.status(500).json({ ok: false, error: 'internal_error' });
  }
};
