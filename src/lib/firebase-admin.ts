
import * as admin from 'firebase-admin';
import serviceAccount from '@/../expeditionflow-firebase-adminsdk.json';

let app;

if (!admin.apps.length) {
    try {
        app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            storageBucket: 'expeditionflow.appspot.com',
        });
    } catch (error) {
        console.error('Firebase Admin initialization error', error);
    }
} else {
    app = admin.app();
}

export const adminApp = app;
