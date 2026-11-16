const firebaseConfig = {
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
export const functions = window.firebase.functions?.();

let messagingInstance;

/**
 * Restituisce l'istanza di Firebase Messaging, oppure null se il browser non la supporta
 * (es. Safari su iPhone fuori dall'app installata in Home). Non solleva mai eccezioni,
 * così l'app si avvia anche dove le push non sono disponibili.
 */
export async function getMessagingInstance() {
  if (messagingInstance !== undefined) return messagingInstance;
  try {
    const supported = await window.firebase.messaging?.isSupported?.();
    messagingInstance = supported ? window.firebase.messaging() : null;
  } catch {
    messagingInstance = null;
  }
  return messagingInstance;
}
