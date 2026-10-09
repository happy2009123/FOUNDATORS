const { initializeApp, getApps } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore, connectFirestoreEmulator, collection, getDocs, query, orderBy,
} = require('firebase/firestore');

const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const conv = process.env.CONV; // uidA__uidB
const email = process.env.EMAIL;

(async () => {
  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey: K, authDomain: 'foundators-66eb7.firebaseapp.com', projectId: 'foundators-66eb7',
    storageBucket: 'foundators-66eb7.firebasestorage.app', messagingSenderId: '895663747948',
    appId: '1:895663747948:web:e5220d538c767f34ec3949',
  });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, 'localhost', 8080);
  await signInWithEmailAndPassword(auth, email, 'Test1234!');
  const snap = await getDocs(collection(db, 'chats', conv, 'messages'));
  console.log('messages:', snap.size);
  snap.forEach((d) => {
    const m = d.data();
    console.log(' -', d.id.slice(0, 8), m.senderKey?.slice(0, 8), '|', (m.text || '').slice(0, 50), '|', m.createdAt?.toDate?.()?.toISOString?.() || '');
  });
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
