// Firebase web-app settings. These are public client settings, not passwords.
// NEVER add a Firebase service-account private key to this file.
// Copy these values from Firebase Console > Project settings > Your apps.
window.CHRISTMAS_CONFIG = {
  firebaseConfig: {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID"
  },
  // Your Firebase Authentication user's UID. Firestore rules use this to protect admin writes.
  adminUid: "YOUR_ADMIN_USER_UID"
};
