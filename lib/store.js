'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createPost, toggleLikePost, addComment as addPostComment, toggleFollowUser as toggleFollowFS, sendMessage as sendChatMessage, bookmarkPost } from './firestore';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  Object.freeze = (obj) => obj;
  const devtools = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
  if (devtools) window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ = undefined;
  const origProto = Object.prototype;
  const suspect = ['__proto__', 'constructor', 'prototype'];
  Object.defineProperty(origProto, '__defineGetter__', { value: undefined });
  Object.defineProperty(origProto, '__defineSetter__', { value: undefined });
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useStore = create(
  persist(
    (set, get) => ({
      // ---------- auth ----------
      isLoggedIn: false,
      sessionExpiry: null,
      profile: { id: null, name: '', handle: '', email: '', avatar: '', bio: '', role: '', location: '' },

      login: (userData) => {
        const name = userData.displayName || userData.email.split('@')[0];
        const profile = {
          id: userData.uid,
          name,
          handle: '@' + name.toLowerCase().replace(/\s+/g, ''),
          email: userData.email,
          avatar: userData.photoURL || `https://i.pravatar.cc/160?u=${userData.uid}`,
          bio: '',
          role: '',
          location: '',
        };
        if (typeof window !== 'undefined') localStorage.removeItem('foundators-storage');
        set({
          isLoggedIn: true,
          sessionExpiry: Date.now() + 24 * 60 * 60 * 1000,
          profile,
          posts: [],
          contacts: {},
          notifications: [],
          unreadByContact: {},
          likedPosts: {},
          bookmarkedPosts: {},
          followedUsers: {},
          followedStartups: {},
          stories: [],
          commentsByPost: {},
          messages: [],
          discussions: {},
          gestures: [],
          communityTemplates: [],
          collabGestures: [],
          templateRemixes: {},
          templateComments: {},
          featuredTemplates: [],
          templateAnalytics: {},
          premiumTemplates: {},
          templatePrice: {},
          creatorEarnings: {},
          creatorStats: {},
          followedCreators: {},
        });
      },
      logout: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('foundators-storage');
        set({
          isLoggedIn: false,
          sessionExpiry: null,
          profile: { id: null, name: '', handle: '', email: '', avatar: '', bio: '', role: '', location: '' },
          posts: [],
          likedPosts: {},
          bookmarkedPosts: {},
          commentsByPost: {},
          discussions: {},
          contacts: {},
          notifications: [],
          messages: [],
          settings: {
            pushNotifications: true,
            emailDigest: false,
            commentAlerts: true,
            privateProfile: false,
            showOnlineStatus: true,
          },
          followedUsers: {},
          followedStartups: {},
          unreadByContact: {},
          stories: [],
          gestures: [],
          savedCollections: [
            { id: 'all', name: 'All Saved', icon: '📌' },
            { id: 'inspiration', name: 'Inspiration', icon: '💡' },
            { id: 'tutorials', name: 'Tutorials', icon: '📚' },
          ],
          communityTemplates: [],
          collabGestures: [],
          templateRemixes: {},
          templateComments: {},
          featuredTemplates: [],
          templateAnalytics: {},
          premiumTemplates: {},
          templatePrice: {},
          creatorEarnings: {},
          creatorStats: {},
          followedCreators: {},
        });
      },
      updateBio: (bio) => set((s) => ({ profile: { ...s.profile, bio } })),

      // ---------- profile editing ----------
      updateProfile: (fields) => set((s) => ({ profile: { ...s.profile, ...fields } })),

      // ---------- posts ----------
      posts: [],
      likedPosts: {},
      bookmarkedPosts: {},
      commentsByPost: {},

      publishPost: ({ text, tagType, imageUrl }) => {
        const id = makeId('post');
        const p = get().profile;
        const newPost = {
          id,
          authorKey: p.id,
          authorName: p.name,
          authorAvatar: p.avatar,
          tagType,
          text,
          imageUrl: imageUrl || null,
          meta: `Founder · Foundators · Just now`,
          cats: [],
          likes: 0,
          shares: 0,
        };
        set((s) => ({
          posts: [newPost, ...s.posts],
          commentsByPost: { ...s.commentsByPost, [id]: [] },
        }));
        createPost({ text, authorKey: p.id, authorName: p.name, authorAvatar: p.avatar, tagType, imageUrl }).catch(() => {});
        return id;
      },

      toggleLike: (postId) => {
        set((s) => {
          const isLiked = !!s.likedPosts[postId];
          const nextLiked = { ...s.likedPosts };
          if (isLiked) delete nextLiked[postId];
          else nextLiked[postId] = true;
          const posts = s.posts.map((p) =>
            p.id === postId ? { ...p, likes: p.likes + (isLiked ? -1 : 1) } : p
          );
          return { likedPosts: nextLiked, posts };
        });
        toggleLikePost(postId, get().profile.id).catch(() => {});
      },

      toggleBookmark: (postId) => {
        set((s) => {
          const next = { ...s.bookmarkedPosts };
          if (next[postId]) delete next[postId];
          else next[postId] = true;
          return { bookmarkedPosts: next };
        });
        bookmarkPost(postId, get().profile.id).catch(() => {});
      },

      addComment: (postId, text, replyTo) => {
        const p = get().profile;
        const commentId = makeId('comment');
        set((s) => ({
          commentsByPost: {
            ...s.commentsByPost,
            [postId]: [...(s.commentsByPost[postId] || []), {
              id: commentId,
              who: p.id,
              text,
              replyTo: replyTo || null,
              time: 'now',
              likes: 0,
              likedByMe: false,
            }],
          },
        }));
        addPostComment(postId, { text, authorKey: p.id, authorName: p.name, authorAvatar: p.avatar, replyTo }).catch(() => {});
      },

      editComment: (postId, commentId, newText) => {
        set((s) => ({
          commentsByPost: {
            ...s.commentsByPost,
            [postId]: (s.commentsByPost[postId] || []).map((c) =>
              c.id === commentId ? { ...c, text: newText, edited: true } : c
            ),
          },
        }));
      },

      deleteComment: (postId, commentId) => {
        set((s) => ({
          commentsByPost: {
            ...s.commentsByPost,
            [postId]: (s.commentsByPost[postId] || []).filter((c) => c.id !== commentId && c.replyTo !== commentId),
          },
        }));
      },

      toggleCommentLike: (postId, commentId) => {
        set((s) => ({
          commentsByPost: {
            ...s.commentsByPost,
            [postId]: (s.commentsByPost[postId] || []).map((c) =>
              c.id === commentId ? { ...c, likedByMe: !c.likedByMe, likes: c.likes + (c.likedByMe ? -1 : 1) } : c
            ),
          },
        }));
      },

      sortComments: (postId, sortBy) => {
        set((s) => {
          const comments = [...(s.commentsByPost[postId] || [])];
          if (sortBy === 'newest') comments.sort((a, b) => (b.id > a.id ? 1 : -1));
          else if (sortBy === 'oldest') comments.sort((a, b) => (a.id > b.id ? 1 : -1));
          else if (sortBy === 'popular') comments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
          return { commentsByPost: { ...s.commentsByPost, [postId]: comments } };
        });
      },

      deletePost: (postId) => {
        set((s) => ({
          posts: s.posts.filter((p) => p.id !== postId),
        }));
      },

      editPost: (postId, newText) => {
        set((s) => ({
          posts: s.posts.map((p) => p.id === postId ? { ...p, text: newText } : p),
        }));
      },

      repost: (postId) => {
        set((s) => {
          const post = s.posts.find((p) => p.id === postId);
          if (!post) return {};
          const repost = {
            ...post,
            id: makeId('post'),
            authorKey: get().profile.id,
            repostedFrom: postId,
            meta: `Reposted from ${post.authorKey} · Just now`,
          };
          return { posts: [repost, ...s.posts] };
        });
      },

      // ---------- saved collections ----------
      savedCollections: [
        { id: 'all', name: 'All Saved', icon: '📌' },
        { id: 'inspiration', name: 'Inspiration', icon: '💡' },
        { id: 'tutorials', name: 'Tutorials', icon: '📚' },
      ],

      addSavedCollection: (name) => {
        set((s) => ({
          savedCollections: [...s.savedCollections, { id: makeId('col'), name, icon: '📁' }],
        }));
      },

      deleteSavedCollection: (id) => {
        set((s) => ({
          savedCollections: s.savedCollections.filter((c) => c.id !== id),
        }));
      },

      // ---------- stories ----------
      stories: [],
      addStory: (story) => {
        set((s) => ({
          stories: [...s.stories, { id: makeId('story'), ...story, createdAt: Date.now() }],
        }));
      },
      deleteStory: (id) => {
        set((s) => ({
          stories: s.stories.filter((st) => st.id !== id),
        }));
      },

      // ---------- moderation ----------
      mutedUsers: {},
      restrictedUsers: {},

      toggleMuteUser: (key) => {
        set((s) => {
          const next = { ...s.mutedUsers };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { mutedUsers: next };
        });
      },

      toggleRestrictUser: (key) => {
        set((s) => {
          const next = { ...s.restrictedUsers };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { restrictedUsers: next };
        });
      },

      // ---------- polls ----------
      polls: {},
      pollVotes: {},

      votePoll: (postId, optionIndex) => {
        set((s) => {
          const existing = s.pollVotes[postId];
          if (existing !== undefined) return {};
          return {
            pollVotes: { ...s.pollVotes, [postId]: optionIndex },
          };
        });
      },

      // ---------- discussions ----------
      discussions: {},

      addDiscussionComment: (discId, text) => {
        set((s) => {
          if (!s.discussions[discId]) return {};
          return {
            discussions: {
              ...s.discussions,
              [discId]: {
                ...s.discussions[discId],
                comments: [...s.discussions[discId].comments, { who: get().profile.id, text }],
              },
            },
          };
        });
      },

      // ---------- follows ----------
      followedUsers: {},
      followedStartups: {},

      toggleFollowUser: (key) => {
        set((s) => {
          const next = { ...s.followedUsers };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { followedUsers: next };
        });
        toggleFollowFS(get().profile.id, key).catch(() => {});
      },

      toggleFollowStartup: (key) => {
        set((s) => {
          const next = { ...s.followedStartups };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { followedStartups: next };
        });
      },

      // ---------- contacts / chat ----------
      contacts: {},
      unreadByContact: {},

      markContactRead: (contactKey) => {
        set((s) => {
          const next = { ...s.unreadByContact };
          delete next[contactKey];
          return { unreadByContact: next };
        });
      },

      sendMessage: (contactKey, text) => {
        const p = get().profile;
        set((s) => {
          const contact = s.contacts[contactKey];
          if (!contact) return {};
          return {
            contacts: {
              ...s.contacts,
              [contactKey]: {
                ...contact,
                messages: [...contact.messages, { id: makeId('msg'), who: p.id, text, time: 'Now' }],
              },
            },
          };
        });
        sendChatMessage(contactKey, { text, senderKey: p.id, senderName: p.name, senderAvatar: p.avatar }).catch(() => {});
      },

      deleteMessage: (contactKey, msgIndex) => {
        set((s) => {
          const contact = s.contacts[contactKey];
          if (!contact) return {};
          return {
            contacts: {
              ...s.contacts,
              [contactKey]: {
                ...contact,
                messages: contact.messages.filter((_, i) => i !== msgIndex),
              },
            },
          };
        });
      },

      attachFile: (contactKey) => {
        set((s) => {
          const contact = s.contacts[contactKey];
          if (!contact) return {};
          return {
            contacts: {
              ...s.contacts,
              [contactKey]: {
                ...contact,
                messages: [
                  ...contact.messages,
                  { who: 'file', name: 'Design_Assets.zip', size: '3.4 MB', time: 'Now' },
                ],
              },
            },
          };
        });
      },

      // Finds an existing contact by name, or a known user by name, or creates a
      // brand-new generic contact. Returns the resolved contact key.
      startOrFindConversation: (query) => {
        const lower = query.trim().toLowerCase();
        if (!lower) return null;
        const state = get();
        const existingKey = Object.keys(state.contacts).find((k) =>
          state.contacts[k].name.toLowerCase().includes(lower)
        );
        if (existingKey) return existingKey;

        // fall back to any known USERS-derived key by name lookup happens in the
        // component (it has access to USERS); here we just create a fresh contact.
        const key = makeId('contact');
        set((s) => ({
          contacts: {
            ...s.contacts,
            [key]: {
              name: query.trim(),
              avatar: `https://i.pravatar.cc/160?img=${20 + Math.floor(Math.random() * 40)}`,
              online: true,
              status: 'Online',
              lastActive: 'Now',
              messages: [],
            },
          },
        }));
        return key;
      },

      ensureContactForUser: (userKey, userData) => {
        const state = get();
        if (state.contacts[userKey]) return userKey;
        set((s) => ({
          contacts: {
            ...s.contacts,
            [userKey]: {
              name: userData.name,
              avatar: userData.avatar,
              online: true,
              status: 'Online',
              lastActive: 'Now',
              messages: [],
            },
          },
        }));
        return userKey;
      },

      // ---------- notifications ----------
      notifications: [],

      markAllNotificationsRead: () => {
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        }));
      },

      unreadNotificationCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },

      // ---------- settings ----------
      settings: {
        pushNotifications: true,
        emailDigest: false,
        commentAlerts: true,
        privateProfile: false,
        showOnlineStatus: true,
      },

      // ---------- blocking / reporting ----------
      blockedUsers: {},
      reports: [],

      blockUser: (userKey) => {
        set((s) => {
          const next = { ...s.blockedUsers };
          if (next[userKey]) delete next[userKey];
          else next[userKey] = true;
          return { blockedUsers: next };
        });
      },

      reportItem: (item) => {
        set((s) => ({
          reports: [...s.reports, { ...item, time: new Date().toISOString() }],
        }));
      },

      // ---------- gestures ----------
      gestures: [],
      viewedGestures: {},

      createGesture: ({ templateKey, customizations }) => {
        const id = makeId('gesture');
        const gesture = {
          id,
          templateKey,
          authorKey: get().profile.id,
          customizations,
          createdAt: new Date().toISOString(),
          reactions: { love: 0, celebrate: 0, laugh: 0, cry: 0 },
          shares: 0,
          views: 0,
        };
        set((s) => ({ gestures: [gesture, ...s.gestures] }));
        return id;
      },

      reactToGesture: (gestureId, reactionType) => {
        set((s) => ({
          gestures: s.gestures.map((g) =>
            g.id === gestureId
              ? { ...g, reactions: { ...g.reactions, [reactionType]: (g.reactions[reactionType] || 0) + 1 } }
              : g
          ),
        }));
      },

      incrementGestureViews: (gestureId) => {
        set((s) => {
          if (s.viewedGestures[gestureId]) return {};
          return {
            gestures: s.gestures.map((g) =>
              g.id === gestureId ? { ...g, views: g.views + 1 } : g
            ),
            viewedGestures: { ...s.viewedGestures, [gestureId]: true },
          };
        });
      },

      // ---------- community templates ----------
      communityTemplates: [
        {
          id: 'ct_1',
          name: 'Neon Dreams',
          description: 'Glowing neon text with particle effects',
          category: 'hi',
          authorKey: 'arjun',
          code: `function NeonDreams({ name, message, theme }) {
  return (
    <div style={{ background: '#0a0a1a', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ color: '#00f', fontSize: '36px', fontWeight: 900, textShadow: '0 0 10px #00f, 0 0 40px #00f', animation: 'flicker 3s infinite' }}>
        HELLO!
      </div>
      <div style={{ color: '#fff', fontSize: '18px', marginTop: '16px' }}>{name}</div>
      <div style={{ color: '#aaa', fontSize: '12px', marginTop: '8px' }}>{message}</div>
    </div>
  );
}`,
          stars: 24,
          forks: 8,
          starredBy: {},
          createdAt: '2026-08-28',
        },
        {
          id: 'ct_2',
          name: 'Rose Petals',
          description: 'Falling petals with romantic glow',
          category: 'propose',
          authorKey: 'meera',
          code: `function RosePetals({ name, message }) {
  return (
    <div style={{ background: '#1a0a10', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ fontSize: '48px', animation: 'float 3s ease-in-out infinite' }}>🌹</div>
      <div style={{ color: '#e91e8c', fontSize: '20px', fontWeight: 900, marginTop: '16px' }}>{name}</div>
      <div style={{ color: '#aaa', fontSize: '12px', marginTop: '8px' }}>{message}</div>
    </div>
  );
}`,
          stars: 18,
          forks: 5,
          starredBy: {},
          createdAt: '2026-08-29',
        },
        {
          id: 'ct_3',
          name: 'Confetti Burst',
          description: 'Explosive confetti celebration',
          category: 'birthday',
          authorKey: 'rohan',
          code: `function ConfettiBurst({ name, message }) {
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ fontSize: '14px', fontWeight: 900, color: '#D9AC3D', letterSpacing: '0.1em' }}>🎉 IT'S YOUR DAY 🎉</div>
      <div style={{ color: '#fff', fontSize: '32px', fontWeight: 900, marginTop: '12px' }}>{name}</div>
      <div style={{ color: '#aaa', fontSize: '12px', marginTop: '12px' }}>{message}</div>
    </div>
  );
}`,
          stars: 31,
          forks: 12,
          starredBy: {},
          createdAt: '2026-08-30',
        },
      ],

      publishTemplate: (template) => {
        const newTemplate = {
          ...template,
          id: makeId('ct'),
          authorKey: get().profile.id,
          css: template.css || '',
          stars: 0,
          forks: 0,
          starredBy: {},
          createdAt: new Date().toISOString().split('T')[0],
        };
        set((s) => ({ communityTemplates: [newTemplate, ...s.communityTemplates] }));
        return newTemplate.id;
      },

      forkTemplate: (templateId) => {
        set((s) => ({
          communityTemplates: s.communityTemplates.map((t) =>
            t.id === templateId ? { ...t, forks: t.forks + 1 } : t
          ),
        }));
      },

      starTemplate: (templateId, userKey) => {
        set((s) => ({
          communityTemplates: s.communityTemplates.map((t) => {
            if (t.id !== templateId) return t;
            const starred = t.starredBy?.[userKey];
            return {
              ...t,
              stars: starred ? t.stars - 1 : t.stars + 1,
              starredBy: { ...t.starredBy, [userKey]: !starred },
            };
          }),
        }));
      },

      // ---------- collaborative gestures ----------
      collabGestures: [
        {
          id: 'collab_1',
          title: "Rohan's Birthday Card",
          templateKey: 'birthday-cake',
          category: 'birthday',
          ownerKey: 'arjun',
          recipients: ['rohan'],
          signatures: [
            { authorKey: 'arjun', name: 'Arjun', message: 'Happy birthday bro! Let us build something amazing together this year.', createdAt: '2026-08-28' },
            { authorKey: 'meera', name: 'Meera', message: 'Wishing you all the best! You deserve the world.', createdAt: '2026-08-28' },
          ],
          maxSigners: 20,
          deadline: '2026-09-15',
          themeKey: 'gold',
          createdAt: '2026-08-28',
          isOpen: true,
        },
      ],

      createCollab: ({ title, templateKey, category, recipients, themeKey, deadline }) => {
        const collab = {
          id: makeId('collab'),
          title,
          templateKey,
          category,
          ownerKey: get().profile.id,
          recipients,
          signatures: [],
          maxSigners: 20,
          deadline,
          themeKey,
          createdAt: new Date().toISOString().split('T')[0],
          isOpen: true,
        };
        set((s) => ({ collabGestures: [collab, ...s.collabGestures] }));
        return collab.id;
      },

      signCollab: (collabId, { name, message }) => {
        set((s) => ({
          collabGestures: s.collabGestures.map((c) =>
            c.id === collabId
              ? { ...c, signatures: [...c.signatures, { authorKey: get().profile.id, name, message, createdAt: new Date().toISOString().split('T')[0] }] }
              : c
          ),
        }));
      },

      closeCollab: (collabId) => {
        set((s) => ({
          collabGestures: s.collabGestures.map((c) =>
            c.id === collabId ? { ...c, isOpen: false } : c
          ),
        }));
      },

      // ---------- creator profiles ----------
      followedCreators: {},
      creatorStats: {},

      toggleFollowCreator: (creatorKey) => {
        set((s) => {
          const followed = s.followedCreators?.[creatorKey];
          return {
            followedCreators: { ...s.followedCreators, [creatorKey]: !followed },
          };
        });
      },

      getCreatorStats: (creatorKey) => {
        const s = get();
        const templates = s.communityTemplates.filter((t) => t.authorKey === creatorKey);
        const collabs = s.collabGestures.filter((c) => c.ownerKey === creatorKey);
        const totalStars = templates.reduce((sum, t) => sum + (t.stars || 0), 0);
        const totalForks = templates.reduce((sum, t) => sum + (t.forks || 0), 0);
        return {
          templateCount: templates.length,
          collabCount: collabs.length,
          totalStars,
          totalForks,
          isFollowed: !!s.followedCreators?.[creatorKey],
        };
      },

      // ---------- template remix history ----------
      templateRemixes: {
        ct_1: [
          { id: 'remix_1', forkedBy: 'meera', forkedAt: '2026-08-29', changes: 'Changed colors to pink theme' },
          { id: 'remix_2', forkedBy: 'rohan', forkedAt: '2026-08-30', changes: 'Added particle effects' },
        ],
      },

      recordRemix: (templateId, { forkedBy, changes }) => {
        set((s) => ({
          templateRemixes: {
            ...s.templateRemixes,
            [templateId]: [
              ...(s.templateRemixes?.[templateId] || []),
              { id: makeId('remix'), forkedBy, forkedAt: new Date().toISOString().split('T')[0], changes },
            ],
          },
        }));
      },

      // ---------- template comments ----------
      templateComments: {
        ct_1: [
          { id: 'tc_1', authorKey: 'meera', text: 'This is beautiful! Love the glow effect.', createdAt: '2026-08-29', likes: 3 },
          { id: 'tc_2', authorKey: 'rohan', text: 'How did you do the particle animation?', createdAt: '2026-08-30', likes: 1 },
        ],
      },

      addTemplateComment: (templateId, { authorKey, text }) => {
        set((s) => ({
          templateComments: {
            ...s.templateComments,
            [templateId]: [
              ...(s.templateComments?.[templateId] || []),
              { id: makeId('tc'), authorKey, text, createdAt: new Date().toISOString().split('T')[0], likes: 0 },
            ],
          },
        }));
      },

      likeComment: (templateId, commentId) => {
        set((s) => ({
          templateComments: {
            ...s.templateComments,
            [templateId]: (s.templateComments?.[templateId] || []).map((c) =>
              c.id === commentId ? { ...c, likes: c.likes + 1 } : c
            ),
          },
        }));
      },

      // ---------- featured templates ----------
      featuredTemplates: ['ct_1', 'ct_3'],

      toggleFeatured: (templateId) => {
        set((s) => ({
          featuredTemplates: s.featuredTemplates.includes(templateId)
            ? s.featuredTemplates.filter((id) => id !== templateId)
            : [...s.featuredTemplates, templateId],
        }));
      },

      // ---------- template analytics ----------
      templateAnalytics: {},

      recordTemplateView: (templateId) => {
        set((s) => {
          const today = new Date().toISOString().split('T')[0];
          const current = s.templateAnalytics?.[templateId] || {};
          const todayViews = current[today] || 0;
          return {
            templateAnalytics: {
              ...s.templateAnalytics,
              [templateId]: { ...current, [today]: todayViews + 1 },
            },
          };
        });
      },

      getTemplateAnalytics: (templateId) => {
        const s = get();
        const views = s.templateAnalytics?.[templateId] || {};
        const totalViews = Object.values(views).reduce((sum, v) => sum + v, 0);
        const dates = Object.keys(views).sort().slice(-7);
        const dailyViews = dates.map((d) => ({ date: d, views: views[d] }));
        const template = s.communityTemplates.find((t) => t.id === templateId);
        return {
          totalViews,
          dailyViews,
          stars: template?.stars || 0,
          forks: template?.forks || 0,
          comments: (s.templateComments?.[templateId] || []).length,
        };
      },

      premiumTemplates: {},
      templatePrice: {},

      setTemplatePrice: (templateId, price) => {
        set((s) => ({
          templatePrice: { ...s.templatePrice, [templateId]: price },
        }));
      },

      togglePremium: (templateId) => {
        set((s) => ({
          premiumTemplates: {
            ...s.premiumTemplates,
            [templateId]: !s.premiumTemplates?.[templateId],
          },
        }));
      },

      creatorEarnings: {},

      recordEarning: (creatorKey, amount) => {
        set((s) => ({
          creatorEarnings: {
            ...s.creatorEarnings,
            [creatorKey]: (s.creatorEarnings?.[creatorKey] || 0) + amount,
          },
        }));
      },

      getCreatorEarnings: (creatorKey) => {
        const s = get();
        return s.creatorEarnings?.[creatorKey] || 0;
      },

      // ---------- theme ----------
      theme: 'dark',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      toggleSetting: (key) => {
        set((s) => ({ settings: { ...s.settings, [key]: !s.settings[key] } }));
      },

      // ---------- ui: toast ----------
      toastMessage: null,
      toastId: 0,
      showToast: (msg) => {
        set((s) => ({ toastMessage: msg, toastId: s.toastId + 1 }));
      },

      // ---------- ui: drawer ----------
      isDrawerOpen: false,
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),

      // ---------- events ----------
      joinedEvents: {},
      toggleJoinEvent: (eventId) => set((s) => ({
        joinedEvents: { ...s.joinedEvents, [eventId]: !s.joinedEvents[eventId] }
      })),

      // ---------- challenges ----------
      challengeProgress: {},
      startChallenge: (challengeId) => set((s) => ({
        challengeProgress: { ...s.challengeProgress, [challengeId]: { started: true, startTime: Date.now(), completed: false } }
      })),
      completeChallenge: (challengeId) => set((s) => ({
        challengeProgress: { ...s.challengeProgress, [challengeId]: { ...s.challengeProgress[challengeId], completed: true, completedAt: Date.now() } }
      })),

      // ---------- ideas ----------
      ideaVotes: {},
      toggleIdeaVote: (ideaId) => set((s) => ({
        ideaVotes: { ...s.ideaVotes, [ideaId]: !s.ideaVotes[ideaId] }
      })),

      // ---------- file upload ----------
      uploadedFiles: {},
      uploadFile: (fileId, dataUrl) => set((s) => ({
        uploadedFiles: { ...s.uploadedFiles, [fileId]: dataUrl }
      })),
      getUploadedFile: (fileId) => get().uploadedFiles[fileId] || null,
    }),
    {
      name: 'foundators-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        theme: state.theme,
        settings: state.settings,
        savedCollections: state.savedCollections,
      }),
    }
  )
);
