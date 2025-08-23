
import * as admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;

if (!admin.apps.length) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
        try {
            const serviceAccount = JSON.parse(serviceAccountKey);
            adminApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: 'expeditionflow.appspot.com',
            });
        } catch (e: any) {
            console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
        }
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not set. Firebase Admin SDK not initialized.");
    }
} else {
    adminApp = admin.apps[0];
}

export { adminApp };
