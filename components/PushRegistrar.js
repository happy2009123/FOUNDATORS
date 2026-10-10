'use client';

// Push notifications were powered by Firebase Cloud Messaging. Supabase has
// no push replacement, so this registrar is intentionally a no-op during the
// migration. In-app notifications (the store's `notifications` list, driven
// by FirestoreProvider → Supabase realtime) continue to work as before.
// A future web-push implementation can restore this component.

export default function PushRegistrar() {
  return null;
}
