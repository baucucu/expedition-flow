
import * as admin from 'firebase-admin';

// This configuration uses a service account to authenticate the Firebase Admin SDK.
// It's a more explicit and reliable method, especially in environments where
// Application Default Credentials might not be configured correctly.

if (!admin.apps.length) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const privateKey = process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
        throw new Error(
            'Firebase server-side authentication failed. Please make sure that NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_PRIVATE_KEY, and NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL are set in your .env file.'
        );
    }
    
    const serviceAccount: admin.ServiceAccount = {
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail,
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'expeditionflow.appspot.com'
    });
}

const adminApp = admin;

export { adminApp };
