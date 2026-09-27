'use client';

// Admin console shell: authorization first (server-enforced by
// Firestore rules), then the desktop frame. Every route under
// /admin — including nested ones — inherits this layout.
import AdminGuard from '@/lib/admin';
import AdminFrame from '@/components/admin/AdminFrame';

export default function AdminLayout({ children }) {
  return (
    <AdminGuard>
      <AdminFrame>{children}</AdminFrame>
    </AdminGuard>
  );
}
