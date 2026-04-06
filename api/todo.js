const admin = require('firebase-admin');

// Initialize Firebase Admin with detailed checks
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // This line is the magic fix for Vercel private key formatting
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    };

    if (!serviceAccount.projectId || !serviceAccount.privateKey) {
      throw new Error("Missing Firebase Environment Variables in Vercel Settings");
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin Initialized Successfully");
  } catch (error) {
    console.error("Firebase Init Error:", error.message);
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Fix for CORS (allowing your frontend to talk to this API)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    console.error("Database Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
