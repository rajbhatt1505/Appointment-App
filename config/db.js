const { initializeApp } = require("firebase/app");
const { getAnalytics, isSupported } = require("firebase/analytics");
const admin = require('firebase-admin');

const firebaseConfig = {
  apiKey: "AIzaSyCA7RT36e5VQaXznt4TuGeqQ-OmgNgE5W8",
  authDomain: "appointment-details-35bbf.firebaseapp.com",
  projectId: "appointment-details-35bbf",
  storageBucket: "appointment-details-35bbf.appspot.com",
  messagingSenderId: "850859036743",
  appId: "1:850859036743:web:1f133ce1c459ccab56e162",
  measurementId: "G-N66V6GXRDC"
};

const app = initializeApp(firebaseConfig);

let analytics;
if (typeof window !== 'undefined' && isSupported()) {
  analytics = getAnalytics(app);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: firebaseConfig.storageBucket
});

const bucket = admin.storage().bucket();

const checkFirebaseConnection = () => {
  console.log('Firebase initialized successfully');
  return true;
};

module.exports = { app, analytics, checkFirebaseConnection, bucket };
