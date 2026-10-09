// Hypothesis: browser pipelines markContactRead(update) + setDoc(create) for the
// SAME chat doc into one commit; the emulator's rules eval then crashes.
const { initializeApp, getApps } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const {
  getFirestore, connectFirestoreEmulator, doc, writeBatch, serverTimestamp, increment,
} = require('firebase/firestore');

const K = 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE';
const IDB = 'http://localhost:9099/identitytoolkit.googleapis.com/v1';
const stamp = Date.now();
const A = { email: `bt.a.${stamp}@qa.test`, pass: 'Test1234!', name: 'BatchAlice' };
const B = { email: `bt.b.${stamp}@qa.test`, pass: 'Test1234!', name: 'BatchBob' };
const C = { email: `bt.c.${stamp}@qa.test`, pass: 'Test1234!', name: 'BatchCee' };
const D = { email: `bt.d.${stamp}@qa.test`, pass: 'Test1234!', name: 'BatchDee' };

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
  await signUp(C);
  await signUp(D);
  const app = getApps().length ? getApps()[0] : initializeApp({
    apiKey: K, authDomain: 'foundators-66eb7.firebaseapp.com', projectId: 'foundators-66eb7',
    storageBucket: 'foundators-66eb7.firebasestorage.app', messagingSenderId: '895663747948',
    appId: '1:895663747948:web:e5220d538c767f34ec3949',
  });
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, 'localhost', 8080);
  const { signOut } = require('firebase/auth');

  await signInWithEmailAndPassword(auth, B.email, B.pass);
  const convId = [A.uid, B.uid].sort().join('__');
  console.log('conv1', convId);
  const batch = writeBatch(db);
  batch.update(doc(db, 'chats', convId), { [`unreadBy.${B.uid}`]: 0 });
  batch.set(doc(db, 'chats', convId), {
    participants: [B.uid, A.uid],
    participantNames: { [B.uid]: B.name, [A.uid]: A.name },
    participantAvatars: { [B.uid]: '', [A.uid]: '' },
    isGroup: false,
    groupName: '',
    lastMessage: 'batch probe',
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  try {
    await batch.commit();
    console.log('V1 BATCH [update-missing + create] committed: OK (unexpected?)');
  } catch (e) {
    console.log('V1 BATCH [update-missing + create] FAILED:\n' + e.message.slice(0, 700));
  }

  // variant 2: create + update-on-created in ONE commit (fresh pair)
  await signOut(auth);
  await signInWithEmailAndPassword(auth, D.email, D.pass);
  const conv2 = [C.uid, D.uid].sort().join('__');
  console.log('conv2', conv2);
  const b2 = writeBatch(db);
  b2.set(doc(db, 'chats', conv2), {
    participants: [D.uid, C.uid], participantNames: {}, participantAvatars: {},
    isGroup: false, groupName: '', lastMessage: 'm', lastMessageAt: serverTimestamp(), createdAt: serverTimestamp(),
  });
  b2.update(doc(db, 'chats', conv2), { lastMessage: 'm2', lastMessageAt: serverTimestamp(), [`unreadBy.${C.uid}`]: increment(1) });
  try {
    await b2.commit();
    console.log('V2 BATCH [create + update] committed: OK');
  } catch (e) {
    console.log('V2 BATCH [create + update] FAILED:\n' + e.message.slice(0, 700));
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
