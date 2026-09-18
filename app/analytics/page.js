'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle, Clock, ArrowLeft, Download } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import AuthSkeleton from '@/components/AuthSkeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AnalyticsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    overview: {
      followers: { value: 0, change: 0, period: 'vs last week' },
      profileViews: { value: 0, change: 0, period: 'vs last week' },
      postImpressions: { value: 0, change: 0, period: 'vs last week' },
      engagementRate: { value: '0%', change: 0, period: 'vs last week' },
    },
    weeklyData: DAYS.map((day) => ({ day, views: 0, likes: 0, comments: 0 })),
    topPosts: [],
    audience: { topCities: [], ageGroups: [] },
  });

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const fetchAnalytics = async () => {
      try {
        // 1. Get user's posts
        const postsQ = query(collection(db, 'posts'), where('authorKey', '==', profile.id));
        const postsSnap = await getDocs(postsQ);
        const userPosts = postsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const totalLikes = userPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
        const totalComments = userPosts.reduce((sum, p) => sum + (p.commentsCount || 0), 0);
        const totalPosts = userPosts.length;

        // 2. Get analytics events for this user
        const eventsQ = query(
          collection(db, 'analytics'),
          where('authorKey', '==', profile.id),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        const eventsSnap = await getDocs(eventsQ);
        const events = eventsSnap.docs.map((d) => d.data());

        // 3. Compute weekly data from events (group by day of week)
        const weeklyMap = {};
        DAYS.forEach((d) => (weeklyMap[d] = { views: 0, likes: 0, comments: 0 }));
        events.forEach((ev) => {
          const date = ev.createdAt?.toDate?.();
          if (!date) return;
          const dayIdx = date.getDay();
          const dayKey = DAYS[(dayIdx + 6) % 7]; // Mon=0
          if (ev.eventType === 'post_viewed') weeklyMap[dayKey].views++;
          if (ev.eventType === 'post_liked') weeklyMap[dayKey].likes++;
          if (ev.eventType === 'comment_created') weeklyMap[dayKey].comments++;
        });
        const weeklyData = DAYS.map((d) => ({ day: d, ...weeklyMap[d] }));

        // 4. Top posts by likes
        const topPosts = [...userPosts]
          .sort((a, b) => (b.likes || 0) - (a.likes || 0))
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            text: p.text || '',
            views: p.views || 0,
            likes: p.likes || 0,
            comments: p.commentsCount || 0,
          }));

        // 5. Compute engagement rate
        const totalViews = topPosts.reduce((s, p) => s + p.views, 0) || events.filter((e) => e.eventType === 'post_viewed').length;
        const engagementRate = totalViews > 0 ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(1) + '%' : '0%';

        // 6. Build follower count from events or followers subcollection
        let followerCount = 0;
        try {
          const followersSnap = await getDocs(collection(db, 'users', profile.id, 'followers'));
          followerCount = followersSnap.size;
        } catch {}

        if (cancelled) return;
        setAnalytics({
          overview: {
            followers: { value: followerCount, change: 0, period: 'vs last week' },
            profileViews: { value: totalViews, change: 0, period: 'vs last week' },
            postImpressions: { value: totalPosts * 10, change: 0, period: 'vs last week' },
            engagementRate: { value: engagementRate, change: 0, period: 'vs last week' },
          },
          weeklyData,
          topPosts,
          audience: { topCities: [], ageGroups: [] },
        });
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [profile?.id]);

  if (!ready) return <AuthSkeleton />;

  const maxViews = Math.max(...analytics.weeklyData.map((d) => d.views), 1);
  const weekTotals = analytics.weeklyData.reduce(
    (acc, d) => ({ views: acc.views + d.views, likes: acc.likes + d.likes, comments: acc.comments + d.comments }),
    { views: 0, likes: 0, comments: 0 }
  );

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Creator Analytics" />
      <div className="no-scrollbar flex-1 overflow-y-auto pb-20">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-[22px] font-black">Analytics</h1>
          <p className="text-[12px] text-text2">Track your content performance</p>
        </div>

        <div className="flex gap-2 px-4 mb-4">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'content', label: 'Content', icon: TrendingUp },
            { key: 'audience', label: 'Audience', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-bold transition-all ${
                activeTab === key
                  ? 'bg-gold text-[#1a1300]'
                  : 'bg-white/5 text-text2 hover:bg-white/10'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="px-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(analytics.overview).map(([key, data]) => (
                <div key={key} className="rounded-2xl border border-linesoft bg-card p-4">
                  <div className="text-[11px] text-text3 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="mt-1 text-[22px] font-black">{data.value}</div>
                  <div className={`mt-0.5 text-[11px] font-bold ${data.change > 0 ? 'text-brandgreen' : data.change < 0 ? 'text-red' : 'text-text3'}`}>
                    {data.change > 0 ? '+' : ''}{data.change}% {data.period}
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-linesoft bg-card p-4">
              <h3 className="mb-3 text-[14px] font-bold">This Week</h3>
              <div className="flex items-end gap-2 h-[120px]">
                {analytics.weeklyData.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg bg-gold/20" style={{ height: `${Math.max((day.views / maxViews) * 80, 2)}px` }}>
                      <div className="w-full rounded-t-lg bg-gold transition-all" style={{ height: '100%' }} />
                    </div>
                    <span className="text-[10px] text-text3">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-around text-center">
                <div>
                  <div className="text-[16px] font-black">{weekTotals.views.toLocaleString()}</div>
                  <div className="text-[10px] text-text3">Total Views</div>
                </div>
                <div>
                  <div className="text-[16px] font-black">{weekTotals.likes.toLocaleString()}</div>
                  <div className="text-[10px] text-text3">Total Likes</div>
                </div>
                <div>
                  <div className="text-[16px] font-black">{weekTotals.comments.toLocaleString()}</div>
                  <div className="text-[10px] text-text3">Total Comments</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="px-4 space-y-3">
            <h3 className="text-[14px] font-bold">Top Performing Posts</h3>
            {analytics.topPosts.length === 0 && (
              <div className="rounded-2xl border border-linesoft bg-card p-6 text-center">
                <p className="text-[13px] text-text2">No posts yet. Start creating to see analytics.</p>
              </div>
            )}
            {analytics.topPosts.map((post, i) => (
              <div key={post.id} className="rounded-2xl border border-linesoft bg-card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/10 text-[12px] font-bold text-gold">
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold line-clamp-2">{post.text}</p>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-text3">
                      <span className="flex items-center gap-1"><Eye size={12} /> {post.views.toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Heart size={12} /> {post.likes}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comments}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'audience' && (
          <div className="px-4 space-y-4">
            <div className="rounded-2xl border border-linesoft bg-card p-4">
              <h3 className="mb-3 text-[14px] font-bold">Top Locations</h3>
              {analytics.audience.topCities.length === 0 ? (
                <p className="text-[12px] text-text3 text-center py-4">No location data yet.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.audience.topCities.map((city) => (
                    <div key={city.city} className="flex items-center gap-3">
                      <span className="w-[100px] text-[12px] text-text2">{city.city}</span>
                      <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${city.percentage}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-text3">{city.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-linesoft bg-card p-4">
              <h3 className="mb-3 text-[14px] font-bold">Age Distribution</h3>
              {analytics.audience.ageGroups.length === 0 ? (
                <p className="text-[12px] text-text3 text-center py-4">No age data yet.</p>
              ) : (
                <div className="space-y-3">
                  {analytics.audience.ageGroups.map((group) => (
                    <div key={group.range} className="flex items-center gap-3">
                      <span className="w-[60px] text-[12px] text-text2">{group.range}</span>
                      <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-brandblue" style={{ width: `${group.percentage}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-text3">{group.percentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
