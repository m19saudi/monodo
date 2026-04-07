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
  // Fix for CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const col = db.collection('todos');
  
  try {
    if (req.method === 'GET') {
      const snapshot = await col.get();
      const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json(todos);
    }

    if (req.method === 'POST') {
      const data = {
        text: req.body.text || "Untitled Task",
        completed: false,
        priority: 0,
        order: Date.now(),
        createdAt: new Date()
      };
      const docRef = await col.add(data);
      return res.status(201).json({ id: docRef.id, ...data });
    }

    if (req.method === 'PUT') {
      const { id, editing, showPicker, ...updates } = req.body; // Clean the data
      await col.doc(id).update(updates);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      if (req.body.all) {
        const batch = db.batch();
        const snap = await col.get();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } else {
        await col.doc(req.body.id).delete();
      }
      return res.status(200).json({ success: true });
    }
  } catch (e) {
    console.error("API Error:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
