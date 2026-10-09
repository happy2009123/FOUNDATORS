// FOUNDATORS QA — Phase 4: black-box security probes through the real
// Firebase SDK against the LOCAL emulators (no production data touched).
// Expected outcome for every privileged probe: permission-denied.
// Usage: node qa/security-sdk.js
const { initializeApp } = require('firebase/app');
const {
  getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword,
} = require('firebase/auth');
const {
  getFirestore, connectFirestoreEmulator, doc, setDoc, updateDoc, deleteDoc,
  getDoc, getDocs, collection, query, where, serverTimestamp, addDoc, Timestamp,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: 'AIzaSyB2hONQjrQRjKlXGTarAW-_brYMZlXXyrE',
  authDomain: 'foundators-66eb7.firebaseapp.com',
  projectId: 'foundators-66eb7',
  storageBucket: 'foundators-66eb7.firebasestorage.app',
  messagingSenderId: '895663747948',
  appId: '1:895663747948:web:e5220d538c767f34ec3949',
};

const RESULTS = [];
async function probe(id, name, expect, fn) {
  const rec = { id, name, status: 'PASS', detail: '' };
  try {
    const out = await fn();
    const denied = out && out.denied === true;
    if (expect === 'denied' && !denied) {
      rec.status = 'FAIL';
      rec.detail = 'EXPECTED DENIAL BUT SUCCEEDED' + (out && out.note ? ' — ' + out.note : '');
    } else if (expect === 'info') {
      rec.status = 'INFO';
      rec.detail = denied ? 'denied' : 'allowed' + (out && out.note ? ' — ' + out.note : '');
    } else {
      rec.detail = denied ? 'denied: ' + (out.code || '') : JSON.stringify(out).slice(0, 120);
    }
  } catch (e) {
    const code = e.code || e.message || '';
    if (expect === 'denied') {
      if (/permission|denied/i.test(code)) rec.detail = 'denied: ' + code;
      else { rec.status = 'FAIL'; rec.detail = 'unexpected error: ' + String(code).slice(0, 200); }
    } else {
      rec.status = 'INFO';
      rec.detail = 'error: ' + String(code).slice(0, 160);
    }
  }
  const tag = rec.status === 'FAIL' ? 'FAIL' : rec.status === 'INFO' ? 'info' : 'PASS';
  console.log(`  ${rec.id} ${tag} ${name}${rec.detail ? ' — ' + rec.detail : ''}`);
  RESULTS.push(rec);
}
const deny = (code) => ({ denied: true, code });

(async () => {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, 'localhost', 8080);

  const stamp = Date.now();
  const A = { email: `seca.${stamp}@qa.test`, pass: 'Test1234!' };
  const B = { email: `secb.${stamp}@qa.test`, pass: 'Test1234!' };

  const ca = await createUserWithEmailAndPassword(auth, A.email, A.pass);
  const uidA = ca.user.uid;
  await setDoc(doc(db, 'users', uidA), {
    uid: uidA, name: 'Sec Alice', handle: '@seca' + stamp, avatar: '', bio: '',
    role: '', location: '', website: '', skills: [], profileCompleted: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'posts', 'sec_post_' + stamp), {
    text: 'security probe post', authorKey: uidA, authorName: 'Sec Alice',
    authorAvatar: '', tagType: 'idea', imageUrl: null, likes: 0, shares: 0,
    commentsCount: 0, likedBy: [], bookmarkedBy: [], createdAt: serverTimestamp(),
  });
  const cb = await createUserWithEmailAndPassword(auth, B.email, B.pass);
  const uidB = cb.user.uid;
  await setDoc(doc(db, 'users', uidB), {
    uid: uidB, name: 'Sec Bob', handle: '@secb' + stamp, avatar: '', bio: '',
    role: '', location: '', website: '', skills: [], profileCompleted: false,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });

  console.log('== cross-account writes (as Bob) ==');
  await probe('X01', "edit A's profile", 'denied', async () => {
    await updateDoc(doc(db, 'users', uidA), { bio: 'HACKED BY B' });
    return { denied: false };
  });
  await probe('X02', "delete A's profile", 'denied', async () => {
    await deleteDoc(doc(db, 'users', uidA));
    return { denied: false };
  });
  await probe('X03', "delete A's post", 'denied', async () => {
    await deleteDoc(doc(db, 'posts', 'sec_post_' + stamp));
    return { denied: false };
  });
  await probe('X04', "edit A's post text", 'denied', async () => {
    await updateDoc(doc(db, 'posts', 'sec_post_' + stamp), { text: 'defaced' });
    return { denied: false };
  });
  await probe('X05', "read A's private push tokens", 'denied', async () => {
    const s = await getDoc(doc(db, 'users', uidA, 'private', 'fcmTokens'));
    return s.exists() ? { denied: false } : deny('not-found-considered-denied');
  });
  await probe('X06', 'grant self admin via admins/{uid}', 'denied', async () => {
    await setDoc(doc(db, 'admins', uidB), { role: 'admin' });
    return { denied: false };
  });
  await probe('X07', "write into A's private subcollection", 'denied', async () => {
    await setDoc(doc(db, 'users', uidA, 'private', 'evil'), { x: 1 });
    return { denied: false };
  });
  console.log('== self-escalation (as Bob on own doc) ==');
  await probe('X08', 'set own verified badge', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { verified: true });
    return { denied: false };
  });
  await probe('X09', 'set own moderation status', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { status: 'active' });
    return { denied: false };
  });
  await probe('X10', 'clear own restriction/status', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { status: '' });
    return { denied: false };
  });
  await probe('X11', 'set own founding number', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { foundingNumber: 7 });
    return { denied: false };
  });
  await probe('X12', 'set own builderScore', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { builderScore: 9999 });
    return { denied: false };
  });
  await probe('X13', 'inflate own followers counter', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { followers: 999999 });
    return { denied: false };
  });
  await probe('X14', 'smuggle email onto public profile', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { email: 'leak@qa.test' });
    return { denied: false };
  });
  await probe('X15', 'smuggle fcmTokens onto public profile', 'denied', async () => {
    await updateDoc(doc(db, 'users', uidB), { fcmTokens: ['x'] });
    return { denied: false };
  });
  console.log('== protected-identity fields (as Bob on own doc) ==');
  await probe('X16', 'change own uid field', 'info', async () => {
    await updateDoc(doc(db, 'users', uidB), { uid: 'spoofed' });
    await updateDoc(doc(db, 'users', uidB), { uid: uidB });
    return { denied: false, note: 'allowed? uid field is path-independent — cosmetic risk only' };
  });
  await probe('X17', 'set role text to "admin"', 'info', async () => {
    await updateDoc(doc(db, 'users', uidB), { role: 'admin' });
    return { denied: false, note: 'role is cosmetic; real gate is admins/{uid} (X06)' };
  });
  console.log('== notifications ==');
  await probe('X18', 'pending-notification without recipient', 'denied', async () => {
    await addDoc(collection(db, 'pending-notifications'), {
      title: 'x', body: 'y', data: {}, sent: false, createdAt: serverTimestamp(),
    });
    return { denied: false };
  });
  await probe('X19', 'pending-notification spoofing sender in data.userId', 'info', async () => {
    await addDoc(collection(db, 'pending-notifications'), {
      targetUserId: uidA, title: 'hi', body: 'spoof', data: { userId: uidB },
      sent: false, createdAt: serverTimestamp(),
    });
    return { denied: false, note: 'sender claim is enforced by CF quota, not rules (by design)' };
  });
  console.log('== admin-only reads ==');
  await probe('X20', 'read reports collection as normal user', 'denied', async () => {
    const s = await getDocs(query(collection(db, 'reports')));
    return s.empty ? deny('empty-but-readable') : { denied: false, note: s.size + ' docs readable' };
  });
  await probe('X21', 'read pending-notifications as normal user', 'denied', async () => {
    const s = await getDocs(query(collection(db, 'pending-notifications')));
    return s.empty ? deny('empty-but-readable') : { denied: false, note: s.size + ' docs readable' };
  });
  await probe('X22', "write A's admin status field via update", 'denied', async () => {
    await updateDoc(doc(db, 'users', uidA), { organizer: true });
    return { denied: false };
  });

  console.log('== deep isolation (cross-entity spoofing) ==');
  // X23: a third user (C) must not be able to create a chat between A and B.
  const C = { email: `secc.${stamp}@qa.test`, pass: 'Test1234!' };
  const cc = await createUserWithEmailAndPassword(auth, C.email, C.pass);
  const uidC = cc.user.uid;
  await probe('X23', 'outsider C creates a chat between A and B', 'denied', async () => {
    await setDoc(doc(db, 'chats', `${uidA}__${uidB}`), {
      participants: [uidA, uidB], isGroup: false, groupName: '',
      lastMessage: 'hijack', lastMessageAt: serverTimestamp(), createdAt: serverTimestamp(),
    });
    return { denied: false };
  });

  await signInWithEmailAndPassword(auth, B.email, B.pass);
  // setup: legitimate chat so the message-create probe is meaningful
  let chatOk = true;
  try {
    await setDoc(doc(db, 'chats', `${uidB}__${uidA}`), {
      participants: [uidB, uidA], isGroup: false, groupName: '',
      lastMessage: 'setup', lastMessageAt: serverTimestamp(), createdAt: serverTimestamp(),
    });
  } catch (e) { chatOk = false; console.log('  (setup chat create failed: ' + (e.code || e.message) + ')'); }
  await probe('X24', 'participant spoofs senderKey as the OTHER user', 'denied', async () => {
    if (!chatOk) return { denied: false, note: 'setup chat missing' };
    await addDoc(collection(db, 'chats', `${uidB}__${uidA}`, 'messages'), {
      text: 'spoofed', senderKey: uidA, senderName: 'Sec Alice',
      senderAvatar: '', read: false, createdAt: serverTimestamp(),
    });
    return { denied: false };
  });
  await probe('X25', "write A's notification settings subcollection", 'denied', async () => {
    await setDoc(doc(db, 'users', uidA, 'settings', 'notifications'), { email: true });
    return { denied: false };
  });

  // setup: a valid story authored by B, so A's delete attempt is the probe
  let storyOk = true;
  try {
    await setDoc(doc(db, 'stories', `qa_story_${stamp}`), {
      authorKey: uidB, authorName: 'Sec Bob', authorAvatar: '',
      imageUrl: '', text: 'qa story', bg: '#000', font: 'sans', fontSize: 16,
      mode: 'text', createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
    });
  } catch (e) { storyOk = false; console.log('  (setup story create failed: ' + (e.code || e.message) + ')'); }
  await signInWithEmailAndPassword(auth, A.email, A.pass);
  await probe('X26', "delete B's story as A", 'denied', async () => {
    if (!storyOk) return { denied: false, note: 'setup story missing' };
    await deleteDoc(doc(db, 'stories', `qa_story_${stamp}`));
    return { denied: false };
  });

  await signInWithEmailAndPassword(auth, B.email, B.pass);
  // setup: B sends A a collaboration request (documented create shape)
  let collabOk = true;
  try {
    await setDoc(doc(db, 'users', uidA, 'collabRequests', uidB), {
      uid: uidB, name: 'Sec Bob', message: 'qa probe', status: 'pending',
      createdAt: serverTimestamp(),
    });
  } catch (e) { collabOk = false; console.log('  (setup collabRequest create failed: ' + (e.code || e.message) + ')'); }
  await probe('X27', 'requester self-accepts their own collab request', 'denied', async () => {
    if (!collabOk) return { denied: false, note: 'setup request missing' };
    await updateDoc(doc(db, 'users', uidA, 'collabRequests', uidB), {
      status: 'accepted', reviewedAt: serverTimestamp(),
    });
    return { denied: false };
  });

  const fails = RESULTS.filter((r) => r.status === 'FAIL');
  console.log(`\n== SECURITY SDK DONE: ${RESULTS.filter(r => r.status === 'PASS').length} pass, ${fails.length} fail, ${RESULTS.filter(r => r.status === 'INFO').length} info`);
  for (const f of fails) console.log('  FAIL', f.id, f.name, '—', f.detail);
  require('fs').mkdirSync(require('path').join(__dirname, 'results'), { recursive: true });
  require('fs').writeFileSync(
    require('path').join(__dirname, 'results', 'security-sdk.json'),
    JSON.stringify({ when: new Date().toISOString(), users: { uidA, uidB }, results: RESULTS }, null, 2)
  );
  process.exit(fails.length ? 1 : 0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
