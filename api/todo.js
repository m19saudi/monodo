const admin = require('firebase-admin');

// Initialize Firebase Admin only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Fix for Vercel environment variable newline characters
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // 1. STRIKE BACK AT CORS (Security Headers)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle the browser's "pre-flight" check
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const col = db.collection('todos');
  
  try {
    // --- GET ALL TASKS ---
    if (req.method === 'GET') {
      const snapshot = await col.get();
      const todos = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          text: data.text || "Untitled Task", 
          completed: data.completed || false, 
          priority: data.priority || 0, 
          order: data.order || Date.now() 
        };
      });
      return res.status(200).json(todos);
    }

    // --- ADD NEW TASK ---
    if (req.method === 'POST') {
      const newTask = {
        text: req.body.text || "New Task",
        completed: false,
        priority: 0,
        order: Date.now(),
        createdAt: new Date()
      };
      const docRef = await col.add(newTask);
      return res.status(201).json({ id: docRef.id, ...newTask });
    }

    // --- UPDATE TASK (Clean Data) ---
    if (req.method === 'PUT') {
      const { id, editing, showPicker, ...updates } = req.body;
      
      // Firebase will error if we try to save 'id' inside the document fields
      // or if we send Vue-only fields like 'editing' or 'showPicker'
      await col.doc(id).set(updates, { merge: true });
      return res.status(200).json({ success: true });
    }

    // --- DELETE TASK ---
    if (req.method === 'DELETE') {
      if (req.body.all) {
        // Bulk delete logic
        const batch = db.batch();
        const snap = await col.get();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } else {
        // Single delete
        await col.doc(req.body.id).delete();
      }
      return res.status(200).json({ success: true });
    }

  } catch (e) {
    console.error("Backend Crash:", e.message);
    return res.status(500).json({ error: e.message });
  }
}
