const { initializeApp, getApps } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, connectFirestoreEmulator, doc, setDoc, addDoc, collection, updateDoc, serverTimestamp, getDoc } = require('firebase/firestore');

const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const A = { email: `cr.a.${stamp}@qa.test`, pass: 'Test1234!' };
const B = { email: `cr.b.${stamp}@qa.test`, pass: 'Test1234!' };
async function signUp(u) {
  const r = await fetch(`${IDB}/accounts:signUp?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.pass, returnSecureToken: true }),
  }).then((x) => x.json());
  if (!r.localId) throw new Error('signup failed ' + JSON.stringify(r).slice(0, 150));
}

(async () => {
  await signUp(A);
  await signUp(B);
  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey: K, authDomain: 'foundators-66eb7.firebaseapp.com', projectId: 'foundators-66eb7',
    storageBucket: 'foundators-66eb7.firebasestorage.app', messagingSenderId: '895663747948',
    appId: '1:895663747948:web:e5220d538c767f34ec3949',
  });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, 'localhost', 8080);
  const ra = await signInWithEmailAndPassword(auth, A.email, A.pass);
  const uidA = ra.user.uid;
  const rb = await signInWithEmailAndPassword(auth, B.email, B.pass).catch(async () => null);
  // same auth instance — sign out then sign in B
  const { signOut } = require('firebase/auth');
  await signOut(auth);
  const rb2 = await signInWithEmailAndPassword(auth, B.email, B.pass);
  const uidB = rb2.user.uid;
  console.log('uidA', uidA, 'uidB', uidB);
  const convId = [uidA, uidB].sort().join('__');
  console.log('convId', convId);

  // exact payload from lib/firestore.js sendMessage
  const chatPayload = {
    participants: [uidB, uidA],
    participantNames: { [uidB]: 'MsgBob', [uidA]: 'MsgAlice' },
    participantAvatars: {},
    isGroup: false,
    groupName: '',
    lastMessage: 'probe msg',
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db, 'chats', convId), chatPayload);
    console.log('chat create OK');
  } catch (e) {
    console.log('chat create FAILED — FULL ERROR:\n' + e.message);
  }
  try {
    const snap = await getDoc(doc(db, 'chats', convId));
    console.log('chat exists after:', snap.exists());
    if (snap.exists()) {
      const ref = await addDoc(collection(db, 'chats', convId, 'messages'), {
        text: 'probe msg', senderKey: uidB, senderName: 'MsgBob', senderAvatar: '', read: false, createdAt: serverTimestamp(),
      });
      console.log('message create OK', ref.id);
      await updateDoc(doc(db, 'chats', convId), { lastMessage: 'probe msg', lastMessageAt: serverTimestamp(), [`unreadBy.${uidA}`]: 1 });
      console.log('chat update OK');
    }
  } catch (e) {
    console.log('msg/update FAILED — FULL ERROR:\n' + e.message);
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
