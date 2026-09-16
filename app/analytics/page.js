'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, TrendingUp, Users, Eye, Heart, MessageCircle, Clock, ArrowLeft, Download } from 'lucide-react';
import SubpageHeader from '@/components/SubpageHeader';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useStore } from '@/lib/store';
import AuthSkeleton from '@/components/AuthSkeleton';

const MOCK_ANALYTICS = {
  overview: {
    followers: { value: 1247, change: +12, period: 'vs last week' },
    profileViews: { value: 3420, change: +28, period: 'vs last week' },
    postImpressions: { value: 12500, change: +45, period: 'vs last week' },
    engagementRate: { value: '4.2%', change: +0.8, period: 'vs last week' },
  },
  weeklyData: [
    { day: 'Mon', views: 420, likes: 89, comments: 23 },
    { day: 'Tue', views: 380, likes: 76, comments: 19 },
    { day: 'Wed', views: 520, likes: 112, comments: 34 },
    { day: 'Thu', views: 610, likes: 134, comments: 42 },
    { day: 'Fri', views: 480, likes: 98, comments: 28 },
    { day: 'Sat', views: 350, likes: 67, comments: 15 },
    { day: 'Sun', views: 290, likes: 54, comments: 12 },
  ],
  topPosts: [
    { id: 'p1', text: 'Just shipped our AI code review tool...', views: 2340, likes: 456, comments: 89 },
    { id: 'p2', text: 'HealthSync just hit 10K users!', views: 1890, likes: 345, comments: 67 },
    { id: 'p3', text: 'Growth marketing tip: Focus on the problem...', views: 1230, likes: 234, comments: 45 },
  ],
  audience: {
    topCities: [
      { city: 'Bangalore', percentage: 32 },
      { city: 'Mumbai', percentage: 24 },
      { city: 'Delhi', percentage: 18 },
      { city: 'San Francisco', percentage: 12 },
      { city: 'London', percentage: 8 },
    ],
    ageGroups: [
      { range: '18-24', percentage: 28 },
      { range: '25-34', percentage: 45 },
      { range: '35-44', percentage: 18 },
      { range: '45+', percentage: 9 },
    ],
  },
};

export default function AnalyticsPage() {
  const ready = useRequireAuth();
  const router = useRouter();
  const profile = useStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState('overview');

  if (!ready) return <AuthSkeleton />;

  const maxViews = Math.max(...MOCK_ANALYTICS.weeklyData.map((d) => d.views));

  return (
    <div className="app-shell flex min-h-0 flex-1 flex-col">
      <SubpageHeader title="Creator Analytics" />
      <div className="no-scrollbar flex-1 overflow-y-auto pb-20">
        {/* Header */}
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-[22px] font-black">Analytics</h1>
          <p className="text-[12px] text-text2">Track your content performance</p>
        </div>

        {/* Tabs */}
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

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="px-4 space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(MOCK_ANALYTICS.overview).map(([key, data]) => (
                <div key={key} className="rounded-2xl border border-linesoft bg-card p-4">
                  <div className="text-[11px] text-text3 capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                  <div className="mt-1 text-[22px] font-black">{data.value}</div>
                  <div className={`mt-0.5 text-[11px] font-bold ${data.change > 0 ? 'text-brandgreen' : 'text-red'}`}>
                    {data.change > 0 ? '+' : ''}{data.change}% {data.period}
                  </div>
                </div>
              ))}
            </div>

            {/* Weekly chart */}
            <div className="rounded-2xl border border-linesoft bg-card p-4">
              <h3 className="mb-3 text-[14px] font-bold">This Week</h3>
              <div className="flex items-end gap-2 h-[120px]">
                {MOCK_ANALYTICS.weeklyData.map((day) => (
                  <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-lg bg-gold/20" style={{ height: `${(day.views / maxViews) * 80}px` }}>
                      <div className="w-full rounded-t-lg bg-gold transition-all" style={{ height: '100%' }} />
                    </div>
                    <span className="text-[10px] text-text3">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-around text-center">
                <div>
                  <div className="text-[16px] font-black">3,050</div>
                  <div className="text-[10px] text-text3">Total Views</div>
                </div>
                <div>
                  <div className="text-[16px] font-black">630</div>
                  <div className="text-[10px] text-text3">Total Likes</div>
                </div>
                <div>
                  <div className="text-[16px] font-black">180</div>
                  <div className="text-[10px] text-text3">Total Comments</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content tab */}
        {activeTab === 'content' && (
          <div className="px-4 space-y-3">
            <h3 className="text-[14px] font-bold">Top Performing Posts</h3>
            {MOCK_ANALYTICS.topPosts.map((post, i) => (
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

        {/* Audience tab */}
        {activeTab === 'audience' && (
          <div className="px-4 space-y-4">
            {/* Top cities */}
            <div className="rounded-2xl border border-linesoft bg-card p-4">
              <h3 className="mb-3 text-[14px] font-bold">Top Locations</h3>
              <div className="space-y-3">
                {MOCK_ANALYTICS.audience.topCities.map((city) => (
                  <div key={city.city} className="flex items-center gap-3">
                    <span className="w-[100px] text-[12px] text-text2">{city.city}</span>
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${city.percentage}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-text3">{city.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Age groups */}
            <div className="rounded-2xl border border-linesoft bg-card p-4">
              <h3 className="mb-3 text-[14px] font-bold">Age Distribution</h3>
              <div className="space-y-3">
                {MOCK_ANALYTICS.audience.ageGroups.map((group) => (
                  <div key={group.range} className="flex items-center gap-3">
                    <span className="w-[60px] text-[12px] text-text2">{group.range}</span>
                    <div className="flex-1 h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-brandblue" style={{ width: `${group.percentage}%` }} />
                    </div>
                    <span className="text-[11px] font-bold text-text3">{group.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
