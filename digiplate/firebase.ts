import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCKbEYW0bt_lH2gaKPqt5V4BPDjjMNt1HM",
    authDomain: "digitalmenu-53813.firebaseapp.com",
    projectId: "digitalmenu-53813",
    storageBucket: "digitalmenu-53813.firebasestorage.app",
    messagingSenderId: "202450812678",
    appId: "1:202450812678:web:4b3b8955893a9da024e887",
    measurementId: "G-S8LZ0LFLCV"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);