
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // 🔹 Add this line

const firebaseConfig = {
  apiKey: "AIzaSyBBSNOpYk7s_Tl0imDrEJRtmXYu-FjG7wQ",
  authDomain: "heartbeatapi-85f51.firebaseapp.com",
  projectId: "heartbeatapi-85f51",
  storageBucket: "heartbeatapi-85f51.appspot.com",
  messagingSenderId: "39384981588",
  appId: "1:39384981588:web:b0366031ebe0c155aa8dc1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app); // 🔹 Initialize Firestore

export {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
  db // 🔹 Export the Firestore instance
};
