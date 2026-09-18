'use client';

import React, { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Star,
  GitFork,
  Copy,
  Check,
  ExternalLink,
  Play,
  Heart,
} from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { getPerson } from '@/lib/data';
import { sanitize } from '@/lib/security';

const CATEGORY_BADGE = {
  hi: 'bg-[rgba(0,200,83,0.12)] text-[#00c853]',
  propose: 'bg-[rgba(233,30,99,0.12)] text-[#e91e63]',
  sorry: 'bg-[rgba(33,150,243,0.12)] text-[#2196f3]',
  birthday: 'bg-[rgba(217,172,61,0.12)] text-[#D9AC3D]',
  thankyou: 'bg-[rgba(156,39,176,0.12)] text-[#9c27b0]',
  missyou: 'bg-[rgba(255,87,34,0.12)] text-[#ff5722]',
  congrats: 'bg-[rgba(76,175,80,0.12)] text-[#4caf50]',
};

const GOLD_THEME = { primary: '#D9AC3D', bg: '#1a1300', accent: '#f5d780' };

function highlightSyntax(code) {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(
    /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g,
    '<span style="color:#a5d6ff">$1</span>'
  );
  html = html.replace(
    /\b(function|return|const|let|var|if|else|import|export|default|from|new|this|null|undefined|true|false)\b/g,
    '<span style="color:#ff7b72">$1</span>'
  );
  html = html.replace(
    /\b(React|useState|useEffect|useRef|useCallback|useMemo|style|className|onClick|key|size|width|height|display|flex|alignItems|justifyContent|padding|margin|fontSize|fontWeight|color|background|minHeight|borderRadius|border|textShadow|animation|letterSpacing|marginTop|overflow|position|top|left|right|bottom|transform|opacity|gap|flexDirection|textAlign|maxWidth|lineHeight|Webkit|O|Moz)\b/g,
    '<span style="color:#d2a8ff">$1</span>'
  );
  html = html.replace(
    /\b(\d+(?:\.\d+)?px|%|em|rem|vh|vw|s|ms)\b/g,
    '<span style="color:#79c0ff">$1</span>'
  );
  html = html.replace(
    /(=&gt;|=>|\.\.\.|\{\.\.\.|\}|→)/g,
    '<span style="color:#ff7b72">$1</span>'
  );
  html = html.replace(
    /(&lt;\/?[A-Z][A-Za-z]*|\s\/?&gt;|\/&gt;)/g,
    '<span style="color:#7ee787">$1</span>'
  );

  return html;
}

function CodeLine({ num, html }) {
  return (
    <div className="flex hover:bg-white/[0.03]">
      <span className="flex-none select-none text-right pr-4 text-[10px] leading-5 text-[#484f58] w-8">
        {num}
      </span>
      <span
        className="whitespace-pre text-[11.5px] leading-5 text-[#c9d1d9]"
        dangerouslySetInnerHTML={{ __html: sanitize(html) }}
      />
    </div>
  );
}

function PhonePreview({ code, templateName }) {
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);

  const renderedComponent = useMemo(() => {
    if (!code) return null;
    try {
      const FORBIDDEN = /\b(fetch|XMLHttpRequest|import\(|require\(|eval\(|new Function|document\.|window\.|localStorage|sessionStorage|cookie|indexedDB)\b/;
      if (FORBIDDEN.test(code)) return null;
      const fn = new Function(
        'React',
        'useState',
        'useEffect',
        'useRef',
        'useCallback',
        'useMemo',
        `return ${code}`
      );
      const Component = fn(React, React.useState, React.useEffect, React.useRef, React.useCallback, React.useMemo);
      if (typeof Component !== 'function') return null;
      const element = React.createElement(Component, {
        name: 'Kabir',
        message: 'Wishing you all the best!',
        theme: GOLD_THEME,
      });
      return element;
    } catch {
      setHasError(true);
      return null;
    }
  }, [code]);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="text-2xl mb-2">👁️</div>
        <div className="text-[11px] font-bold text-white/70">Preview not available</div>
        <div className="text-[10px] text-white/40 mt-1">The template code couldn&apos;t be rendered in the preview</div>
      </div>
    );
  }

  if (!renderedComponent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[11px] text-white/40">Loading preview...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden"
      style={{ background: '#0a0a1a' }}
    >
      {renderedComponent}
    </div>
  );
}

function TemplateDetailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');
  const { vibrate, notification } = useHaptics();
  const ready = useRequireAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [commentText, setCommentText] = useState('');

  const communityTemplates = useStore((s) => s.communityTemplates);
  const starTemplate = useStore((s) => s.starTemplate);
  const forkTemplate = useStore((s) => s.forkTemplate);
  const showToast = useStore((s) => s.showToast);
  const templateComments = useStore((s) => s.templateComments);
  const addTemplateComment = useStore((s) => s.addTemplateComment);
  const likeComment = useStore((s) => s.likeComment);
  const featuredTemplates = useStore((s) => s.featuredTemplates);
  const toggleFeatured = useStore((s) => s.toggleFeatured);
  const profile = useStore((s) => s.profile);
  const getTemplateAnalytics = useStore((s) => s.getTemplateAnalytics);
  const premiumTemplates = useStore((s) => s.premiumTemplates);
  const templatePrice = useStore((s) => s.templatePrice);

  const userKey = useStore((s) => s.profile?.id);

  const template = useMemo(
    () => communityTemplates.find((t) => t.id === templateId) || null,
    [communityTemplates, templateId]
  );

  const author = useMemo(
    () => (template ? getPerson(template.authorKey) : null),
    [template]
  );

  const isStarred = template?.starredBy?.[userKey];

  const codeLines = useMemo(() => {
    if (!template?.code) return [];
    return template.code.split('\n');
  }, [template?.code]);

  const codeHtmlLines = useMemo(
    () => codeLines.map((line) => highlightSyntax(line)),
    [codeLines]
  );

  const analytics = useMemo(
    () => (template ? getTemplateAnalytics(template.id) : null),
    [template, getTemplateAnalytics]
  );

  const handleCopyCode = useCallback(() => {
    if (!template?.code) return;
    navigator.clipboard.writeText(template.code).then(() => {
      setCopiedCode(true);
      vibrate('light');
      showToast('Code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    });
  }, [template?.code, vibrate, showToast]);

  const handleStar = useCallback(() => {
    if (!template) return;
    vibrate('light');
    notification('success');
    starTemplate(template.id, userKey);
  }, [template, vibrate, notification, starTemplate]);

  const handleFork = useCallback(() => {
    if (!template) return;
    vibrate('medium');
    notification('success');
    forkTemplate(template.id);
    showToast(`Forked "${template.name}"! It's now in your templates.`);
  }, [template, vibrate, notification, forkTemplate, showToast]);

  const handleUseTemplate = useCallback(() => {
    if (!template) return;
    vibrate('light');
    router.push(`/gestures/create?templateId=${template.id}`);
  }, [template, vibrate, router]);

  const handleAddComment = () => {
    if (!commentText.trim() || !template) return;
    addTemplateComment(template.id, { authorKey: profile?.id, text: commentText.trim() });
    setCommentText('');
    vibrate('light');
  };

  if (ready === false || !ready) return <AuthSkeleton />;

  if (!template) {
    return (
      <MainScreenShell>
        <div className="flex-1 flex flex-col items-center justify-center px-[18px] py-16 text-center">
          <div className="text-5xl mb-4">🧩</div>
          <div className="text-[16px] font-extrabold text-white">Template not found</div>
          <div className="text-[11px] text-text2 mt-2 mb-5">This template may have been removed.</div>
          <button
            onClick={() => router.push('/gestures/community')}
            className="rounded-full bg-gold-grad px-6 py-2.5 text-[11px] font-black text-[#1a1300]"
          >
            Browse Templates
          </button>
        </div>
      </MainScreenShell>
    );
  }

  const formatDate = (d) => {
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  return (
    <MainScreenShell>
      <div className="overflow-y-auto pb-8 no-scrollbar">
        {/* Header */}
        <div className="page-enter px-[18px] pt-3">
          <div className="gold-card relative overflow-hidden p-5">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgba(217,172,61,.1)] opacity-40" />
            <div className="relative">
              <button
                onClick={() => { vibrate('light'); router.push('/gestures/community'); }}
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-gold">
                🧩 Template Detail
              </div>
              <h1 className="mt-2 text-[22px] font-black leading-tight">
                {template.name}
              </h1>
              {author && (
                <div className="mt-2 flex items-center gap-2">
                  <img
                    src={author.avatar}
                    alt={author.name}
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="text-[11px] text-text2">
                    by <button onClick={() => router.push(`/gestures/creator?key=${template.authorKey}`)} className="font-bold text-white hover:text-gold transition-colors">{author.name}</button>
                  </span>
                </div>
              )}
              <p className="mt-2 text-[11px] leading-5 text-text2">
                {template.description}
              </p>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="px-[18px] mt-4">
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-text3 mb-2">
            Live Preview
          </div>
          <div className="flex justify-center">
            <div
              className="overflow-hidden rounded-[24px] border-2 border-white/10"
              style={{ width: 280, height: 420 }}
            >
              <PhonePreview code={template.code} templateName={template.name} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            <Play size={10} className="text-gold" />
            <span className="text-[9px] text-text3">Simulated preview — see code for full implementation</span>
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-[18px] mt-5">
          <div className="glass-card flex items-center justify-around p-3.5">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Star size={13} className="text-gold" />
                <span className="text-[13px] font-extrabold text-white">{template.stars}</span>
              </div>
              <span className="text-[9px] text-text3 mt-0.5">Stars</span>
            </div>

            <div className="h-6 w-px bg-linesoft" />

            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <GitFork size={13} className="text-gold" />
                <span className="text-[13px] font-extrabold text-white">{template.forks}</span>
              </div>
              <span className="text-[9px] text-text3 mt-0.5">Forks</span>
            </div>

            <div className="h-6 w-px bg-linesoft" />

            <div className="flex flex-col items-center">
              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${CATEGORY_BADGE[template.category] || 'bg-white/5 text-text3'}`}
              >
                {template.category}
              </span>
              <span className="text-[9px] text-text3 mt-0.5">Category</span>
            </div>

            <div className="h-6 w-px bg-linesoft" />

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-bold text-white">{formatDate(template.createdAt)}</span>
              <span className="text-[9px] text-text3 mt-0.5">Created</span>
            </div>
          </div>
        </div>

        {/* Fork count banner */}
        {template.forks > 0 && (
          <div className="px-[18px] mt-3">
            <div className="flex items-center gap-2 rounded-xl bg-[rgba(217,172,61,0.08)] px-3.5 py-2.5">
              <GitFork size={12} className="text-gold" />
              <span className="text-[10px] text-text2">
                Forked <span className="font-bold text-gold">{template.forks}</span> {template.forks === 1 ? 'time' : 'times'}
              </span>
            </div>
          </div>
        )}

        {/* Analytics Section */}
        {analytics && (
          <div className="mt-4 px-[18px]">
            <div className="glass-card p-4">
              <h3 className="mb-3 text-[12px] font-extrabold uppercase tracking-wider text-text3">Analytics</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-[16px] font-black text-gold">{analytics.totalViews}</div>
                  <div className="text-[9px] text-text3">Views</div>
                </div>
                <div>
                  <div className="text-[16px] font-black text-gold">{analytics.stars}</div>
                  <div className="text-[9px] text-text3">Stars</div>
                </div>
                <div>
                  <div className="text-[16px] font-black text-gold">{analytics.forks}</div>
                  <div className="text-[9px] text-text3">Forks</div>
                </div>
                <div>
                  <div className="text-[16px] font-black text-gold">{analytics.comments}</div>
                  <div className="text-[9px] text-text3">Comments</div>
                </div>
              </div>
              {analytics.dailyViews.length > 0 && (
                <div className="mt-3 border-t border-linesoft pt-3">
                  <div className="text-[10px] text-text3 mb-2">Last 7 days</div>
                  <div className="flex items-end gap-1 h-12">
                    {analytics.dailyViews.map((d, i) => {
                      const maxViews = Math.max(...analytics.dailyViews.map((x) => x.views), 1);
                      const height = (d.views / maxViews) * 100;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t bg-gold/30 min-h-[2px]"
                            style={{ height: `${Math.max(height, 5)}%` }}
                          />
                          <div className="text-[7px] text-text3">{d.date.split('-')[2]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {premiumTemplates?.[template?.id] && (
                <div className="mt-3 border-t border-linesoft pt-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gold">Premium Template</span>
                  <span className="text-[12px] font-black text-gold">${templatePrice?.[template?.id] || 0}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-[18px] mt-4">
          <div className="flex gap-2.5">
            <button
              onClick={handleStar}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-3 text-[11.5px] font-bold transition-all ${
                isStarred
                  ? 'border-[rgba(217,172,61,0.3)] bg-[rgba(217,172,61,0.1)] text-[#D9AC3D]'
                  : 'border-linesoft bg-transparent text-text3'
              }`}
            >
              <Star
                size={14}
                className={isStarred ? 'fill-[#D9AC3D] text-[#D9AC3D]' : ''}
              />
              {isStarred ? 'Starred' : 'Star'}
            </button>

            <button
              onClick={handleFork}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gold-grad py-3 text-[11.5px] font-black text-[#1a1300]"
            >
              <GitFork size={14} />
              Fork this
            </button>
          </div>

          <button
            onClick={handleUseTemplate}
            className="mt-2.5 w-full flex items-center justify-center gap-2 rounded-2xl border border-gold/20 bg-[rgba(217,172,61,0.06)] py-3.5 text-[12px] font-bold text-gold transition-all hover:bg-[rgba(217,172,61,0.12)]"
          >
            <ExternalLink size={14} />
            Use this template
          </button>
        </div>

        {/* Code Panel */}
        <div className="px-[18px] mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-text3">
              Source Code
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 rounded-full border border-linesoft bg-white/5 px-3 py-1.5 text-[10px] font-bold text-text3 transition-all hover:bg-white/10 hover:text-white"
            >
              {copiedCode ? (
                <>
                  <Check size={11} className="text-[#00c853]" />
                  <span className="text-[#00c853]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  Copy Code
                </>
              )}
            </button>
          </div>

          <div
            className="rounded-2xl border border-linesoft overflow-hidden"
            style={{ background: '#0d1117' }}
          >
            <div className="flex items-center gap-1.5 border-b border-[#21262d] px-3.5 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-[9px] text-[#484f58]">{template.name}.jsx</span>
            </div>

            <div className="overflow-x-auto no-scrollbar max-h-[400px] overflow-y-auto p-3">
              <pre className="font-mono">
                {codeHtmlLines.map((html, i) => (
                  <CodeLine key={i} num={i + 1} html={html} />
                ))}
              </pre>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        {template && (
          <div className="mt-6 px-[18px]">
            <h3 className="mb-3 text-[13px] font-extrabold">
              Comments ({(templateComments?.[template.id] || []).length})
            </h3>
            
            {/* Add Comment */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value.slice(0, 200))}
                  placeholder="Add a comment..."
                  className="flex-1 rounded-2xl border border-linesoft bg-card px-4 py-2.5 text-[12px] text-white placeholder:text-text3 focus:border-gold focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && commentText.trim()) {
                      handleAddComment();
                    }
                  }}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="rounded-full bg-gold-grad px-4 py-2 text-[11px] font-bold text-[#1a1300] disabled:opacity-40"
                >
                  Post
                </button>
              </div>
            </div>

            {/* Comment List */}
            <div className="space-y-3">
              {(templateComments?.[template.id] || []).map((comment) => {
                const commenter = getPerson(comment.authorKey);
                return (
                  <div key={comment.id} className="glass-card p-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={commenter?.avatar || 'https://i.pravatar.cc/160?img=1'}
                        alt={commenter?.name || 'User'}
                        className="h-6 w-6 rounded-full"
                      />
                      <div className="flex-1">
                        <span className="text-[11px] font-bold">{commenter?.name || 'Anonymous'}</span>
                        <span className="ml-2 text-[9px] text-text3">{comment.createdAt}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-4 text-text2">{comment.text}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => { vibrate('light'); likeComment(template.id, comment.id); }}
                        className="flex items-center gap-1 text-[10px] text-text3 hover:text-gold transition-colors"
                      >
                        <Heart size={12} /> {comment.likes}
                      </button>
                    </div>
                  </div>
                );
              })}
              {(templateComments?.[template.id] || []).length === 0 && (
                <p className="text-center text-[11px] text-text3 py-4">No comments yet. Be the first!</p>
              )}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </MainScreenShell>
  );
}

export default function TemplateDetailPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <TemplateDetailInner />
    </Suspense>
  );
}
