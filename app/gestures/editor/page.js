'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Save, Send, Code2, Eye, RotateCcw, Copy, Check, Palette } from 'lucide-react';
import MainScreenShell from '@/components/MainScreenShell';
import AuthSkeleton from '@/components/AuthSkeleton';
import { useRequireAuth } from '@/lib/useRequireAuth';
import { useHaptics } from '@/lib/useHaptics';
import { useStore } from '@/lib/store';

const DEFAULT_HTML = `<div class="card">
  <div class="emoji">🎉</div>
  <h1 class="title">HELLO!</h1>
  <p class="name">{{name}}</p>
  <p class="message">{{message}}</p>
</div>`;

const DEFAULT_CSS = `.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 24px;
  background: #0a0a1a;
}
.emoji { font-size: 48px; animation: bounce 2s infinite; }
.title { color: #D9AC3D; font-size: 32px; font-weight: 900; margin-top: 12px; }
.name { color: #fff; font-size: 18px; margin-top: 8px; }
.message { color: #aaa; font-size: 12px; margin-top: 8px; text-align: center; }
@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }`;

const CATEGORIES = ['Hi', 'Propose', 'Sorry', 'Birthday', 'Thank You', 'Miss You', 'Congrats'];
const DRAFT_KEY = 'foundators_template_draft';
const DEBOUNCE_MS = 300;

function replaceVariables(html) {
  return html
    .replace(/\{\{name\}\}/g, 'Preview Name')
    .replace(/\{\{message\}\}/g, 'Your message here');
}

function LineNumbers({ count }) {
  return (
    <div className="flex flex-col items-end pr-3 pt-3 select-none pointer-events-none">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="text-[10px] leading-[1.6] text-gray-600 font-mono">
          {i + 1}
        </span>
      ))}
    </div>
  );
}

export default function EditorPage() {
  const ready = useRequireAuth();
  const publishTemplate = useStore((s) => s.publishTemplate);
  const showToast = useStore((s) => s.showToast);
  const router = useRouter();
  const { vibrate } = useHaptics();

  const [activeTab, setActiveTab] = useState('html');
  const [htmlCode, setHtmlCode] = useState(DEFAULT_HTML);
  const [cssCode, setCssCode] = useState(DEFAULT_CSS);
  const [jsCode] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [pubName, setPubName] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [pubCategory, setPubCategory] = useState('Hi');
  const [publishing, setPublishing] = useState(false);

  const htmlRef = useRef(null);
  const cssRef = useRef(null);
  const debounceRef = useRef(null);

  const lineCount = useMemo(() => {
    const code = activeTab === 'html' ? htmlCode : cssCode;
    return code.split('\n').length;
  }, [activeTab, htmlCode, cssCode]);

  const buildPreview = useCallback((html, css) => {
    const processed = replaceVariables(html);
    const full = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#020202;color:#fff;width:100%;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;}${css}</style></head><body>${processed}</body></html>`;
    setPreviewHtml(full);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.htmlCode) setHtmlCode(draft.htmlCode);
        if (draft.cssCode) setCssCode(draft.cssCode);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      buildPreview(htmlCode, cssCode);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [htmlCode, cssCode, buildPreview]);

  useEffect(() => {
    buildPreview(htmlCode, cssCode);
  }, []);

  useEffect(() => {
    if (showFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showFullscreen]);

  const handleTabKeyDown = (e, ref, setter) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const value = ref.current.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      setter(newValue);
      requestAnimationFrame(() => {
        ref.current.selectionStart = ref.current.selectionEnd = start + 2;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const start = ref.current.selectionStart;
      const value = ref.current.value;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const line = value.substring(lineStart, start);
      const indent = line.match(/^\s*/)[0];
      const newValue = value.substring(0, start) + '\n' + indent + value.substring(start);
      setter(newValue);
      requestAnimationFrame(() => {
        ref.current.selectionStart = ref.current.selectionEnd = start + 1 + indent.length;
      });
    }
  };

  const handleCopy = () => {
    const full = `<style>\n${cssCode}\n</style>\n${htmlCode}`;
    navigator.clipboard.writeText(full).then(() => {
      vibrate('light');
      setCopied(true);
      showToast('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = () => {
    vibrate('light');
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ htmlCode, cssCode, savedAt: Date.now() }));
    showToast('Draft saved');
  };

  const handlePublish = async () => {
    if (!pubName.trim()) {
      showToast('Template name is required');
      return;
    }
    setPublishing(true);
    try {
      await publishTemplate({
        name: pubName.trim(),
        description: pubDesc.trim(),
        category: pubCategory.toLowerCase(),
        code: htmlCode,
        css: cssCode,
      });
      vibrate('light');
      showToast('Published to community!');
      setShowPublish(false);
      setPubName('');
      setPubDesc('');
      router.push('/gestures/community');
    } catch (err) {
      showToast('Failed to publish. Try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleReset = () => {
    vibrate('light');
    setHtmlCode(DEFAULT_HTML);
    setCssCode(DEFAULT_CSS);
    localStorage.removeItem(DRAFT_KEY);
    showToast('Reset to defaults');
  };

  if (!ready) return <AuthSkeleton />;

  return (
    <MainScreenShell>
      <div className="min-h-screen bg-[#020202] text-white flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a] bg-[#020202]">
          <button
            onClick={() => router.push('/gestures/community')}
            className="p-2 rounded-lg hover:bg-[#111] transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white truncate">Template Editor</h1>
            <p className="text-[10px] text-gray-500 truncate">Write HTML/CSS. See it live. Share with the world.</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel — Code Editor */}
          <div className="flex-1 flex flex-col min-h-0 lg:border-r border-[#2a2a2a]">
            {/* Tab Bar */}
            <div className="flex items-center border-b border-[#2a2a2a] bg-[#0d1117]">
              {['html', 'css', 'js'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => tab !== 'js' && setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-semibold uppercase transition-colors relative ${
                    activeTab === tab
                      ? 'text-[#D9AC3D]'
                      : tab === 'js'
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab === 'html' && <Code2 size={12} />}
                  {tab === 'css' && <Palette size={12} />}
                  {tab === 'js' && <Play size={12} />}
                  {tab}
                  {tab === 'js' && (
                    <span className="text-[8px] ml-1 bg-[#2a2a2a] px-1 rounded text-gray-600">soon</span>
                  )}
                  {activeTab === tab && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D9AC3D]"
                    />
                  )}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={handleReset}
                className="px-3 py-2 text-[10px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                title="Reset to defaults"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex min-h-0 overflow-hidden bg-[#0d1117]">
              <LineNumbers count={lineCount} />
              <div className="flex-1 relative overflow-auto">
                {activeTab === 'html' && (
                  <textarea
                    ref={htmlRef}
                    value={htmlCode}
                    onChange={(e) => setHtmlCode(e.target.value)}
                    onKeyDown={(e) => handleTabKeyDown(e, htmlRef, setHtmlCode)}
                    spellCheck={false}
                    className="w-full h-full min-h-full bg-transparent text-[#e6edf3] font-mono text-xs leading-[1.6] p-3 resize-none outline-none placeholder-gray-600"
                    placeholder="Write your HTML here..."
                  />
                )}
                {activeTab === 'css' && (
                  <textarea
                    ref={cssRef}
                    value={cssCode}
                    onChange={(e) => setCssCode(e.target.value)}
                    onKeyDown={(e) => handleTabKeyDown(e, cssRef, setCssCode)}
                    spellCheck={false}
                    className="w-full h-full min-h-full bg-transparent text-[#e6edf3] font-mono text-xs leading-[1.6] p-3 resize-none outline-none placeholder-gray-600"
                    placeholder="Write your CSS here..."
                  />
                )}
                {activeTab === 'js' && (
                  <div className="flex items-center justify-center h-full text-gray-600 text-xs">
                    <div className="text-center">
                      <Play size={24} className="mx-auto mb-2 opacity-30" />
                      <p>JavaScript support coming soon</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel — Live Preview */}
          <div className="flex flex-col items-center justify-center bg-[#020202] p-4 lg:w-[380px] min-h-[460px] lg:min-h-0">
            <div className="flex items-center gap-2 mb-3 self-start">
              <Eye size={14} className="text-[#D9AC3D]" />
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</span>
              <button
                onClick={() => buildPreview(htmlCode, cssCode)}
                className="ml-auto p-1.5 rounded-md hover:bg-[#111] transition-colors"
                title="Refresh preview"
              >
                <RotateCcw size={12} className="text-gray-500" />
              </button>
            </div>

            {/* Phone Frame */}
            <div className="relative w-[280px] h-[420px] rounded-3xl border-2 border-[#2a2a2a] bg-[#111] overflow-hidden shadow-2xl">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#2a2a2a] rounded-b-2xl z-10" />
              {/* Status bar */}
              <div className="absolute top-0 left-0 right-0 h-10 flex items-end justify-between px-6 pb-1 z-[5]">
                <span className="text-[9px] text-white/50 font-semibold">9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded-sm border border-white/40" />
                  <div className="w-1 h-2 rounded-sm bg-white/40" />
                  <div className="w-5 h-2.5 rounded-sm border border-white/40 relative">
                    <div className="absolute inset-[1px] bg-white/40 rounded-[1px] w-3/4" />
                  </div>
                </div>
              </div>
              {/* Preview Content */}
              <iframe
                srcDoc={previewHtml}
                title="Template Preview"
                className="w-full h-full border-0"
                sandbox="allow-scripts"
              />
            </div>

            {/* Variable hint */}
            <p className="text-[9px] text-gray-600 mt-2 text-center">
              Use <code className="text-[#D9AC3D]">{'{{name}}'}</code> and{' '}
              <code className="text-[#D9AC3D]">{'{{message}}'}</code> for variables
            </p>
          </div>
        </div>

        {/* Bottom Bar — Actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[#2a2a2a] bg-[#020202] overflow-x-auto">
          <button
            onClick={() => setShowFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-xs text-gray-300 hover:bg-[#1a1a1a] transition-colors whitespace-nowrap"
          >
            <Eye size={14} />
            Preview Full
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-xs text-gray-300 hover:bg-[#1a1a1a] transition-colors whitespace-nowrap"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#111] border border-[#2a2a2a] text-xs text-gray-300 hover:bg-[#1a1a1a] transition-colors whitespace-nowrap"
          >
            <Save size={14} />
            Save Draft
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setShowPublish(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-black whitespace-nowrap"
            style={{
              background: 'linear-gradient(135deg, #D9AC3D 0%, #B8922E 100%)',
            }}
          >
            <Send size={14} />
            Publish to Community
          </button>
        </div>

        {/* Fullscreen Preview */}
        {showFullscreen && (
          <div
            className="fixed inset-0 z-50 bg-[#020202] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
              <h2 className="text-sm font-bold text-white">Preview</h2>
              <button
                onClick={() => setShowFullscreen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#111] border border-[#2a2a2a] text-xs text-gray-300 hover:bg-[#1a1a1a]"
              >
                Close
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md h-full max-h-[80vh] rounded-2xl border border-[#2a2a2a] bg-[#111] overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  title="Fullscreen Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-scripts"
                />
              </div>
            </div>
          </div>
        )}

        {/* Publish Modal */}
        {showPublish && (
          <>
            <div
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowPublish(false)}
            />
            <div
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] border-t border-[#2a2a2a] rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
              <h3 className="text-base font-bold text-white mb-4">Publish Template</h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Template Name *</label>
                  <input
                    type="text"
                    value={pubName}
                    onChange={(e) => setPubName(e.target.value)}
                    placeholder="My awesome template"
                    maxLength={60}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#D9AC3D] transition-colors placeholder-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Description (optional)</label>
                  <input
                    type="text"
                    value={pubDesc}
                    onChange={(e) => setPubDesc(e.target.value.slice(0, 100))}
                    placeholder="A short description..."
                    maxLength={100}
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0d1117] border border-[#2a2a2a] text-sm text-white outline-none focus:border-[#D9AC3D] transition-colors placeholder-gray-600"
                  />
                  <span className="text-[10px] text-gray-600 mt-1 block text-right">{pubDesc.length}/100</span>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Category</label>
                  <div className="grid grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setPubCategory(cat)}
                        className={`px-2 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                          pubCategory === cat
                            ? 'bg-[#D9AC3D]/10 border-[#D9AC3D] text-[#D9AC3D]'
                            : 'bg-[#0d1117] border-[#2a2a2a] text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowPublish(false)}
                  className="flex-1 py-3 rounded-lg bg-[#0d1117] border border-[#2a2a2a] text-sm text-gray-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing || !pubName.trim()}
                  className="flex-1 py-3 rounded-lg text-sm font-bold text-black disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                  style={{
                    background: 'linear-gradient(135deg, #D9AC3D 0%, #B8922E 100%)',
                  }}
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </MainScreenShell>
  );
}
