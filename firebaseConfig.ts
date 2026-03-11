import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // استيراد Auth

// Import the functions you need from the SDKs you need
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0webFtmvqW8Vq3_EAgmrYhktUk1Z-ZZQ",
  authDomain: "memoryhelperapp.firebaseapp.com",
  projectId: "memoryhelperapp",
  storageBucket: "memoryhelperapp.firebasestorage.app",
  messagingSenderId: "292881206253",
  appId: "1:292881206253:web:50487fd5bf7c10b941b5e4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app); // تصدير خدمة المصادقة
