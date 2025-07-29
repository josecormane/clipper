// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { Storage } from "@google-cloud/storage";
import fs from 'fs';
import path from 'path';

// Check if we're in development mode and service account file exists
let serviceAccountKey: any = null;
const serviceAccountKeyPath = path.resolve('./service-account-key.json');

try {
  if (fs.existsSync(serviceAccountKeyPath)) {
    serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf8'));
  }
} catch (error) {
  console.warn('Service account key not found or invalid, using environment variables');
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: serviceAccountKey?.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

// Initialize Storage with explicit credentials from the service account file
let storage: Storage;
if (serviceAccountKey && serviceAccountKey.project_id !== 'demo-project') {
  storage = new Storage({
    projectId: serviceAccountKey.project_id,
    credentials: {
      client_email: serviceAccountKey.client_email,
      private_key: serviceAccountKey.private_key,
    },
  });
} else {
  // Mock storage for development
  storage = new Storage({
    projectId: 'demo-project',
  });
}

export { db, storage };
