// Reproduce the browser's exact write sequence:
// 1) markContactRead: updateDoc unreadBy on a chat that does NOT exist yet
// 2) sendMessage: setDoc create chat, addDoc message, updateDoc lastMessage
const { initializeApp, getApps } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const {
  getFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, addDoc, collection,
  updateDoc, serverTimestamp,
} = require('firebase/firestore');

const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const A = { email: `sq.a.${stamp}@qa.test`, pass: 'Test1234!', name: 'SeqAlice' };
const B = { email: `sq.b.${stamp}@qa.test`, pass: 'Test1234!', name: 'SeqBob' };

async function signUp(u) {
  const r = await fetch(`${IDB}/accounts:signUp?key=${K}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: u.email, password: u.pass, returnSecureToken: true }),
  }).then((x) => x.json());
  if (!r.localId) throw new Error('signup ' + JSON.stringify(r).slice(0, 120));
  u.uid = r.localId;
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
  await signInWithEmailAndPassword(auth, B.email, B.pass);
  const uidB = B.uid, uidA = A.uid;
  const convId = [uidA, uidB].sort().join('__');
  console.log('convId', convId);

  // step 1: markContactRead on missing chat (exactly like the page effect)
  try {
    await updateDoc(doc(db, 'chats', convId), { [`unreadBy.${uidB}`]: 0 });
    console.log('1) markContactRead on missing chat: OK (unexpected)');
  } catch (e) {
    console.log('1) markContactRead on missing chat FAILED:\n' + e.message.slice(0, 500));
  }

  // step 2: sendMessage sequence immediately after
  const payload = {
    participants: [uidB, uidA],
    participantNames: { [uidB]: B.name, [uidA]: A.name },
    participantAvatars: { [uidB]: '', [uidA]: '' },
    isGroup: false,
    groupName: '',
    lastMessage: 'seq probe',
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  try {
    const snap = await getDoc(doc(db, 'chats', convId));
    console.log('2a) chat exists?', snap.exists());
    if (!snap.exists()) {
      await setDoc(doc(db, 'chats', convId), payload);
      console.log('2b) setDoc create: OK');
    }
    const ref = await addDoc(collection(db, 'chats', convId, 'messages'), {
      text: 'seq probe', senderKey: uidB, senderName: B.name, senderAvatar: '', read: false, createdAt: serverTimestamp(),
    });
    console.log('2c) addDoc message: OK', ref.id);
    await updateDoc(doc(db, 'chats', convId), {
      lastMessage: 'seq probe', lastMessageAt: serverTimestamp(), [`unreadBy.${uidA}`]: incrementLike(),
    });
    console.log('2d) updateDoc lastMessage: OK');
  } catch (e) {
    console.log('2) sendMessage sequence FAILED:\n' + e.message.slice(0, 700));
  }

  function incrementLike() {
    const { increment } = require('firebase/firestore');
    return increment(1);
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
