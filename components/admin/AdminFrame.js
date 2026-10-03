'use client';

// ─────────────────────────────────────────────────────────────
// FOUNDATORS ADMIN — desktop frame
// ─────────────────────────────────────────────────────────────
// Fixed collapsible sidebar + compact top header. Desktop-first
// (1024px+), tablet collapses the sidebar to icons, mobile swaps
// it for a drawer. Renders the whole console in the FOUNDATORS
// dark/gold identity — never a generic admin template.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, FileText, Flag, FolderKanban, Hammer, Globe,
  MessageCircle, BarChart3, ShieldCheck, Settings, Search, Bell, Plus,
  Menu, X, ChevronLeft, ChevronRight, LogOut, User, LogIn,
  ArrowRight, Megaphone, Lightbulb, CalendarDays, Mic,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { signOutFully } from '@/lib/authActions';
import { searchUsers } from '@/lib/firestore';
import { timeAgo } from '@/lib/admin';
import { AvatarDot, useClickAway } from '@/components/admin/ui';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: Users, label: 'Users', path: '/admin/users' },
  { icon: FileText, label: 'Posts', path: '/admin/posts' },
  { icon: Flag, label: 'Reports', path: '/admin/reports' },
  { icon: FolderKanban, label: 'Projects', path: '/admin/projects' },
  { icon: Hammer, label: 'Build With Me', path: '/admin/build-with-me' },
  { icon: Globe, label: 'Communities', path: '/admin/communities' },
  { icon: Mic, label: 'Voice', path: '/admin/voice' },
  { icon: MessageCircle, label: 'Messages', path: '/admin/messages' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: ShieldCheck, label: 'Moderation', path: '/admin/moderation' },
];

const SETTINGS_ITEM = { icon: Settings, label: 'Settings', path: '/admin/settings' };

function isActive(pathname, path) {
  if (path === '/admin') return pathname === '/admin';
  return pathname === path || pathname.startsWith(path + '/');
}

function NavList({ pathname, router, collapsed, onNavigate }) {
  return (
    <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Admin navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.path);
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            onClick={() => { router.push(item.path); onNavigate?.(); }}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className={`group relative mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all ${
              active
                ? 'border border-gold/40 bg-gold/10 font-bold text-gold-hi'
                : 'border border-transparent font-medium text-text2 hover:bg-white/5 hover:text-white'
            } ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <Icon size={18} strokeWidth={active ? 2.1 : 1.7} className="flex-none" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}

      <div className="my-3 border-t border-[rgba(255,255,255,0.07)]" />

      {(() => {
        const active = isActive(pathname, SETTINGS_ITEM.path);
        const Icon = SETTINGS_ITEM.icon;
        return (
          <button
            onClick={() => { router.push(SETTINGS_ITEM.path); onNavigate?.(); }}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? SETTINGS_ITEM.label : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-all ${
              active
                ? 'border border-gold/40 bg-gold/10 font-bold text-gold-hi'
                : 'border border-transparent font-medium text-text2 hover:bg-white/5 hover:text-white'
            } ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <Icon size={18} strokeWidth={active ? 2.1 : 1.7} className="flex-none" />
            {!collapsed && <span>{SETTINGS_ITEM.label}</span>}
          </button>
        );
      })()}
    </nav>
  );
}

function SidebarBrand({ collapsed }) {
  if (collapsed) {
    return (
      <div className="flex h-14 items-center justify-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-grad text-[#171100]">
          <CrownMark size={18} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gold-grad text-[#171100]">
        <CrownMark size={18} />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="font-display text-[13.5px] font-extrabold tracking-[0.12em]">FOUNDATORS</div>
        <div className="text-[9px] font-bold uppercase tracking-[0.3em] text-gold">Admin</div>
      </div>
    </div>
  );
}

function CrownMark({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.8 10H4.8L3 8zm1.9 12h14.2v1.6H4.9V20z" />
    </svg>
  );
}

function Dropdown({ children, align = 'right', width = 'w-[260px]' }) {
  return (
    <div
      className={`absolute top-full z-[80] mt-2 ${width} overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.09)] bg-[#111] shadow-[0_18px_44px_rgba(0,0,0,0.55)] ${align === 'right' ? 'right-0' : 'left-0'}`}
    >
      {children}
    </div>
  );
}

export default function AdminFrame({ children }) {
  const pathname = usePathname() || '/admin';
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const notifications = useStore((s) => s.notifications);
  const showToast = useStore((s) => s.showToast);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null); // 'search' | 'quick' | 'bell' | 'profile'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const searchRef = useClickAway(() => setOpenMenu(null));
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('fa_admin_collapsed') === '1');
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('fa_admin_collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  };

  useEffect(() => { setMobileOpen(false); setOpenMenu(null); }, [pathname]);

  // Header search: real users by name (backend query), plus nav shortcuts.
  useEffect(() => {
    if (!query.trim()) { setResults(null); setSearching(false); return; }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const navMatches = [...NAV_ITEMS, SETTINGS_ITEM]
        .filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()))
        .map((i) => ({ kind: 'nav', label: i.label, path: i.path }));
      const res = await searchUsers(query.trim());
      if (cancelled) return;
      const users = res.success ? (res.data || []).slice(0, 6).map((u) => ({ kind: 'user', ...u })) : [];
      setResults({ nav: navMatches, users, failed: !res.success });
      setSearching(false);
    }, 250);
    return () => { clearTimeout(t); cancelled = true; };
  }, [query]);

  const go = useCallback((path) => { router.push(path); setOpenMenu(null); setQuery(''); setMobileOpen(false); }, [router]);

  const notifList = notifications.slice(0, 5);
  const sidebarWidth = collapsed ? 'lg:w-[76px]' : 'lg:w-[244px]';

  return (
    <div className="dark-surface min-h-screen bg-ink text-white">
      {/* ─── Desktop sidebar ─── */}
      <aside
        className={`dark-surface fixed inset-y-0 left-0 z-[70] hidden flex-col border-r border-[rgba(255,255,255,0.07)] bg-[#0a0a0a] lg:flex ${sidebarWidth} transition-[width] duration-200`}
      >
        <SidebarBrand collapsed={collapsed} />
        <NavList pathname={pathname} router={router} collapsed={collapsed} />
        <div className="border-t border-[rgba(255,255,255,0.07)] p-2.5">
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-text2 transition-colors hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Collapse</span></>}
          </button>
          {!collapsed && (
            <div className="mt-1 px-3 pb-1 text-[10px] uppercase tracking-[0.18em] text-text3">Control Center</div>
          )}
        </div>
      </aside>

      {/* ─── Mobile drawer ─── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="dark-surface absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-[rgba(255,255,255,0.08)] bg-[#0a0a0a] shadow-2xl">
            <div className="flex h-14 items-center justify-between pr-3">
              <SidebarBrand collapsed={false} />
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2 text-text2 hover:text-white">
                <X size={19} />
              </button>
            </div>
            <NavList pathname={pathname} router={router} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ─── Top header ─── */}
      <header
        className={`dark-surface fixed top-0 right-0 z-[75] h-14 border-b border-[rgba(255,255,255,0.07)] bg-[#0a0a0a]/95 backdrop-blur-md lg:right-0 ${collapsed ? 'left-0 lg:left-[76px]' : 'left-0 lg:left-[244px]'}`}
      >
        <div className="flex h-full items-center gap-3 px-3 sm:px-4">
          {/* mobile: menu + brand */}
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2 text-text2 hover:text-white lg:hidden">
            <Menu size={20} />
          </button>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="font-display text-[12.5px] font-extrabold tracking-[0.16em] text-white">FOUNDATORS</span>
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-gold-hi">Admin</span>
          </div>
          <span className="font-display text-[13px] font-extrabold tracking-[0.1em] lg:hidden">ADMIN</span>

          {/* search */}
          <div ref={searchRef} className="relative mx-auto w-full max-w-[420px] flex-1 px-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpenMenu('search'); }}
                onFocus={() => setOpenMenu('search')}
                placeholder="Search users, sections…"
                aria-label="Global search"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-white/40 transition-colors focus:border-gold/40"
              />
            </div>
            {openMenu === 'search' && query.trim() && (
              <Dropdown align="left" width="w-full min-w-[280px]">
                <div className="max-h-[340px] overflow-y-auto p-2">
                  {results?.nav?.length > 0 && (
                    <>
                      <div className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text3">Sections</div>
                      {results.nav.map((n) => (
                        <button key={n.path} onClick={() => go(n.path)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-text2 hover:bg-white/5 hover:text-white">
                          <ArrowRight size={13} className="text-gold" /> {n.label}
                        </button>
                      ))}
                    </>
                  )}
                  {results?.users?.length > 0 && (
                    <>
                      <div className="px-2 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-text3">Users</div>
                      {results.users.map((u) => (
                        <button key={u.id} onClick={() => go(`/profile/${u.id}`)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/5">
                          <AvatarDot src={u.avatar} name={u.name} size={26} />
                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-bold text-white">{u.name}</div>
                            <div className="truncate text-[11px] text-text3">{u.handle}</div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {!searching && results && results.nav.length === 0 && results.users.length === 0 && (
                    <div className="px-3 py-6 text-center text-[12.5px] text-text3">No matches for “{query}”</div>
                  )}
                  {searching && <div className="px-3 py-6 text-center text-[12.5px] text-text3">Searching…</div>}
                  {results?.failed && <div className="px-3 py-4 text-center text-[12px] text-brandred">Search unavailable</div>}
                </div>
              </Dropdown>
            )}
          </div>

          {/* quick action */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setOpenMenu(openMenu === 'quick' ? null : 'quick')}
              aria-label="Quick actions"
              aria-expanded={openMenu === 'quick'}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gold-grad px-3 py-2 text-[12.5px] font-extrabold text-[#171100] transition-transform active:scale-95"
            >
              <Plus size={15} strokeWidth={2.6} /> Create
            </button>
            {openMenu === 'quick' && (
              <Dropdown>
                <div className="p-1.5">
                  {[
                    { icon: Megaphone, label: 'New post', path: '/create' },
                    { icon: Lightbulb, label: 'New idea', path: '/ideas' },
                    { icon: CalendarDays, label: 'New event', path: '/events' },
                    { icon: Flag, label: 'Review reports', path: '/admin/reports' },
                  ].map((q) => (
                    <button key={q.path} onClick={() => go(q.path)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-text2 hover:bg-white/5 hover:text-white">
                      <q.icon size={15} className="text-gold" /> {q.label}
                    </button>
                  ))}
                </div>
              </Dropdown>
            )}
          </div>

          {/* notifications */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'bell' ? null : 'bell')}
              aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
              aria-expanded={openMenu === 'bell'}
              className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-text2 transition-colors hover:border-gold/40 hover:text-gold-hi"
            >
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brandred px-1 text-[9.5px] font-black text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            {openMenu === 'bell' && (
              <Dropdown width="w-[300px]">
                <div className="border-b border-white/10 px-4 py-3 text-[12.5px] font-extrabold">Notifications</div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifList.length === 0 ? (
                    <div className="px-4 py-8 text-center text-[12.5px] text-text3">No notifications yet</div>
                  ) : (
                    notifList.map((n) => (
                      <button key={n.id} onClick={() => go('/notifications')} className="block w-full border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/5">
                        <div className="text-[12.5px] leading-snug text-text2">{n.text}</div>
                        <div className="mt-1 text-[10.5px] text-text3">{timeAgo(n.createdAt)}</div>
                      </button>
                    ))
                  )}
                </div>
                <button onClick={() => go('/notifications')} className="w-full border-t border-white/10 px-4 py-2.5 text-center text-[12px] font-bold text-gold-hi hover:bg-white/5">
                  View all
                </button>
              </Dropdown>
            )}
          </div>

          {/* admin profile */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
              aria-label="Admin profile menu"
              aria-expanded={openMenu === 'profile'}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-gold/40"
            >
              <AvatarDot src={profile?.avatar} name={profile?.name} size={30} />
              <div className="hidden min-w-0 text-left leading-tight sm:block">
                <div className="max-w-[130px] truncate text-[12.5px] font-bold text-white">{profile?.name || 'Admin'}</div>
                <div className="text-[9.5px] font-black uppercase tracking-[0.16em] text-gold">Administrator</div>
              </div>
            </button>
            {openMenu === 'profile' && (
              <Dropdown width="w-[240px]">
                <div className="border-b border-white/10 px-4 py-3.5">
                  <div className="truncate text-[13.5px] font-extrabold">{profile?.name}</div>
                  <div className="truncate text-[11.5px] text-gold-hi">{profile?.handle}</div>
                  <div className="mt-1.5 text-[9.5px] font-black uppercase tracking-[0.18em] text-text3">Administrator</div>
                </div>
                <div className="p-1.5">
                  <button onClick={() => go('/profile')} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-text2 hover:bg-white/5 hover:text-white">
                    <User size={15} className="text-gold" /> View profile
                  </button>
                  <button onClick={() => go('/admin/settings')} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-text2 hover:bg-white/5 hover:text-white">
                    <Settings size={15} className="text-gold" /> Admin settings
                  </button>
                  <button onClick={() => go('/home')} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-text2 hover:bg-white/5 hover:text-white">
                    <LogIn size={15} className="text-gold" /> Exit to app
                  </button>
                  <button
                    onClick={async () => { setOpenMenu(null); await signOutFully(); router.replace('/login'); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] text-brandred hover:bg-brandred/10"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              </Dropdown>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className={`pt-14 transition-[padding] duration-200 ${collapsed ? 'lg:pl-[76px]' : 'lg:pl-[244px]'}`}>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
