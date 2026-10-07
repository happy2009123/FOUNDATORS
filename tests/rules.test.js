'use strict';

// Firestore + Storage security rules regression suite.
// Run with:  npm run test:rules
// (starts the emulators, loads firestore.rules/storage.rules, then runs this file)

const { test, before, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDoc,
  increment,
  arrayUnion,
  serverTimestamp,
  runTransaction,
} = require('firebase/firestore');

const PROJECT_ID = 'demo-rules-test';
let env;

function db(ctx) {
  return ctx.firestore();
}

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });

  await env.withSecurityRulesDisabled(async (ctx) => {
    const d = db(ctx);
    const stamp = serverTimestamp();
    const user = (name) => ({
      name,
      handle: name.toLowerCase(),
      bio: '',
      avatar: '',
      role: 'Founder',
      location: '',
      updatedAt: stamp,
      status: 'active',
      verified: false,
      followers: 0,
      following: 0,
      invitedBy: '',
    });
    await setDoc(doc(d, 'users/alice'), { ...user('Alice'), invitedBy: '' });
    await setDoc(doc(d, 'users/bob'), { ...user('Bob'), invitedBy: 'alice' });
    await setDoc(doc(d, 'users/carol'), { ...user('Carol') });
    await setDoc(doc(d, 'users/dave'), { ...user('Dave'), invitedBy: '' });

    // admin marker for isAdmin()
    await setDoc(doc(d, 'admins/root'), { uid: 'root', at: stamp });

    // posts
    const post = {
      authorKey: 'alice',
      authorName: 'Alice',
      authorAvatar: '',
      text: 'hello world',
      tagType: 'update',
      imageUrl: null,
      likes: 0,
      likedBy: [],
      bookmarkedBy: [],
      commentsCount: 0,
      createdAt: stamp,
    };
    await setDoc(doc(d, 'posts/p1'), post);
    await setDoc(doc(d, 'posts/p2'), { ...post, text: 'second post' });

    await setDoc(doc(d, 'posts/p1/comments/c1'), {
      text: 'nice post',
      authorKey: 'alice',
      authorName: 'Alice',
      authorAvatar: '',
      replyTo: null,
      likes: 0,
      likedBy: [],
      edited: false,
      createdAt: stamp,
    });

    // chat between alice and bob
    await setDoc(doc(d, 'chats/alice__bob'), {
      participants: ['alice', 'bob'],
      participantNames: { alice: 'Alice', bob: 'Bob' },
      participantAvatars: { alice: '', bob: '' },
      isGroup: false,
      groupName: '',
      lastMessage: '',
      lastMessageAt: stamp,
      createdAt: stamp,
    });

    // reels
    await setDoc(doc(d, 'reels/r1'), {
      authorKey: 'alice',
      authorName: 'Alice',
      authorAvatar: '',
      videoUrl: 'https://cdn.example/v.mp4',
      text: 'my reel',
      effect: 'None',
      sound: 'None',
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: stamp,
    });
    await setDoc(doc(d, 'reels/r1/comments/rc1'), {
      text: 'cool',
      authorKey: 'alice',
      authorName: 'Alice',
      authorAvatar: '',
      likes: 0,
      likedBy: [],
      createdAt: stamp,
    });

    // voice room (bob hosting, bob already a speaker participant)
    await setDoc(doc(d, 'voiceRooms/room1'), {
      roomId: 'room1',
      hostId: 'bob',
      hostName: 'Bob',
      title: 'Test room',
      type: 'public',
      status: 'live',
      isLocked: false,
      createdAt: stamp,
    });
    await setDoc(doc(d, 'voiceRooms/room1/participants/bob'), {
      uid: 'bob',
      name: 'Bob',
      handle: 'bob',
      avatar: '',
      verified: true,
      role: 'speaker',
      status: 'joined',
      isMuted: false,
      raisedHand: false,
      joinedAt: stamp,
      joinedAtMs: Date.now(),
      lastActiveAt: stamp,
    });
  });
});

after(async () => {
  await env.cleanup();
});

test('firestore rules', async (t) => {
  const alice = env.authenticatedContext('alice');
  const bob = env.authenticatedContext('bob');
  const carol = env.authenticatedContext('carol');
  const root = env.authenticatedContext('root');
  const anon = env.unauthenticatedContext();

  await t.test('unauthenticated reads are denied', async () => {
    await assertFails(getDoc(doc(db(anon), 'users/alice')));
  });

  await t.test('posts: atomic like succeeds', async () => {
    await assertSucceeds(
      updateDoc(doc(db(bob), 'posts/p1'), {
        likedBy: arrayUnion('bob'),
        likes: increment(1),
      })
    );
  });

  await t.test('posts: likes without likedBy change fails', async () => {
    await assertFails(updateDoc(doc(db(bob), 'posts/p1'), { likes: increment(1) }));
  });

  await t.test('posts: wholesale likedBy rewrite fails', async () => {
    await assertFails(
      updateDoc(doc(db(bob), 'posts/p1'), {
        likedBy: ['bob', 'carol', 'dave'],
        likes: 3,
      })
    );
  });

  await t.test('posts: bookmark self-toggle succeeds', async () => {
    await assertSucceeds(
      updateDoc(doc(db(bob), 'posts/p1'), { bookmarkedBy: arrayUnion('bob') })
    );
  });

  await t.test('posts: commentsCount bump succeeds', async () => {
    await assertSucceeds(updateDoc(doc(db(bob), 'posts/p1'), { commentsCount: increment(1) }));
  });

  await t.test('posts: author content edit succeeds', async () => {
    await assertSucceeds(
      updateDoc(doc(db(alice), 'posts/p2'), {
        text: 'edited by author',
        updatedAt: serverTimestamp(),
      })
    );
  });

  await t.test('posts: non-author content edit fails', async () => {
    await assertFails(updateDoc(doc(db(bob), 'posts/p2'), { text: 'hacked' }));
  });

  await t.test('posts: author cannot rewrite engagement in same write', async () => {
    await assertFails(
      updateDoc(doc(db(alice), 'posts/p2'), { text: 'sneaky', likes: 9999 })
    );
  });

  await t.test('comments: create with full shape succeeds', async () => {
    await assertSucceeds(
      addDoc(collection(db(bob), 'posts/p1/comments'), {
        text: 'a comment',
        authorKey: 'bob',
        authorName: 'Bob',
        authorAvatar: '',
        replyTo: null,
        likes: 0,
        likedBy: [],
        edited: false,
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('comments: spoofed authorKey create fails', async () => {
    await assertFails(
      addDoc(collection(db(bob), 'posts/p1/comments'), {
        text: 'spoof',
        authorKey: 'alice',
        authorName: 'Alice',
        authorAvatar: '',
        replyTo: null,
        likes: 0,
        likedBy: [],
        edited: false,
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('comments: atomic like succeeds, bare like fails', async () => {
    await assertSucceeds(
      updateDoc(doc(db(bob), 'posts/p1/comments/c1'), {
        likedBy: arrayUnion('bob'),
        likes: increment(1),
      })
    );
    await assertFails(updateDoc(doc(db(bob), 'posts/p1/comments/c1'), { likes: 999 }));
  });

  await t.test('follow: full transaction (follow then unfollow) succeeds', async () => {
    const d = db(alice);
    await assertSucceeds(
      runTransaction(d, async (tx) => {
        const mine = doc(d, 'users/alice/following/bob');
        const theirs = doc(d, 'users/bob/followers/alice');
        const snap = await tx.get(mine);
        if (!snap.exists()) {
          tx.set(mine, { followedAt: serverTimestamp() });
          tx.set(theirs, { followedAt: serverTimestamp() });
          tx.update(doc(d, 'users/alice'), { following: increment(1) });
          tx.update(doc(d, 'users/bob'), { followers: increment(1) });
        }
      })
    );
    await assertSucceeds(
      runTransaction(d, async (tx) => {
        const mine = doc(d, 'users/alice/following/bob');
        const theirs = doc(d, 'users/bob/followers/alice');
        const snap = await tx.get(mine);
        if (snap.exists()) {
          tx.delete(mine);
          tx.delete(theirs);
          tx.update(doc(d, 'users/alice'), { following: increment(-1) });
          tx.update(doc(d, 'users/bob'), { followers: increment(-1) });
        }
      })
    );
  });

  await t.test('follow: anchored followers +1 fails; following is owner-only', async () => {
    // `followers` is anchored: a bare +1 with no record created in the
    // batch must be denied.
    await assertFails(updateDoc(doc(db(alice), 'users/bob'), { followers: increment(1) }));
    // `following` is owner-scoped (cosmetic counter): someone else can
    // never touch your counter.
    await assertFails(updateDoc(doc(db(bob), 'users/alice'), { following: increment(1) }));
  });

  await t.test('follow: counter -1 without deleting follow record fails', async () => {
    await assertFails(updateDoc(doc(db(alice), 'users/bob'), { followers: increment(-1) }));
  });

  await t.test('follow: owner cannot set followers/following to arbitrary values', async () => {
    await assertFails(updateDoc(doc(db(bob), 'users/bob'), { followers: 99999 }));
    await assertFails(updateDoc(doc(db(alice), 'users/alice'), { following: 99999 }));
  });

  await t.test('profile: owner content update succeeds; admin fields locked', async () => {
    await assertSucceeds(
      updateDoc(doc(db(alice), 'users/alice'), { bio: 'building things' })
    );
    await assertFails(updateDoc(doc(db(alice), 'users/alice'), { status: 'suspended' }));
    await assertFails(updateDoc(doc(db(alice), 'users/alice'), { verified: true }));
    await assertFails(updateDoc(doc(db(alice), 'users/alice'), { builderScore: 5000 }));
  });

  await t.test('profile: admin can moderate status', async () => {
    await assertSucceeds(updateDoc(doc(db(root), 'users/dave'), { status: 'restricted' }));
    await assertFails(updateDoc(doc(db(root), 'users/dave'), { arbitrary: 'field' }));
  });

  await t.test('chats: deterministic DM create succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(db(alice), 'chats/alice__carol'), {
        participants: ['alice', 'carol'],
        participantNames: { alice: 'Alice', carol: 'Carol' },
        participantAvatars: { alice: '', carol: '' },
        isGroup: false,
        groupName: '',
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('chats: create with mismatched doc ID fails', async () => {
    await assertFails(
      setDoc(doc(db(alice), 'chats/random123'), {
        participants: ['alice', 'carol'],
        participantNames: {},
        participantAvatars: {},
        isGroup: false,
        groupName: '',
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('chats: group create with group-sized ID succeeds', async () => {
    await assertSucceeds(
      setDoc(doc(db(alice), 'chats/alice__bob__carol'), {
        participants: ['alice', 'bob', 'carol'],
        participantNames: {},
        participantAvatars: {},
        isGroup: true,
        groupName: 'Trio',
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('chats: group create squatting a pair ID fails', async () => {
    await assertFails(
      setDoc(doc(db(alice), 'chats/alice__dave'), {
        participants: ['alice', 'bob', 'carol'],
        participantNames: {},
        participantAvatars: {},
        isGroup: true,
        groupName: 'Squat',
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('chats: metadata update succeeds', async () => {
    await assertSucceeds(
      updateDoc(doc(db(alice), 'chats/alice__bob'), {
        lastMessage: 'hi there',
        lastMessageAt: serverTimestamp(),
        unreadBy: { bob: 1 },
      })
    );
  });

  await t.test('chats: participants / createdAt are immutable', async () => {
    await assertFails(
      updateDoc(doc(db(alice), 'chats/alice__bob'), {
        participants: ['alice', 'bob', 'carol'],
      })
    );
    await assertFails(
      updateDoc(doc(db(alice), 'chats/alice__bob'), { createdAt: new Date() })
    );
    await assertFails(updateDoc(doc(db(alice), 'chats/alice__bob'), { isGroup: true }));
  });

  await t.test('notifications: honest actor succeeds, spoofed actor fails', async () => {
    const base = {
      type: 'like',
      actorName: 'Alice',
      text: 'Alice liked your post',
      linkType: 'post',
      linkId: 'p1',
      read: false,
      createdAt: serverTimestamp(),
    };
    await assertSucceeds(
      setDoc(doc(db(alice), 'users/bob/notifications/n1'), {
        ...base,
        actorKey: 'alice',
      })
    );
    await assertFails(
      setDoc(doc(db(alice), 'users/bob/notifications/n2'), {
        ...base,
        actorKey: 'carol',
      })
    );
  });

  await t.test('notifications: self-notification with third-party actor allowed', async () => {
    await assertSucceeds(
      setDoc(doc(db(alice), 'users/alice/notifications/n3'), {
        type: 'voice_reminder',
        actorKey: 'bob',
        actorName: 'Bob',
        text: 'room starts soon',
        linkType: 'voice_room',
        linkId: 'room1',
        read: false,
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('notifications: oversized text fails', async () => {
    await assertFails(
      setDoc(doc(db(alice), 'users/bob/notifications/n4'), {
        type: 'like',
        actorKey: 'alice',
        actorName: 'Alice',
        text: 'x'.repeat(1001),
        linkType: 'post',
        linkId: 'p1',
        read: false,
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('invites: invitedBy link required', async () => {
    const invite = (invitedUid) => ({
      invitedUid,
      invitedName: 'New Founder',
      joinedAt: serverTimestamp(),
      activated: false,
    });
    await assertSucceeds(
      setDoc(doc(db(bob), 'users/alice/invites/bob'), invite('alice'))
    );
    await assertFails(setDoc(doc(db(alice), 'users/alice/invites/dave'), invite('alice')));
    await assertFails(setDoc(doc(db(bob), 'users/alice/invites/bob2'), invite('carol')));
  });

  await t.test('analytics: actor must be caller', async () => {
    await assertSucceeds(
      addDoc(collection(db(alice), 'analytics'), {
        eventType: 'post_created',
        postId: 'p1',
        authorKey: 'alice',
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(
      addDoc(collection(db(alice), 'analytics'), {
        eventType: 'post_created',
        postId: 'p1',
        authorKey: 'carol',
        createdAt: serverTimestamp(),
      })
    );
  });

  await t.test('reels: author content edit succeeds; engagement writes denied', async () => {
    await assertSucceeds(
      updateDoc(doc(db(alice), 'reels/r1'), { text: 'updated caption' })
    );
    await assertFails(updateDoc(doc(db(bob), 'reels/r1'), { text: 'hacked' }));
    await assertFails(updateDoc(doc(db(bob), 'reels/r1'), { likes: 9999 }));
    await assertFails(updateDoc(doc(db(alice), 'reels/r1'), { likes: 9999 }));
    await assertFails(
      updateDoc(doc(db(alice), 'reels/r1'), { text: 'sneaky', shares: 50 })
    );
  });

  await t.test('reel comments: create, like, reply succeed; spoof fails', async () => {
    await assertSucceeds(
      addDoc(collection(db(bob), 'reels/r1/comments'), {
        text: 'first!',
        authorKey: 'bob',
        authorName: 'Bob',
        authorAvatar: '',
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      })
    );
    await assertFails(
      addDoc(collection(db(bob), 'reels/r1/comments'), {
        text: 'spoof',
        authorKey: 'alice',
        authorName: 'Alice',
        authorAvatar: '',
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp(),
      })
    );
    await assertSucceeds(
      updateDoc(doc(db(bob), 'reels/r1/comments/rc1'), {
        likedBy: arrayUnion('bob'),
        likes: increment(1),
      })
    );
    await assertSucceeds(
      updateDoc(doc(db(bob), 'reels/r1/comments/rc1'), {
        replies: arrayUnion({ id: 'r1', text: 'agree', authorKey: 'bob' }),
      })
    );
    await assertFails(
      updateDoc(doc(db(bob), 'reels/r1/comments/rc1'), { likes: 500 })
    );
  });

  await t.test('voice participants: presence update succeeds', async () => {
    await assertSucceeds(
      updateDoc(doc(db(bob), 'voiceRooms/room1/participants/bob'), {
        status: 'joined',
        name: 'Bob',
        avatar: '',
        lastActiveAt: serverTimestamp(),
      })
    );
  });

  await t.test('voice participants: self cannot flip verified or escalate role', async () => {
    await assertFails(
      updateDoc(doc(db(bob), 'voiceRooms/room1/participants/bob'), { verified: false })
    );
    await assertFails(
      updateDoc(doc(db(bob), 'voiceRooms/room1/participants/bob'), { role: 'coHost' })
    );
  });

  await t.test('pending-notifications: valid queue succeeds, bad recipient fails', async () => {
    const payload = {
      targetUserId: 'bob',
      title: 'Foundators',
      body: 'You have a new follower',
      data: { type: 'follow' },
      sent: false,
      createdAt: serverTimestamp(),
    };
    await assertSucceeds(
      addDoc(collection(db(alice), 'pending-notifications'), payload)
    );
    await assertFails(
      addDoc(collection(db(alice), 'pending-notifications'), {
        ...payload,
        targetUserId: 'no-such-user',
      })
    );
    await assertFails(
      addDoc(collection(db(alice), 'pending-notifications'), { ...payload, title: '' })
    );
  });

  await t.test('opportunities: non-admin cannot write; admin can', async () => {
    const opp = {
      title: 'Seed round',
      createdAt: serverTimestamp(),
    };
    await assertFails(addDoc(collection(db(alice), 'opportunities'), opp));
    await assertSucceeds(addDoc(collection(db(root), 'opportunities'), opp));
    await assertFails(
      setDoc(doc(db(alice), 'opportunities/x'), { nope: true, createdAt: serverTimestamp() })
    );
  });
});

test('storage rules', async (t) => {
  const alice = env.authenticatedContext('alice');
  const bob = env.authenticatedContext('bob');
  const anon = env.unauthenticatedContext();
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  await t.test('own post image upload succeeds', async () => {
    await assertSucceeds(
      alice.storage().ref('posts/alice/p9/img.png').put(png, { contentType: 'image/png' })
    );
  });

  await t.test("someone else's post path is denied", async () => {
    await assertFails(
      bob.storage().ref('posts/alice/p9/img.png').put(png, { contentType: 'image/png' })
    );
  });

  await t.test('non-image content type on post path fails', async () => {
    await assertFails(
      alice.storage().ref('posts/alice/p9/notes.txt').put(png, { contentType: 'text/plain' })
    );
  });

  await t.test('voice cover upload succeeds; anonymous upload fails', async () => {
    await assertSucceeds(
      alice.storage().ref('voice/covers/c1').put(png, { contentType: 'image/png' })
    );
    await assertFails(
      anon.storage().ref('voice/covers/c2').put(png, { contentType: 'image/png' })
    );
  });

  await t.test('reel video upload succeeds under owner path', async () => {
    await assertSucceeds(
      alice.storage().ref('reels/alice/1700000000').put(png, { contentType: 'video/mp4' })
    );
    await assertFails(
      bob.storage().ref('reels/alice/1700000001').put(png, { contentType: 'video/mp4' })
    );
  });
});
