
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    const serviceAccount = require('../../expeditionflow-firebase-adminsdk.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'expeditionflow.appspot.com',
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export const adminApp = admin.apps[0] ?? null;
