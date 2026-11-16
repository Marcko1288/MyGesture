const firebaseConfig = {
  // apiKey: "LA_TUA_API_KEY",
  // authDomain: "IL_TUO_DOMINIO.firebaseapp.com",
  // projectId: "IL_TUO_PROJECT_ID",
  // storageBucket: "IL_TUO_BUCKET.appspot.com",
  // messagingSenderId: "IL_TUO_SENDER_ID",
  // appId: "IL_TUO_APP_ID"
  apiKey: "AIzaSyB5op4aWJ4jdCaKmy2BsLJGsz5F5ZlFlV8",
  authDomain: "mygestion-446b9.firebaseapp.com",
  projectId: "mygestion-446b9",
  storageBucket: "mygestion-446b9.firebasestorage.app",
  messagingSenderId: "187789660649",
  appId: "1:187789660649:web:6b17922eeb4cc3a2fa7b78",
  measurementId: "G-9BFRJNTZ5Z"
};

// I file CDN sono caricati in index.html prima del bundle React.
if (!window.firebase.apps.length) {
  window.firebase.initializeApp(firebaseConfig);
}

export const auth = window.firebase.auth();
export const db = window.firebase.firestore?.();
export const messaging = window.firebase.messaging?.();
