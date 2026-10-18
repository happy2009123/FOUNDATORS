'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import AuthSkeleton from '@/components/AuthSkeleton';
import { getSupabase } from '@/lib/supabase/client';
import { mapRows } from '@/lib/supabase/db';
import { getFollowers } from '@/lib/firestore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MS = 86400000;
const WEEK_MS = 7 * DAY_MS;
const EVENT_WINDOW_MS = 7 * WEEK_MS; // ~8 calendar weeks, covers this + last week

const EMPTY = {
  overview: {
    followers: { label: 'Followers', value: 0, change: null, period: '0 this week', suffix: '%' },
    profileViews: { label: 'Profile views', value: 0, change: null, period: '0 this week', suffix: '%' },
    postImpressions: { label: 'Post impressions', value: 0, change: null, period: '0 this week', suffix: '%' },
    engagementRate: { label: 'Engagement rate', value: '0%', change: null, period: 'this week', suffix: ' pts' },
  },
  weeklyData: DAYS.map((day) => ({ day, views: 0, likes: 0, comments: 0 })),
  topPosts: [],
  audience: { topCities: [] },
};

// Monday 00:00 local time of the week containing ts.
function weekStart(ts) {
  const d = new Date(ts);
  const dow = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

// Week-over-week delta from real event counts. Falls back to a plain
// "N this week" note when there is no previous week to compare against.
const mkDelta = (thisWeek, lastWeek, unit = '%') => {
  if (lastWeek > 0) {
    return {
      change: Math.round(((thisWeek - lastWeek) / lastWeek) * 100),
      period: 'vs last week',
      suffix: unit,
    };
  }
  return {
    change: null,
    period: `${Math.round(thisWeek)}${unit === '%' ? '' : unit} this week`,
    suffix: unit,
  };
};

const engDelta = (twRate, lwRate) => {
  if (twRate != null && lwRate != null) {
    return { change: Math.round(twRate - lwRate), period: 'vs last week', suffix: ' pts' };
  }
  if (twRate != null) return { change: null, period: `${twRate.toFixed(1)}% this week`, suffix: ' pts' };
  return { change: null, period: 'this week', suffix: ' pts' };
};

function countEvents(rows, start, end, type) {
  let n = 0;
  rows.forEach((r) => {
    if (type && r.event_type !== type) return;
    const t = Date.parse(r.created_at);
    if (!(t >= start && (end == null || t < end))) return;
    n++;
  });
  return n;
}

export default function AnalyticsPage() {
  const ready = useRequireAuth();
  const profile = useStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(EMPTY);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const fetchAnalytics = async () => {
      try {
        const sb = getSupabase();
        const me = profile.id;
        const now = Date.now();
        const thisWeekStart = weekStart(now);
        const lastWeekStart = thisWeekStart - WEEK_MS;
        const eventFrom = thisWeekStart - EVENT_WINDOW_MS;
        const iso = (ts) => new Date(ts).toISOString();

        // 1. My posts — totals come from real columns (view_count tracks opens)
        const { data: postsData } = await sb
          .from('posts')
          .select('*')
          .eq('author_key', me)
          .order('created_at', { ascending: false });
        const userPosts = mapRows(postsData || []);
        const totalLikes = userPosts.reduce((s, p) => s + (p.likes || 0), 0);
        const totalComments = userPosts.reduce((s, p) => s + (p.commentsCount || 0), 0);
        const totalViews = userPosts.reduce((s, p) => s + (p.viewCount || 0), 0);

        // Event queries: my posts' engagement + views of my profile + new followers
        const eventPostIds = userPosts.slice(0, 300).map((p) => p.id);
        const postEventsQ = eventPostIds.length
          ? sb
              .from('analytics_events')
              .select('event_type,payload,created_at')
              .in('event_type', ['post_viewed', 'post_liked', 'comment_created'])
              .filter('payload->>postId', 'in', `("${eventPostIds.join('","')}")`)
              .gte('created_at', iso(eventFrom))
              .limit(4000)
          : null;

        const [allViewsRes, profileViewRes, postEventsRes, followRes] = await Promise.all([
          sb
            .from('analytics_events')
            .select('id', { count: 'exact', head: true })
            .eq('event_type', 'profile_viewed')
            .filter('payload->>targetId', 'eq', me),
          sb
            .from('analytics_events')
            .select('user_id,created_at')
            .eq('event_type', 'profile_viewed')
            .filter('payload->>targetId', 'eq', me)
            .gte('created_at', iso(eventFrom))
            .limit(4000),
          postEventsQ ? postEventsQ : Promise.resolve({ data: [] }),
          sb
            .from('analytics_events')
            .select('created_at')
            .eq('event_type', 'user_followed')
            .filter('payload->>followedId', 'eq', me)
            .gte('created_at', iso(lastWeekStart))
            .limit(1000),
        ]);

        const profileViewRows = profileViewRes.data || [];
        const postEvents = postEventsRes.data || [];
        const followRows = followRes.data || [];

        // 2. Weekly chart — events on my posts, bucketed by day of THIS calendar week
        const weeklyMap = {};
        DAYS.forEach((d) => (weeklyMap[d] = { views: 0, likes: 0, comments: 0 }));
        postEvents.forEach((ev) => {
          const t = Date.parse(ev.created_at);
          if (!(t >= thisWeekStart)) return;
          const key = DAYS[(new Date(t).getDay() + 6) % 7];
          if (ev.event_type === 'post_viewed') weeklyMap[key].views++;
          else if (ev.event_type === 'post_liked') weeklyMap[key].likes++;
          else if (ev.event_type === 'comment_created') weeklyMap[key].comments++;
        });
        const weeklyData = DAYS.map((d) => ({ day: d, ...weeklyMap[d] }));

        // 3. This week vs last week counts
        const pvTw = countEvents(profileViewRows, thisWeekStart, null);
        const pvLw = countEvents(profileViewRows, lastWeekStart, thisWeekStart);
        const pvViewsTw = countEvents(postEvents, thisWeekStart, null, 'post_viewed');
        const pvViewsLw = countEvents(postEvents, lastWeekStart, thisWeekStart, 'post_viewed');
        const engTw =
          countEvents(postEvents, thisWeekStart, null, 'post_liked') +
          countEvents(postEvents, thisWeekStart, null, 'comment_created');
        const engLw =
          countEvents(postEvents, lastWeekStart, thisWeekStart, 'post_liked') +
          countEvents(postEvents, lastWeekStart, thisWeekStart, 'comment_created');
        const followTw = countEvents(followRows, thisWeekStart, null);
        const followLw = countEvents(followRows, lastWeekStart, thisWeekStart);
        const twRate = pvViewsTw > 0 ? (engTw / pvViewsTw) * 100 : null;
        const lwRate = pvViewsLw > 0 ? (engLw / pvViewsLw) * 100 : null;

        // 4. Top posts by likes (real views from view_count)
        const topPosts = [...userPosts]
          .sort((a, b) => (b.likes || 0) - (a.likes || 0))
          .slice(0, 5)
          .map((p) => ({
            id: p.id,
            text: p.text || '',
            views: p.viewCount || 0,
            likes: p.likes || 0,
            comments: p.commentsCount || 0,
          }));

        // 5. Follower count (real follows table) + follower growth delta
        let followerCount = 0;
        try {
          const followers = await getFollowers(me);
          if (followers?.success) followerCount = (followers.data || []).length;
        } catch {}

        // 6. Audience — top locations of people who viewed my profile (30 days)
        const recentViewers = new Set();
        profileViewRows.forEach((r) => {
          const t = Date.parse(r.created_at);
          if (t < now - 30 * DAY_MS) return;
          if (r.user_id && r.user_id !== me) recentViewers.add(r.user_id);
        });
        const viewerIds = [...recentViewers].slice(0, 60);
        let topCities = [];
        if (viewerIds.length) {
          const { data: viewerProfiles } = await sb
            .from('profiles')
            .select('id,location')
            .in('id', viewerIds);
          const counts = {};
          (viewerProfiles || []).forEach((v) => {
            const loc = String(v.location || '').trim();
            if (!loc) return;
            counts[loc] = (counts[loc] || 0) + 1;
          });
          const located = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
          topCities = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([city, n]) => ({ city, percentage: Math.max(Math.round((n / located) * 100), 1) }));
        }

        if (cancelled) return;
        const allTimeViews = allViewsRes.count ?? 0;
        const engagementRate =
          totalViews > 0 ? (((totalLikes + totalComments) / totalViews) * 100).toFixed(1) + '%' : '0%';

        setAnalytics({
          overview: {
            followers: { label: 'Followers', value: followerCount, ...mkDelta(followTw, followLw) },
            profileViews: { label: 'Profile views', value: allTimeViews, ...mkDelta(pvTw, pvLw) },
            postImpressions: { label: 'Post impressions', value: totalViews, ...mkDelta(pvViewsTw, pvViewsLw) },
            engagementRate: { label: 'Engagement rate', value: engagementRate, ...engDelta(twRate, lwRate) },
          },
          weeklyData,
          topPosts,
          audience: { topCities },
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
                  <div className="text-[11px] text-text3">{data.label}</div>
                  <div className="mt-1 text-[22px] font-black">{data.value}</div>
                  <div className={`mt-0.5 text-[11px] font-bold ${data.change > 0 ? 'text-brandgreen' : data.change < 0 ? 'text-brandred' : 'text-text3'}`}>
                    {data.change === null
                      ? data.period
                      : `${data.change > 0 ? '+' : ''}${data.change}${data.suffix || '%'} ${data.period}`}
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
              <h3 className="mb-1 text-[14px] font-bold">Top Locations</h3>
              <p className="mb-3 text-[11px] text-text3">Where the people who viewed your profile are based</p>
              {analytics.audience.topCities.length === 0 ? (
                <p className="text-[12px] text-text3 text-center py-4">No location data yet — views from profiles with a location show up here.</p>
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
          </div>
        )}
      </div>
    </div>
  );
}
