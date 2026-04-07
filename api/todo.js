const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  const col = db.collection('todos');
  try {
    if (req.method === 'GET') {
      const snapshot = await col.orderBy('createdAt', 'desc').get();
      const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json(todos);
    }
    if (req.method === 'POST') {
      const docRef = await col.add({ text: req.body.text, completed: false, createdAt: new Date() });
      return res.status(201).json({ id: docRef.id, text: req.body.text, completed: false });
    }
    if (req.method === 'PUT') {
      await col.doc(req.body.id).update({ completed: req.body.completed });
      return res.status(200).json({ success: true });
    }
    if (req.method === 'DELETE') {
      await col.doc(req.body.id).delete();
      return res.status(200).json({ success: true });
    }
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
