
import * as admin from 'firebase-admin';
import serviceAccount from '@/../expeditionflow-firebase-adminsdk.json';

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
            storageBucket: 'expeditionflow.appspot.com',
        });
    } catch (error) {
        console.error('Firebase Admin initialization error', error);
    }
}

export const adminApp = admin.apps[0]!;
