
import * as admin from 'firebase-admin';

// This configuration uses a service account to authenticate the Firebase Admin SDK.
// It's a more explicit and reliable method, especially in environments where
// Application Default Credentials might not be configured correctly.

if (!admin.apps.length) {
    const { PROJECT_ID, PRIVATE_KEY, CLIENT_EMAIL } = process.env;

    if (!PROJECT_ID || !PRIVATE_KEY || !CLIENT_EMAIL) {
        throw new Error(
            'Missing Firebase Admin SDK credentials. Please ensure PROJECT_ID, PRIVATE_KEY, and CLIENT_EMAIL are set in your environment variables.'
        );
    }
    
    const serviceAccount: admin.ServiceAccount = {
        projectId: PROJECT_ID,
        privateKey: PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: CLIENT_EMAIL,
    };

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'expeditionflow.appspot.com'
    });
}

const adminApp = admin;

export { adminApp };
