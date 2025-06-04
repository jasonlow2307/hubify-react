import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0seK9EWYN1ytqSYpPN9u8925TDF2QNAo",
  authDomain: "hubify-c2421.firebaseapp.com",
  projectId: "hubify-c2421",
  storageBucket: "hubify-c2421.firebasestorage.app",
  messagingSenderId: "1330535560",
  appId: "1:1330535560:web:3cdba80beca3912123d33d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

export { db };
