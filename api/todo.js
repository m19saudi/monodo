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
      // Sort by priority (Red > Orange > Green > None) then by custom position
      const snapshot = await col.get();
      const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.status(200).json(todos);
    }

    if (req.method === 'POST') {
      const { text } = req.body;
      const docRef = await col.add({ 
        text, 
        completed: false, 
        priority: 0, // 0: None, 1: Green, 2: Orange, 3: Red
        order: Date.now(), 
        createdAt: new Date() 
      });
      return res.status(201).json({ id: docRef.id, text, completed: false, priority: 0 });
    }

    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
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
  } catch (e) { return res.status(500).json({ error: e.message }); }
}
