'use client';

import { useState, useCallback } from 'react';
import { X, Flag, AlertTriangle, UserX, Spam, Shield, ChevronRight, Check } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useHaptics } from '@/lib/useHaptics';

const REPORT_CATEGORIES = [
  { key: 'spam', label: 'Spam', icon: Spam, desc: 'Unwanted or repetitive content' },
  { key: 'harassment', label: 'Harassment or bullying', icon: UserX, desc: 'Targeting someone with harmful content' },
  { key: 'hate', label: 'Hate speech', icon: AlertTriangle, desc: 'Content promoting hatred or discrimination' },
  { key: 'misinfo', label: 'Misinformation', icon: Shield, desc: 'False or misleading information' },
  { key: 'violence', label: 'Violence or dangerous content', icon: Flag, desc: 'Promoting or glorifying violence' },
  { key: 'nudity', label: 'Nudity or sexual content', icon: Flag, desc: 'Explicit sexual content' },
  { key: 'scam', label: 'Scam or fraud', icon: AlertTriangle, desc: 'Deceptive or fraudulent content' },
  { key: 'ip', label: 'Intellectual property violation', icon: Flag, desc: 'Copyright or trademark infringement' },
  { key: 'other', label: 'Other', icon: Flag, desc: 'Something else not listed above' },
];

export default function ReportFlow({ targetId, targetType, onClose }) {
  const { vibrate, notification } = useHaptics();
  const showToast = useStore((s) => s.showToast);
  const [step, setStep] = useState('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(() => {
    vibrate('medium');
    setSubmitted(true);
    notification('success');
  }, [vibrate, notification]);

  const handleClose = useCallback(() => {
    showToast('Report submitted. We\'ll review it within 24 hours.');
    onClose();
  }, [showToast, onClose]);

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-6" onClick={handleClose}>
        <div className="w-full max-w-[300px] rounded-3xl bg-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brandgreen/10 mx-auto">
            <Check size={28} className="text-brandgreen" />
          </div>
          <h3 className="text-[18px] font-bold">Report Submitted</h3>
          <p className="mt-2 text-[13px] text-text2">Thank you for helping keep Foundators safe. We&apos;ll review your report within 24 hours.</p>
          <button onClick={handleClose} className="mt-5 w-full rounded-full bg-gold py-3 text-[13px] font-bold text-[#1a1300]">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[500] flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-linesoft px-4 py-3">
        <button onClick={step === 'details' ? () => setStep('category') : onClose} className="text-text2" aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-[15px] font-bold">Report {targetType}</span>
        <button onClick={onClose} className="text-text2" aria-label="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {step === 'category' && (
          <>
            <h2 className="text-[16px] font-bold mb-1">Why are you reporting?</h2>
            <p className="text-[12px] text-text2 mb-4">Select the reason that best describes the issue</p>
            <div className="space-y-2">
              {REPORT_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => { setSelectedCategory(cat.key); setStep('details'); vibrate('light'); }}
                    className="flex w-full items-center gap-3 rounded-2xl border border-linesoft bg-card p-4 text-left transition-colors hover:bg-white/5"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-text2">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-bold">{cat.label}</div>
                      <div className="text-[11px] text-text2">{cat.desc}</div>
                    </div>
                    <ChevronRight size={16} className="text-text3" />
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <h2 className="text-[16px] font-bold mb-1">Additional details</h2>
            <p className="text-[12px] text-text2 mb-4">
              Category: <span className="text-gold font-bold">{REPORT_CATEGORIES.find((c) => c.key === selectedCategory)?.label}</span>
            </p>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context (optional)..."
              className="w-full rounded-2xl border border-linesoft bg-card px-4 py-3 text-[13px] text-white placeholder:text-text3 focus:border-gold focus:outline-none min-h-[120px]"
              aria-label="Report details"
            />
            <div className="mt-4 space-y-2">
              <button
                onClick={handleSubmit}
                className="w-full rounded-2xl bg-red py-3.5 text-[14px] font-bold text-white"
              >
                Submit Report
              </button>
              <button
                onClick={() => setStep('category')}
                className="w-full rounded-2xl border border-linesoft py-3 text-[13px] font-bold text-text2"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
