# Firebase Firestore Structure

## Collections

### users/{userId}
- name: string
- email: string
- handle: string
- avatar: string
- role: string
- bio: string
- skills: string[]
- location: string
- followers: number
- following: number
- createdAt: timestamp
- updatedAt: timestamp

### posts/{postId}
- authorKey: string (ref: users)
- content: string
- imageUrl: string (optional)
- likes: number
- comments: number
- createdAt: timestamp
- updatedAt: timestamp

### messages/{chatId}
- participants: string[] (refs: users)
- lastMessage: string
- lastMessageAt: timestamp
- unreadCount: map<userId, number>

### messages/{chatId}/messages/{messageId}
- senderKey: string (ref: users)
- text: string
- createdAt: timestamp
- read: boolean

### gestures/{gestureId}
- authorKey: string (ref: users)
- templateKey: string
- customizations: map
- createdAt: timestamp
- views: number
- shares: number

### community-templates/{templateId}
- authorKey: string (ref: users)
- name: string
- description: string
- category: string
- code: string
- css: string
- stars: number
- forks: number
- createdAt: timestamp

### collab-gestures/{collabId}
- ownerKey: string (ref: users)
- title: string
- templateKey: string
- recipients: string[]
- signatures: array
- isOpen: boolean
- deadline: timestamp
- createdAt: timestamp

### events/{eventId}
- name: string
- description: string
- date: timestamp
- location: string
- isOnline: boolean
- attendees: string[] (refs: users)
- createdAt: timestamp

### ideas/{ideaId}
- authorKey: string (ref: users)
- name: string
- description: string
- status: string
- upvotes: number
- downvotes: number
- comments: number
- createdAt: timestamp
