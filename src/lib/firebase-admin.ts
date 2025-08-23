
import * as admin from 'firebase-admin';
import serviceAccount from '@/../expeditionflow-firebase-adminsdk.json';

let adminApp: admin.app.App | null = null;

if (!admin.apps.length) {
    try {
        // The type assertion is necessary because the JSON import is not strongly typed.
        const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
        adminApp = admin.initializeApp({
            credential,
            storageBucket: 'expeditionflow.appspot.com',
        });
    } catch (e: any) {
        console.error("Failed to initialize Firebase Admin SDK:", e.message);
    }
} else {
    adminApp = admin.apps[0];
}

export { adminApp };
