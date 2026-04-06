import admin from 'firebase-admin';

// Initialize Firebase Admin (using Env Vars for security)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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
      const { text } = req.body;
      const docRef = await col.add({ text, completed: false, createdAt: new Date() });
      return res.status(201).json({ id: docRef.id, text, completed: false });
    }

    if (req.method === 'PUT') {
      const { id, completed } = req.body;
      await col.doc(id).update({ completed });
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      await col.doc(id).delete();
      return res.status(200).json({ success: true });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
