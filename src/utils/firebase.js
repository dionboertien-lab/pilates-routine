import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD64IKLnGwR9b8s41ksCpWCguANgzqLQWs",
  authDomain: "pilates-22dcd.firebaseapp.com",
  projectId: "pilates-22dcd",
  storageBucket: "pilates-22dcd.firebasestorage.app",
  messagingSenderId: "443627015452",
  appId: "1:443627015452:web:9d0bb6fb61f3addb7afed9",
  measurementId: "G-DC7WGF6S3Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
export const auth = getAuth(app);
