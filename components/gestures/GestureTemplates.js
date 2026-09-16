'use client';

export const CATEGORIES = [
  { key: 'all', label: 'All', emoji: '✨' },
  { key: 'propose', label: 'Propose', emoji: '💍' },
  { key: 'sorry', label: 'Sorry', emoji: '😢' },
  { key: 'birthday', label: 'Birthday', emoji: '🎂' },
  { key: 'hi', label: 'Hi', emoji: '👋' },
  { key: 'thankyou', label: 'Thank You', emoji: '🙏' },
  { key: 'missyou', label: 'Miss You', emoji: '🌙' },
  { key: 'congrats', label: 'Congrats', emoji: '🏆' },
];

export const THEMES = {
  rose: { bg: '#1a0a10', text: '#fff', accent: '#e91e8c' },
  gold: { bg: '#0a0a02', text: '#fff', accent: '#D9AC3D' },
  ocean: { bg: '#0a1020', text: '#fff', accent: '#3b82f6' },
  sunset: { bg: '#1a0a05', text: '#fff', accent: '#f97316' },
  forest: { bg: '#0a1a0a', text: '#fff', accent: '#22c55e' },
};

/* ── Template 1: Propose Hearts ── */
function ProposeHearts({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(100vh) scale(0.5); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(-20vh) scale(1.2); opacity: 0; } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        @keyframes ringBounce { 0% { transform: scale(0) rotate(-20deg); } 60% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes glow { 0%, 100% { box-shadow: 0 0 20px ${accent}44; } 50% { box-shadow: 0 0 40px ${accent}88; } }
      `}</style>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', fontSize: `${16 + Math.random() * 14}px`, animation: `floatUp ${3 + Math.random() * 3}s ease-in infinite`, animationDelay: `${i * 0.4}s`, left: `${8 + Math.random() * 84}%` }}>❤️</div>
      ))}
      <div style={{ animation: 'ringBounce 0.8s ease-out forwards', fontSize: '48px', marginBottom: '16px' }}>💍</div>
      <div style={{ animation: 'pulse 2s ease-in-out infinite, glow 2s ease-in-out infinite', width: '64px', height: '64px', borderRadius: '50%', background: `${accent}22`, border: `2px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '28px' }}>💍</span>
      </div>
      <div style={{ color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Will You Marry Me?</div>
      <div style={{ color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'My Love'}</div>
      <div style={{ color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Every love story is beautiful, but ours is my favorite.'}</div>
    </div>
  );
}

/* ── Template 2: Propose Rose ── */
function ProposeRose({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes petalFall { 0% { transform: translateY(-10%) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110%) rotate(360deg); opacity: 0; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(15)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', fontSize: '14px', animation: `petalFall ${4 + Math.random() * 3}s linear infinite`, animationDelay: `${i * 0.3}s`, left: `${Math.random() * 100}%` }}>🌸</div>
      ))}
      <div style={{ animation: 'fadeInUp 0.8s ease-out', fontSize: '42px', marginBottom: '16px' }}>🌹</div>
      <div style={{ animation: 'fadeInUp 1s ease-out 0.2s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Be Mine</div>
      <div style={{ animation: 'fadeInUp 1s ease-out 0.4s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Dear'}</div>
      <div style={{ animation: 'fadeInUp 1s ease-out 0.6s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'You are the most beautiful thing I ever known.'}</div>
    </div>
  );
}

/* ── Template 3: Sorry Heartbreak ── */
function SorryHeartbreak({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes mend { 0% { clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%); } 50% { clip-path: polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%); } 100% { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); } }
        @keyframes colorIn { 0% { filter: grayscale(1) brightness(0.5); } 100% { filter: grayscale(0) brightness(1); } }
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes tearDrop { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(40px); opacity: 0; } }
      `}</style>
      {[0, 1].map(i => (
        <div key={i} style={{ position: 'absolute', top: '35%', left: `${42 + i * 16}%`, width: '6px', height: '6px', borderRadius: '50%', background: '#5B8DFF', animation: `tearDrop 1.5s ease-in infinite`, animationDelay: `${i * 0.7}s` }} />
      ))}
      <div style={{ animation: 'mend 2s ease-in-out, colorIn 2s ease-in-out', fontSize: '52px', marginBottom: '20px' }}>💔</div>
      <div style={{ animation: 'fadeSlide 0.8s ease-out 0.5s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>I&apos;m Sorry</div>
      <div style={{ animation: 'fadeSlide 0.8s ease-out 0.7s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Friend'}</div>
      <div style={{ animation: 'fadeSlide 0.8s ease-out 0.9s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'I never meant to hurt you. You mean the world to me.'}</div>
    </div>
  );
}

/* ── Template 4: Birthday Cake ── */
function BirthdayCake({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes candleFlicker { 0%, 100% { transform: scaleY(1) scaleX(1); } 25% { transform: scaleY(1.1) scaleX(0.9); } 50% { transform: scaleY(0.9) scaleX(1.1); } 75% { transform: scaleY(1.05) scaleX(0.95); } }
        @keyframes confettiFall { 0% { transform: translateY(-10%) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110%) rotate(720deg); opacity: 0; } }
        @keyframes popIn { 0% { transform: scale(0); } 70% { transform: scale(1.15); } 100% { transform: scale(1); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
      `}</style>
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: '8px', height: '8px', borderRadius: '2px', background: ['#e91e8c', '#D9AC3D', '#3b82f6', '#22c55e', '#f97316'][i % 5], animation: `confettiFall ${3 + Math.random() * 2}s linear infinite`, animationDelay: `${i * 0.2}s`, left: `${Math.random() * 100}%` }} />
      ))}
      <div style={{ animation: 'popIn 0.6s ease-out', fontSize: '56px', marginBottom: '12px' }}>🎂</div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ animation: 'candleFlicker 0.4s ease-in-out infinite', animationDelay: `${i * 0.1}s`, fontSize: '16px' }}>🕯️</div>
        ))}
      </div>
      <div style={{ background: `linear-gradient(90deg, transparent, ${accent}44, transparent)`, backgroundSize: '200% 100%', animation: 'shimmer 3s linear infinite', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px', padding: '4px 16px' }}>Happy Birthday!</div>
      <div style={{ color: text, fontSize: '24px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Birthday Star'}</div>
      <div style={{ color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Wishing you the most amazing day filled with joy!'}</div>
    </div>
  );
}

/* ── Template 5: Birthday Confetti ── */
function BirthdayConfetti({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes burst { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; } }
        @keyframes bigPop { 0% { transform: scale(0) rotate(-10deg); } 60% { transform: scale(1.1) rotate(3deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes sparkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
      `}</style>
      {[...Array(30)].map((_, i) => {
        const angle = (i / 30) * 360;
        const dist = 60 + Math.random() * 80;
        return (
          <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: '6px', height: '6px', borderRadius: i % 2 === 0 ? '50%' : '1px', background: accent, '--tx': `${Math.cos(angle * Math.PI / 180) * dist}px`, '--ty': `${Math.sin(angle * Math.PI / 180) * dist}px`, animation: `burst 1.5s ease-out infinite`, animationDelay: `${Math.random() * 2}s` }} />
        );
      })}
      <div style={{ animation: 'bigPop 0.8s ease-out', fontSize: '14px', fontWeight: 900, color: accent, marginBottom: '8px', letterSpacing: '0.1em' }}>🎉 IT&apos;S YOUR DAY 🎉</div>
      <div style={{ animation: 'bigPop 0.8s ease-out 0.2s both', fontSize: '56px', fontWeight: 900, color: text, lineHeight: 1 }}>{name || 'You'}</div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ animation: `sparkle 1.5s ease-in-out infinite`, animationDelay: `${i * 0.3}s`, fontSize: '16px' }}>✨</div>
        ))}
      </div>
      <div style={{ marginTop: '16px', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Hope your day is as amazing as you are!'}</div>
    </div>
  );
}

/* ── Template 6: Hi Wave ── */
function HiWave({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes wave { 0% { transform: rotate(0deg); } 10% { transform: rotate(14deg); } 20% { transform: rotate(-8deg); } 30% { transform: rotate(14deg); } 40% { transform: rotate(-4deg); } 50% { transform: rotate(10deg); } 60%, 100% { transform: rotate(0deg); } }
        @keyframes bounceIn { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 70% { transform: scale(0.9); } 100% { transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ animation: 'wave 2.5s ease-in-out infinite', fontSize: '64px', marginBottom: '16px', transformOrigin: '70% 70%' }}>👋</div>
      <div style={{ animation: 'bounceIn 0.6s ease-out 0.3s both', color: accent, fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Hey There!</div>
      <div style={{ animation: 'slideUp 0.8s ease-out 0.5s both', color: text, fontSize: '20px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>{name || 'Friend'}</div>
      <div style={{ animation: 'slideUp 0.8s ease-out 0.7s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Just wanted to say hi and make you smile today!'}</div>
    </div>
  );
}

/* ── Template 7: Hi Neon ── */
function HiNeon({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes neonFlicker { 0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { text-shadow: 0 0 10px ${accent}, 0 0 20px ${accent}, 0 0 40px ${accent}, 0 0 80px ${accent}; opacity: 1; } 20%, 24%, 55% { text-shadow: none; opacity: 0.6; } }
        @keyframes borderGlow { 0%, 100% { box-shadow: 0 0 10px ${accent}44, inset 0 0 10px ${accent}22; } 50% { box-shadow: 0 0 20px ${accent}88, inset 0 0 20px ${accent}44; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ animation: 'neonFlicker 3s ease-in-out infinite', color: accent, fontSize: '42px', fontWeight: 900, marginBottom: '20px', fontFamily: 'monospace' }}>HELLO!</div>
      <div style={{ animation: 'borderGlow 2s ease-in-out infinite', border: `1px solid ${accent}66`, borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
        <div style={{ animation: 'fadeUp 0.8s ease-out 0.3s both', color: text, fontSize: '18px', fontWeight: 800, marginBottom: '8px' }}>{name || 'Stranger'}</div>
        <div style={{ animation: 'fadeUp 0.8s ease-out 0.5s both', color: `${text}aa`, fontSize: '12px', lineHeight: 1.5 }}>{message || 'Life is better when you laugh. So here I am!'}</div>
      </div>
    </div>
  );
}

/* ── Template 8: Thank You Golden ── */
function ThankYouGolden({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes shimmerText { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes sparkle { 0%, 100% { transform: scale(0) rotate(0deg); opacity: 0; } 50% { transform: scale(1) rotate(180deg); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${15 + Math.random() * 70}%`, left: `${10 + Math.random() * 80}%`, animation: `sparkle ${2 + Math.random() * 2}s ease-in-out infinite`, animationDelay: `${i * 0.4}s`, color: accent, fontSize: '14px' }}>✨</div>
      ))}
      <div style={{ background: `linear-gradient(90deg, ${accent}, #fff, ${accent})`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmerText 3s linear infinite', fontSize: '32px', fontWeight: 900, marginBottom: '16px' }}>Thank You</div>
      <div style={{ animation: 'fadeUp 0.8s ease-out 0.3s both', color: text, fontSize: '20px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>{name || 'Dear'}</div>
      <div style={{ animation: 'fadeUp 0.8s ease-out 0.5s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Your kindness and support mean everything to me.'}</div>
    </div>
  );
}

/* ── Template 9: Miss You Moon ── */
function MissYouMoon({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes moonGlow { 0%, 100% { filter: drop-shadow(0 0 10px ${accent}44); } 50% { filter: drop-shadow(0 0 25px ${accent}88); } }
        @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes floatLetter { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${10 + Math.random() * 40}%`, left: `${10 + Math.random() * 80}%`, animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`, color: '#fff', fontSize: '8px' }}>✦</div>
      ))}
      <div style={{ animation: 'moonGlow 3s ease-in-out infinite', fontSize: '52px', marginBottom: '16px' }}>🌙</div>
      <div style={{ display: 'flex', gap: '2px', marginBottom: '12px' }}>
        {'Missing You'.split('').map((ch, i) => (
          <span key={i} style={{ animation: `floatLetter 0.5s ease-out ${i * 0.05}s both`, color: accent, fontSize: '22px', fontWeight: 900 }}>{ch === ' ' ? '\u00A0' : ch}</span>
        ))}
      </div>
      <div style={{ color: text, fontSize: '18px', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>{name || 'Someone Special'}</div>
      <div style={{ color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'The moon misses the stars, and I miss you.'}</div>
    </div>
  );
}

/* ── Template 10: Congrats Trophy ── */
function CongratsTrophy({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes trophyBounce { 0% { transform: scale(0) rotate(-10deg); } 50% { transform: scale(1.2) rotate(5deg); } 70% { transform: scale(0.9) rotate(-2deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes badgePop { 0% { transform: scale(0); } 70% { transform: scale(1.1); } 100% { transform: scale(1); } }
        @keyframes starburst { 0% { transform: scale(0) rotate(0deg); opacity: 1; } 100% { transform: scale(2) rotate(180deg); opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${accent}`, animation: `starburst 2s ease-out infinite`, animationDelay: `${i * 0.3}s` }} />
      ))}
      <div style={{ animation: 'trophyBounce 0.8s ease-out', fontSize: '56px', marginBottom: '12px' }}>🏆</div>
      <div style={{ animation: 'badgePop 0.5s ease-out 0.5s both', background: accent, color: '#000', fontSize: '10px', fontWeight: 900, padding: '4px 12px', borderRadius: '999px', marginBottom: '16px' }}>ACHIEVEMENT UNLOCKED</div>
      <div style={{ animation: 'fadeUp 0.8s ease-out 0.7s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Congratulations!</div>
      <div style={{ animation: 'fadeUp 0.8s ease-out 0.9s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Champion'}</div>
      <div style={{ animation: 'fadeUp 0.8s ease-out 1.1s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'You did it! So proud of everything you have achieved.'}</div>
    </div>
  );
}

/* ── Template 11: Propose Box ── */
function ProposeBox({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes boxLidOpen { 0% { transform: rotateX(0deg); transform-origin: top center; } 100% { transform: rotateX(-110deg); transform-origin: top center; } }
        @keyframes ringRise { 0% { transform: translateY(30px) scale(0.5); opacity: 0; } 60% { transform: translateY(-10px) scale(1.1); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes ringSparkle { 0%, 100% { filter: drop-shadow(0 0 4px #fff8) drop-shadow(0 0 8px ${accent}88); } 50% { filter: drop-shadow(0 0 12px #fff) drop-shadow(0 0 20px ${accent}); } }
        @keyframes boxSlideIn { from { opacity: 0; transform: scale(0.7) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes boxFloatUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ animation: 'boxSlideIn 0.7s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ position: 'relative', width: '80px', height: '80px', perspective: '400px' }}>
          <div style={{ position: 'absolute', bottom: 0, width: '80px', height: '40px', background: `linear-gradient(135deg, ${accent}cc, ${accent})`, borderRadius: '4px 4px 8px 8px', boxShadow: `0 4px 20px ${accent}44` }} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: '80px', height: '40px', background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, borderRadius: '8px 8px 0 0', transformStyle: 'preserve-3d', animation: 'boxLidOpen 1.5s ease-out 0.5s forwards', transformOrigin: 'top center', boxShadow: `0 -2px 10px ${accent}66` }} />
          <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', animation: 'ringRise 1s ease-out 1.5s both', zIndex: 10 }}>
            <span style={{ fontSize: '36px', animation: 'ringSparkle 2s ease-in-out infinite' }}>💍</span>
          </div>
        </div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${20 + Math.random() * 60}%`, left: `${10 + Math.random() * 80}%`, animation: `ringSparkle ${1.5 + Math.random() * 1.5}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`, fontSize: '12px', color: accent }}>✦</div>
      ))}
      <div style={{ animation: 'boxFloatUp 0.8s ease-out 2s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Will You Marry Me?</div>
      <div style={{ animation: 'boxFloatUp 0.8s ease-out 2.2s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'My Love'}</div>
      <div style={{ animation: 'boxFloatUp 0.8s ease-out 2.4s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'A lifetime of happiness awaits us.'}</div>
    </div>
  );
}

/* ── Template 12: Propose Glow ── */
function ProposeGlow({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes glowPulse { 0%, 100% { text-shadow: 0 0 10px ${accent}, 0 0 20px ${accent}, 0 0 40px ${accent}, 0 0 80px ${accent}44; } 50% { text-shadow: 0 0 20px ${accent}, 0 0 40px ${accent}, 0 0 80px ${accent}, 0 0 120px ${accent}88; } }
        @keyframes ringSpin { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.1); } 100% { transform: rotate(360deg) scale(1); } }
        @keyframes ringGlowPulse { 0%, 100% { box-shadow: 0 0 15px ${accent}44; } 50% { box-shadow: 0 0 35px ${accent}88; } }
        @keyframes willYouFade { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
        @keyframes glowUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(10)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', width: `${8 + Math.random() * 20}px`, height: `${8 + Math.random() * 20}px`, borderRadius: '50%', background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`, top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animation: `glowPulse ${2 + Math.random() * 2}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
      ))}
      <div style={{ animation: 'willYouFade 1s ease-out', fontSize: '42px', color: accent, fontWeight: 900, textShadow: `0 0 10px ${accent}, 0 0 20px ${accent}, 0 0 40px ${accent}`, marginBottom: '12px', animationName: 'glowPulse', animationDuration: '2s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' }}>Will You?</div>
      <div style={{ animation: 'ringSpin 4s linear infinite, ringGlowPulse 2s ease-in-out infinite', width: '72px', height: '72px', borderRadius: '50%', border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
        <span style={{ fontSize: '32px' }}>💍</span>
      </div>
      <div style={{ animation: 'glowUp 0.8s ease-out 0.5s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'My Heart'}</div>
      <div style={{ animation: 'glowUp 0.8s ease-out 0.7s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'You light up my world like no one else.'}</div>
    </div>
  );
}

/* ── Template 13: Propose Infinity ── */
function ProposeInfinity({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes infinityFloat { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-12px) scale(1.05); } }
        @keyframes infinityGlow { 0%, 100% { text-shadow: 0 0 8px ${accent}88, 0 0 16px ${accent}44; } 50% { text-shadow: 0 0 20px ${accent}, 0 0 40px ${accent}88; } }
        @keyframes particleTrail { 0% { opacity: 0; transform: translate(0, 0) scale(0); } 30% { opacity: 1; transform: translate(var(--px), var(--py)) scale(1); } 100% { opacity: 0; transform: translate(calc(var(--px) * 3), calc(var(--py) * 3)) scale(0); } }
        @keyframes heartPop { 0% { transform: scale(0) rotate(-15deg); } 60% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes infinityUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(12)].map((_, i) => {
        const angle = (i / 12) * 360;
        const px = Math.cos(angle * Math.PI / 180) * 60;
        const py = Math.sin(angle * Math.PI / 180) * 60;
        return (
          <div key={i} style={{ position: 'absolute', top: '38%', left: '50%', width: '4px', height: '4px', borderRadius: '50%', background: accent, '--px': `${px}px`, '--py': `${py}px`, animation: `particleTrail 2.5s ease-out infinite`, animationDelay: `${i * 0.2}s` }} />
        );
      })}
      <div style={{ animation: 'infinityFloat 3s ease-in-out infinite, infinityGlow 2s ease-in-out infinite', fontSize: '56px', marginBottom: '16px' }}>♾️</div>
      <div style={{ animation: 'heartPop 0.8s ease-out 0.5s both', fontSize: '24px', marginBottom: '12px' }}>💕</div>
      <div style={{ animation: 'infinityUp 0.8s ease-out 0.8s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Forever & Always</div>
      <div style={{ animation: 'infinityUp 0.8s ease-out 1s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Forever'}</div>
      <div style={{ animation: 'infinityUp 0.8s ease-out 1.2s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Our love is infinite, beyond time and space.'}</div>
    </div>
  );
}

/* ── Template 14: Sorry Kneel ── */
function SorryKneel({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes kneelDown { 0% { transform: translateY(-30px) scale(0.8); opacity: 0; } 60% { transform: translateY(5px) scale(1.05); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes kneelSway { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-3deg); } }
        @keyframes sorryPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.08); opacity: 1; } }
        @keyframes sorrySlide { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${10 + Math.random() * 80}%`, left: `${10 + Math.random() * 80}%`, animation: `sorryPulse ${2 + Math.random() * 2}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`, fontSize: '10px', color: `${accent}66` }}>💧</div>
      ))}
      <div style={{ animation: 'kneelDown 1s ease-out, kneelSway 3s ease-in-out infinite 1s', fontSize: '52px', marginBottom: '16px' }}>🙇</div>
      <div style={{ animation: 'sorrySlide 0.8s ease-out 0.8s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>I&apos;m So Sorry</div>
      <div style={{ animation: 'sorrySlide 0.8s ease-out 1s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Friend'}</div>
      <div style={{ animation: 'sorrySlide 0.8s ease-out 1.2s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'From the bottom of my heart, I apologize.'}</div>
    </div>
  );
}

/* ── Template 15: Sorry Comic ── */
function SorryComic({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes comicBurst { 0% { transform: scale(0) rotate(-10deg); } 50% { transform: scale(1.2) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes comicStar { 0% { transform: scale(0) rotate(0deg); opacity: 0; } 50% { opacity: 1; } 100% { transform: scale(1.5) rotate(180deg); opacity: 0; } }
        @keyframes comicPop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes comicShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @keyframes comicFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: '30%', left: '50%', width: '60px', height: '60px', animation: `comicStar 2s ease-out infinite`, animationDelay: `${i * 0.4}s` }}>
          <svg viewBox="0 0 60 60" width="60" height="60"><polygon points="30,0 36,22 60,22 40,36 48,58 30,44 12,58 20,36 0,22 24,22" fill={`${accent}33`} /></svg>
        </div>
      ))}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '100px', background: accent, borderRadius: '50%', filter: 'blur(0px)', opacity: 0.15 }} />
        <div style={{ animation: 'comicBurst 0.6s ease-out', background: accent, color: '#000', fontSize: '28px', fontWeight: 900, padding: '12px 28px', borderRadius: '8px', position: 'relative', boxShadow: `4px 4px 0 #000, -2px -2px 0 ${accent}` }}>MY BAD!</div>
      </div>
      <div style={{ animation: 'comicPop 0.5s ease-out 0.5s both', fontSize: '48px', marginTop: '16px', marginBottom: '12px' }}>😅</div>
      <div style={{ animation: 'comicFade 0.8s ease-out 0.8s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Sorry About That!</div>
      <div style={{ animation: 'comicFade 0.8s ease-out 1s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Buddy'}</div>
      <div style={{ animation: 'comicFade 0.8s ease-out 1.2s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'I messed up but I care about you too much to let it slide!'}</div>
    </div>
  );
}

/* ── Template 16: Sorry Mend ── */
function SorryMend({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes heartSplit { 0% { clip-path: polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%); filter: grayscale(0.5); } 40% { clip-path: polygon(0% 0%, 48% 0%, 48% 100%, 0% 100%); filter: grayscale(0.8); } 100% { clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%); filter: grayscale(0); } }
        @keyframes stitchLine { 0% { stroke-dashoffset: 100; opacity: 0; } 50% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: 0; opacity: 1; } }
        @keyframes mendGlow { 0%, 100% { filter: drop-shadow(0 0 6px ${accent}44); } 50% { filter: drop-shadow(0 0 18px ${accent}aa); } }
        @keyframes mendTextFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${15 + Math.random() * 70}%`, left: `${10 + Math.random() * 80}%`, animation: `mendGlow ${2 + Math.random() * 1.5}s ease-in-out infinite`, animationDelay: `${i * 0.4}s`, fontSize: '8px', color: accent }}>✦</div>
      ))}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div style={{ fontSize: '56px', animation: 'heartSplit 3s ease-in-out forwards' }}>💔</div>
        <svg style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', overflow: 'visible' }} width="20" height="56" viewBox="0 0 20 56">
          <line x1="10" y1="0" x2="10" y2="56" stroke={accent} strokeWidth="2" strokeDasharray="4,3" style={{ animation: 'stitchLine 2s ease-out 0.5s both' }} />
        </svg>
      </div>
      <div style={{ animation: 'mendTextFade 0.8s ease-out 2s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Let&apos;s Mend This</div>
      <div style={{ animation: 'mendTextFade 0.8s ease-out 2.2s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Dear'}</div>
      <div style={{ animation: 'mendTextFade 0.8s ease-out 2.4s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'I know I broke something, but I want to put it back together.'}</div>
    </div>
  );
}

/* ── Template 17: Birthday Balloons ── */
function BirthdayBalloons({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes balloonFloat { 0% { transform: translateY(100vh) rotate(-5deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(-10vh) rotate(5deg); opacity: 0; } }
        @keyframes balloonSway { 0%, 100% { transform: translateX(0) rotate(-3deg); } 50% { transform: translateX(15px) rotate(3deg); } }
        @keyframes balloonPop { 0% { transform: scale(0); } 60% { transform: scale(1.3); } 100% { transform: scale(1); } }
        @keyframes balloonConfetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(80px) rotate(360deg); opacity: 0; } }
        @keyframes balloonFadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(8)].map((_, i) => {
        const colors = ['#e91e8c', '#D9AC3D', '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6'];
        return (
          <div key={i} style={{ position: 'absolute', bottom: '-20px', left: `${5 + i * 12}%`, fontSize: '32px', animation: `balloonFloat ${5 + Math.random() * 3}s ease-in infinite`, animationDelay: `${i * 0.5}s`, animationName: 'balloonFloat, balloonSway', animationDuration: `${5 + Math.random() * 3}s, ${2 + Math.random()}s`, animationTimingFunction: 'ease-in, ease-in-out', animationIterationCount: 'infinite' }}>🎈</div>
        );
      })}
      {[...Array(15)].map((_, i) => (
        <div key={`c${i}`} style={{ position: 'absolute', top: `${10 + Math.random() * 80}%`, left: `${Math.random() * 100}%`, width: '5px', height: '5px', borderRadius: i % 2 === 0 ? '50%' : '1px', background: accent, animation: `balloonConfetti ${2 + Math.random() * 2}s linear infinite`, animationDelay: `${Math.random() * 3}s` }} />
      ))}
      <div style={{ animation: 'balloonPop 0.6s ease-out', fontSize: '48px', marginBottom: '16px', zIndex: 1 }}>🎉</div>
      <div style={{ animation: 'balloonFadeUp 0.8s ease-out 0.3s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px', zIndex: 1 }}>Happy Birthday!</div>
      <div style={{ animation: 'balloonFadeUp 0.8s ease-out 0.5s both', color: text, fontSize: '24px', fontWeight: 900, textAlign: 'center', marginBottom: '8px', zIndex: 1 }}>{name || 'Birthday Star'}</div>
      <div style={{ animation: 'balloonFadeUp 0.8s ease-out 0.7s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5, zIndex: 1 }}>{message || 'Sending you a sky full of love and good vibes!'}</div>
    </div>
  );
}

/* ── Template 18: Birthday Age ── */
function BirthdayAge({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes ageCount { 0% { content: '0'; } }
        @keyframes ageFlash { 0%, 80%, 100% { opacity: 1; } 90% { opacity: 0.3; } }
        @keyframes agePopIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.4); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes agePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes ageGlowRing { 0% { box-shadow: 0 0 10px ${accent}33; } 50% { box-shadow: 0 0 30px ${accent}88; } 100% { box-shadow: 0 0 10px ${accent}33; } }
        @keyframes ageFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(10)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, fontSize: '10px', animation: `agePopIn 0.5s ease-out ${i * 0.1}s both, agePulse 2s ease-in-out ${i * 0.1}s infinite`, color: `${accent}55` }}>🎂</div>
      ))}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', border: `4px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'agePulse 2s ease-in-out infinite, ageGlowRing 2s ease-in-out infinite' }}>
          <span style={{ fontSize: '40px', fontWeight: 900, color: accent, animation: 'ageFlash 1s ease-in-out 0.5s 3' }} id="ageCounter">25</span>
        </div>
      </div>
      <div style={{ animation: 'ageFadeUp 0.8s ease-out 1s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Happy Birthday!</div>
      <div style={{ animation: 'ageFadeUp 0.8s ease-out 1.2s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Birthday Star'}</div>
      <div style={{ animation: 'ageFadeUp 0.8s ease-out 1.4s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Another year of being absolutely amazing!'}</div>
    </div>
  );
}

/* ── Template 19: Birthday Candles ── */
function BirthdayCandles({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes candleFlame { 0%, 100% { transform: scaleY(1) scaleX(1) rotate(0deg); opacity: 1; } 20% { transform: scaleY(1.2) scaleX(0.85) rotate(-2deg); } 40% { transform: scaleY(0.85) scaleX(1.15) rotate(2deg); } 60% { transform: scaleY(1.1) scaleX(0.9) rotate(-1deg); } 80% { transform: scaleY(0.95) scaleX(1.05) rotate(1deg); } }
        @keyframes waxDrip { 0% { height: 0; opacity: 0; } 30% { opacity: 0.7; } 100% { height: 20px; opacity: 0.4; } }
        @keyframes candleGlow { 0%, 100% { box-shadow: 0 0 20px ${accent}44; } 50% { box-shadow: 0 0 40px ${accent}88; } }
        @keyframes candleFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <div style={{ fontSize: '20px', animation: `candleFlame ${0.3 + Math.random() * 0.2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s`, transformOrigin: 'bottom center' }}>🔥</div>
            <div style={{ width: '8px', height: '36px', background: `linear-gradient(180deg, ${accent}cc, ${accent}88)`, borderRadius: '2px 2px 0 0', position: 'relative' }}>
              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', width: '4px', background: `${accent}66`, borderRadius: '2px', animation: `waxDrip 3s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ animation: 'candleFadeUp 0.8s ease-out 1s both, candleGlow 2s ease-in-out infinite', fontSize: '48px', marginBottom: '12px' }}>🎂</div>
      <div style={{ animation: 'candleFadeUp 0.8s ease-out 1.2s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Make a Wish!</div>
      <div style={{ animation: 'candleFadeUp 0.8s ease-out 1.4s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Birthday Star'}</div>
      <div style={{ animation: 'candleFadeUp 0.8s ease-out 1.6s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'May all your wishes come true today!'}</div>
    </div>
  );
}

/* ── Template 20: Birthday Disco ── */
function BirthdayDisco({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes discoSpin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
        @keyframes discoRays { 0% { transform: rotate(0deg); opacity: 0.4; } 100% { transform: rotate(360deg); opacity: 0.8; } }
        @keyframes discoBallBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes discoFlicker { 0%, 100% { opacity: 0.6; } 33% { opacity: 1; } 66% { opacity: 0.4; } }
        @keyframes discoFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '200px', background: `linear-gradient(180deg, ${accent}88, transparent)`, transformOrigin: 'top center', transform: `rotate(${i * 45}deg)`, animation: 'discoRays 6s linear infinite', animationDelay: `${i * 0.2}s`, opacity: 0.3 }} />
      ))}
      <div style={{ animation: 'discoBallBounce 2s ease-in-out infinite', perspective: '300px', marginBottom: '16px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `linear-gradient(135deg, #ccc 0%, #fff 25%, #999 50%, #ddd 75%, #aaa 100%)`, animation: 'discoSpin 4s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 30px ${accent}44`, position: 'relative', overflow: 'hidden' }}>
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{ position: 'absolute', width: '4px', height: '4px', borderRadius: '50%', background: '#fff', top: `${10 + (i % 4) * 22}%`, left: `${10 + Math.floor(i / 4) * 30}%`, animation: `discoFlicker ${0.5 + Math.random() * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
      <div style={{ animation: 'discoFadeUp 0.8s ease-out 0.5s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Happy Birthday!</div>
      <div style={{ animation: 'discoFadeUp 0.8s ease-out 0.7s both', color: text, fontSize: '24px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Party Star'}</div>
      <div style={{ animation: 'discoFadeUp 0.8s ease-out 0.9s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Time to celebrate — it\'s YOUR night on the dance floor!'}</div>
    </div>
  );
}

/* ── Template 21: Hi Ship ── */
function HiShip({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes shipRock { 0%, 100% { transform: rotate(-3deg) translateY(0); } 50% { transform: rotate(3deg) translateY(-5px); } }
        @keyframes waveMove { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes shipFlag { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
        @keyframes welcomeBounce { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes shipFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(3)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', bottom: `${15 + i * 8}%`, left: '-10%', width: '200%', height: '20px', borderRadius: '50%', background: `linear-gradient(90deg, transparent, ${accent}22, ${accent}44, ${accent}22, transparent)`, animation: `waveMove ${3 + i}s linear infinite`, animationDelay: `${i * 0.5}s` }} />
      ))}
      <div style={{ animation: 'shipRock 3s ease-in-out infinite', fontSize: '56px', marginBottom: '16px', position: 'relative' }}>
        🚢
        <span style={{ position: 'absolute', top: '-8px', right: '-4px', fontSize: '14px', animation: 'shipFlag 1s ease-in-out infinite' }}>🚩</span>
      </div>
      <div style={{ animation: 'welcomeBounce 0.6s ease-out', color: accent, fontSize: '20px', fontWeight: 900, marginBottom: '8px', fontFamily: 'monospace' }}>Welcome Aboard!</div>
      <div style={{ animation: 'shipFadeUp 0.8s ease-out 0.5s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Traveler'}</div>
      <div style={{ animation: 'shipFadeUp 0.8s ease-out 0.7s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Ahoy! Just wanted to set sail into your heart!'}</div>
    </div>
  );
}

/* ── Template 22: Hi Sunrise ── */
function HiSunrise({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes sunRise { 0% { transform: translateY(40px) scale(0.8); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes sunGlow { 0%, 100% { box-shadow: 0 0 20px ${accent}66, 0 0 40px ${accent}33; } 50% { box-shadow: 0 0 40px ${accent}aa, 0 0 80px ${accent}66; } }
        @keyframes horizonLine { 0% { width: 0; opacity: 0; } 100% { width: 100%; opacity: 1; } }
        @keyframes warmthPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes sunriseFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: '45%', left: '50%', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${accent}22 0%, transparent 70%)`, transform: `translate(-50%, -50%) scale(${0.5 + i * 0.3})`, animation: `warmthPulse ${2 + i * 0.5}s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }} />
      ))}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <div style={{ animation: 'sunRise 1.5s ease-out, sunGlow 3s ease-in-out 1.5s infinite', width: '80px', height: '80px', borderRadius: '50%', background: `linear-gradient(135deg, ${accent}, ${accent}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>☀️</div>
      </div>
      <div style={{ width: '100%', maxWidth: '200px', height: '2px', background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`, animation: 'horizonLine 1.5s ease-out 0.5s both', marginBottom: '20px' }} />
      <div style={{ animation: 'sunriseFadeUp 0.8s ease-out 1.5s both', color: accent, fontSize: '20px', fontWeight: 900, marginBottom: '8px' }}>Good Morning!</div>
      <div style={{ animation: 'sunriseFadeUp 0.8s ease-out 1.7s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Sunshine'}</div>
      <div style={{ animation: 'sunriseFadeUp 0.8s ease-out 1.9s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'A brand new day, and I wanted to say hi first!'}</div>
    </div>
  );
}

/* ── Template 23: Hi Hand ── */
function HiHand({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes handWave { 0% { transform: rotate(0deg); } 15% { transform: rotate(20deg); } 30% { transform: rotate(-15deg); } 45% { transform: rotate(15deg); } 60% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } 100% { transform: rotate(0deg); } }
        @keyframes helloBounce { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.1); } }
        @keyframes hiSparkle { 0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(180deg); } }
        @keyframes hiFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${20 + Math.random() * 60}%`, left: `${10 + Math.random() * 80}%`, animation: `hiSparkle ${1.5 + Math.random()}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`, fontSize: '12px', color: accent }}>✨</div>
      ))}
      <div style={{ animation: 'handWave 2s ease-in-out infinite', fontSize: '64px', marginBottom: '12px', transformOrigin: '70% 70%' }}>👋</div>
      <div style={{ animation: 'helloBounce 1.5s ease-in-out infinite', color: accent, fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>Hello!</div>
      <div style={{ animation: 'hiFadeUp 0.8s ease-out 0.5s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Friend'}</div>
      <div style={{ animation: 'hiFadeUp 0.8s ease-out 0.7s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Hey! Just dropping in to say hi and brighten your day!'}</div>
    </div>
  );
}

/* ── Template 24: Thank Heart ── */
function ThankHeart({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes heartBeat { 0%, 100% { transform: scale(1); } 10% { transform: scale(1.15); } 20% { transform: scale(1); } 30% { transform: scale(1.1); } 40% { transform: scale(1); } }
        @keyframes heartGlow { 0%, 100% { filter: drop-shadow(0 0 8px ${accent}66); } 50% { filter: drop-shadow(0 0 20px ${accent}); } }
        @keyframes thankPulse { 0%, 100% { opacity: 0.6; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes thankFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${15 + Math.random() * 70}%`, left: `${10 + Math.random() * 80}%`, animation: `thankPulse ${1.5 + Math.random()}s ease-in-out infinite`, animationDelay: `${i * 0.2}s`, fontSize: '14px' }}>❤️</div>
      ))}
      <div style={{ animation: 'heartBeat 1.5s ease-in-out infinite, heartGlow 2s ease-in-out infinite', fontSize: '64px', marginBottom: '16px' }}>❤️</div>
      <div style={{ animation: 'thankFadeUp 0.8s ease-out 0.5s both', color: accent, fontSize: '24px', fontWeight: 900, marginBottom: '8px', textShadow: `0 0 10px ${accent}44` }}>Thank You</div>
      <div style={{ animation: 'thankFadeUp 0.8s ease-out 0.7s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Dear'}</div>
      <div style={{ animation: 'thankFadeUp 0.8s ease-out 0.9s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'My heart is full of gratitude for you.'}</div>
    </div>
  );
}

/* ── Template 25: Thank Trophy ── */
function ThankTrophy({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes trophyAppear { 0% { transform: translateY(-40px) scale(0.5); opacity: 0; } 60% { transform: translateY(5px) scale(1.1); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes trophyShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes trophyRays { 0% { transform: rotate(0deg); opacity: 0.3; } 50% { opacity: 0.6; } 100% { transform: rotate(360deg); opacity: 0.3; } }
        @keyframes trophyBadge { 0% { transform: scale(0) rotate(-10deg); } 60% { transform: scale(1.1) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes trophyFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(8)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', width: '2px', height: '120px', background: `linear-gradient(180deg, ${accent}66, transparent)`, transformOrigin: 'top center', transform: `rotate(${i * 45}deg)`, animation: 'trophyRays 4s linear infinite', animationDelay: `${i * 0.2}s`, opacity: 0.2 }} />
      ))}
      <div style={{ animation: 'trophyAppear 1s ease-out', fontSize: '56px', marginBottom: '12px', position: 'relative', zIndex: 1 }}>🏆</div>
      <div style={{ animation: 'trophyBadge 0.6s ease-out 0.8s both', background: `linear-gradient(90deg, ${accent}, #fff, ${accent})`, backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'trophyShimmer 3s linear infinite', fontSize: '11px', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '12px', padding: '4px 16px' }}>★ TOP CONTRIBUTORS ★</div>
      <div style={{ animation: 'trophyFadeUp 0.8s ease-out 1s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Thank You!</div>
      <div style={{ animation: 'trophyFadeUp 0.8s ease-out 1.2s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Champion'}</div>
      <div style={{ animation: 'trophyFadeUp 0.8s ease-out 1.4s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Your generosity deserves the highest award.'}</div>
    </div>
  );
}

/* ── Template 26: Thank Flowers ── */
function ThankFlowers({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes petalDrift { 0% { transform: translateY(-10%) rotate(0deg) translateX(0); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110%) rotate(360deg) translateX(var(--drift)); opacity: 0; } }
        @keyframes flowerBloom { 0% { transform: scale(0) rotate(-30deg); } 60% { transform: scale(1.15) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes flowerGlow { 0%, 100% { filter: drop-shadow(0 0 6px ${accent}44); } 50% { filter: drop-shadow(0 0 16px ${accent}88); } }
        @keyframes thankPetalFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(20)].map((_, i) => {
        const petals = ['🌸', '🌺', '🌷', '🌻', '🌼'];
        return (
          <div key={i} style={{ position: 'absolute', top: '-10px', left: `${Math.random() * 100}%`, fontSize: '16px', animation: `petalDrift ${4 + Math.random() * 3}s linear infinite`, animationDelay: `${i * 0.3}s`, '--drift': `${-30 + Math.random() * 60}px` }}>{petals[i % 5]}</div>
        );
      })}
      <div style={{ animation: 'flowerBloom 0.8s ease-out, flowerGlow 2s ease-in-out infinite', fontSize: '56px', marginBottom: '16px' }}>💐</div>
      <div style={{ animation: 'thankPetalFade 0.8s ease-out 0.5s both', color: accent, fontSize: '24px', fontWeight: 900, marginBottom: '8px' }}>Thank You</div>
      <div style={{ animation: 'thankPetalFade 0.8s ease-out 0.7s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Dear'}</div>
      <div style={{ animation: 'thankPetalFade 0.8s ease-out 0.9s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'A bouquet of gratitude for everything you do.'}</div>
    </div>
  );
}

/* ── Template 27: Miss Stars ── */
function MissStars({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes starTwinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes constellationLine { 0% { stroke-dashoffset: 200; opacity: 0; } 100% { stroke-dashoffset: 0; opacity: 0.6; } }
        @keyframes missYouFade { 0% { opacity: 0; transform: scale(0.5); filter: blur(4px); } 100% { opacity: 1; transform: scale(1); filter: blur(0); } }
        @keyframes starGlow { 0%, 100% { filter: drop-shadow(0 0 4px ${accent}44); } 50% { filter: drop-shadow(0 0 12px ${accent}aa); } }
        @keyframes missFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(25)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px`, borderRadius: '50%', background: '#fff', animation: `starTwinkle ${1.5 + Math.random() * 2}s ease-in-out infinite`, animationDelay: `${i * 0.15}s` }} />
      ))}
      <div style={{ position: 'relative', width: '200px', height: '100px', marginBottom: '16px' }}>
        <svg width="200" height="100" viewBox="0 0 200 100" style={{ position: 'absolute', top: 0, left: 0 }}>
          <line x1="20" y1="50" x2="55" y2="20" stroke={accent} strokeWidth="1" strokeDasharray="4,2" style={{ animation: 'constellationLine 2s ease-out 0.5s both' }} />
          <line x1="55" y1="20" x2="90" y2="50" stroke={accent} strokeWidth="1" strokeDasharray="4,2" style={{ animation: 'constellationLine 2s ease-out 0.8s both' }} />
          <line x1="90" y1="50" x2="110" y2="20" stroke={accent} strokeWidth="1" strokeDasharray="4,2" style={{ animation: 'constellationLine 2s ease-out 1.1s both' }} />
          <line x1="110" y1="20" x2="145" y2="50" stroke={accent} strokeWidth="1" strokeDasharray="4,2" style={{ animation: 'constellationLine 2s ease-out 1.4s both' }} />
          <line x1="145" y1="50" x2="180" y2="20" stroke={accent} strokeWidth="1" strokeDasharray="4,2" style={{ animation: 'constellationLine 2s ease-out 1.7s both' }} />
        </svg>
        {[{ x: 20, y: 50 }, { x: 55, y: 20 }, { x: 90, y: 50 }, { x: 110, y: 20 }, { x: 145, y: 50 }, { x: 180, y: 20 }].map((pos, i) => (
          <div key={i} style={{ position: 'absolute', left: pos.x - 6, top: pos.y - 6, width: '12px', height: '12px', borderRadius: '50%', background: accent, animation: `starGlow 2s ease-in-out infinite, starTwinkle ${2 + i * 0.3}s ease-in-out infinite`, animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
      <div style={{ animation: 'missYouFade 1s ease-out 1.5s both', color: accent, fontSize: '28px', fontWeight: 900, marginBottom: '8px' }}>MISS YOU</div>
      <div style={{ animation: 'missFadeUp 0.8s ease-out 2s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Someone Special'}</div>
      <div style={{ animation: 'missFadeUp 0.8s ease-out 2.2s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Even across the stars, I think of you.'}</div>
    </div>
  );
}

/* ── Template 28: Miss Calendar ── */
function MissCalendar({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes pageFlip { 0% { transform: perspective(400px) rotateX(0deg); opacity: 1; } 100% { transform: perspective(400px) rotateX(-90deg); opacity: 0; } }
        @keyframes pageStack { 0% { transform: translateY(-5px); opacity: 0.8; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes calHighlight { 0%, 100% { background: ${accent}22; } 50% { background: ${accent}44; } }
        @keyframes calStarBurst { 0% { transform: scale(0) rotate(0deg); opacity: 1; } 100% { transform: scale(2) rotate(180deg); opacity: 0; } }
        @keyframes missCalendarFade { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: '35%', left: '50%', transform: `translate(-50%, ${-10 - i * 5}px)`, width: '80px', height: '100px', background: '#fff', borderRadius: '4px', border: `1px solid ${accent}33`, animation: `pageFlip 1.5s ease-in ${i * 0.4}s both`, transformOrigin: 'top center', opacity: 0.8 - i * 0.1 }}>
          <div style={{ height: '20px', background: accent, borderRadius: '4px 4px 0 0' }} />
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#333', textAlign: 'center', marginTop: '16px' }}>{15 + i}</div>
        </div>
      ))}
      <div style={{ position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, 0)', width: '80px', height: '100px', background: '#fff', borderRadius: '4px', border: `2px solid ${accent}`, animation: 'calHighlight 2s ease-in-out infinite', zIndex: 10 }}>
        <div style={{ height: '20px', background: accent, borderRadius: '4px 4px 0 0' }} />
        <div style={{ fontSize: '24px', fontWeight: 900, color: accent, textAlign: 'center', marginTop: '16px' }}>19</div>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', top: '50%', left: '50%', animation: `calStarBurst 1.5s ease-out infinite`, animationDelay: `${i * 0.5}s` }}>
            <svg width="20" height="20" viewBox="0 0 20 20"><polygon points="10,0 12,7 20,7 14,12 16,20 10,15 4,20 6,12 0,7 8,7" fill={accent} /></svg>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '140px', animation: 'missCalendarFade 0.8s ease-out 1.5s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Missing You Since...</div>
      <div style={{ animation: 'missCalendarFade 0.8s ease-out 1.7s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'My Person'}</div>
      <div style={{ animation: 'missCalendarFade 0.8s ease-out 1.9s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'Every day without you feels like it\'s marked in red.'}</div>
    </div>
  );
}

/* ── Template 29: Congrats Medal ── */
function CongratsMedal({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes medalDrop { 0% { transform: translateY(-60px) scale(0.5); opacity: 0; } 60% { transform: translateY(8px) scale(1.1); opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes medalSwing { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        @keyframes medalShimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes ribbonWave { 0%, 100% { transform: skewX(0deg); } 50% { transform: skewX(5deg); } }
        @keyframes medalFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ position: 'absolute', top: `${15 + Math.random() * 70}%`, left: `${10 + Math.random() * 80}%`, animation: `medalShimmer 3s linear infinite`, animationDelay: `${i * 0.3}s`, fontSize: '10px', color: accent }}>✦</div>
      ))}
      <div style={{ animation: 'medalDrop 1s ease-out, medalSwing 3s ease-in-out 1s infinite', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '-4px' }}>
          <div style={{ width: '20px', height: '40px', background: `linear-gradient(135deg, #e91e8c, #ff6b6b)`, borderRadius: '2px', animation: 'ribbonWave 2s ease-in-out infinite' }} />
          <div style={{ width: '20px', height: '40px', background: `linear-gradient(135deg, #3b82f6, #06b6d4)`, borderRadius: '2px', animation: 'ribbonWave 2s ease-in-out 0.5s infinite' }} />
        </div>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: `linear-gradient(135deg, ${accent}, ${accent}cc, #fff, ${accent})`, backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${accent}`, boxShadow: `0 4px 20px ${accent}66`, position: 'relative' }}>
          <span style={{ fontSize: '32px', background: `linear-gradient(135deg, ${accent}, #fff, ${accent})`, backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'medalShimmer 3s linear infinite', fontWeight: 900 }}>★</span>
        </div>
      </div>
      <div style={{ animation: 'medalFadeUp 0.8s ease-out 1s both', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Congratulations!</div>
      <div style={{ animation: 'medalFadeUp 0.8s ease-out 1.2s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Champion'}</div>
      <div style={{ animation: 'medalFadeUp 0.8s ease-out 1.4s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'You earned this! A gold medal moment for you.'}</div>
    </div>
  );
}

/* ── Template 30: Congrats Level ── */
function CongratsLevel({ name, message, theme }) {
  const accent = theme?.accent || '#D9AC3D';
  const bg = theme?.bg || '#0a0a02';
  const text = theme?.text || '#fff';
  return (
    <div style={{ background: bg, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes progressFill { 0% { width: 0%; } 100% { width: 100%; } }
        @keyframes progressGlow { 0%, 100% { box-shadow: 0 0 10px ${accent}44; } 50% { box-shadow: 0 0 25px ${accent}aa; } }
        @keyframes levelUpBounce { 0% { transform: scale(0) rotate(-10deg); } 50% { transform: scale(1.3) rotate(5deg); } 100% { transform: scale(1) rotate(0deg); } }
        @keyframes levelUpFlash { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes levelUpParticles { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; } }
        @keyframes levelFadeUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      {[...Array(10)].map((_, i) => {
        const angle = (i / 10) * 360;
        const px = Math.cos(angle * Math.PI / 180) * 80;
        const py = Math.sin(angle * Math.PI / 180) * 80;
        return (
          <div key={i} style={{ position: 'absolute', top: '35%', left: '50%', width: '6px', height: '6px', borderRadius: '50%', background: accent, '--px': `${px}px`, '--py': `${py}px`, animation: `levelUpParticles 1.5s ease-out 2.5s both`, animationDelay: `${i * 0.05}s` }} />
        );
      })}
      <div style={{ animation: 'levelFadeUp 0.8s ease-out', color: accent, fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>LEVEL COMPLETE</div>
      <div style={{ width: '240px', height: '28px', borderRadius: '14px', background: `${accent}22`, border: `2px solid ${accent}44`, overflow: 'hidden', position: 'relative', animation: 'progressGlow 2s ease-in-out infinite', marginBottom: '16px' }}>
        <div style={{ height: '100%', borderRadius: '12px', background: `linear-gradient(90deg, ${accent}88, ${accent})`, animation: 'progressFill 3s ease-out 0.5s both', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '8px' }}>
          <span style={{ fontSize: '10px', fontWeight: 900, color: '#000' }}>100%</span>
        </div>
      </div>
      <div style={{ animation: 'levelUpBounce 0.8s ease-out 3.5s both', fontSize: '48px', marginBottom: '12px' }}>🚀</div>
      <div style={{ animation: 'levelUpBounce 0.6s ease-out 3.8s both, levelUpFlash 1s ease-in-out 4.5s 3', color: accent, fontSize: '28px', fontWeight: 900, marginBottom: '8px', textShadow: `0 0 10px ${accent}, 0 0 20px ${accent}88` }}>LEVEL UP!</div>
      <div style={{ animation: 'levelFadeUp 0.8s ease-out 4.2s both', color: text, fontSize: '22px', fontWeight: 900, textAlign: 'center', marginBottom: '8px' }}>{name || 'Player'}</div>
      <div style={{ animation: 'levelFadeUp 0.8s ease-out 4.4s both', color: `${text}aa`, fontSize: '12px', textAlign: 'center', maxWidth: '260px', lineHeight: 1.5 }}>{message || 'You just leveled up! Next adventure awaits!'}</div>
    </div>
  );
}

export const TEMPLATES = [
  { key: 'propose-hearts', name: 'Will You Marry Me?', category: 'propose', description: 'Floating hearts with a glowing ring', emoji: '💍', component: ProposeHearts },
  { key: 'propose-rose', name: 'Be Mine', category: 'propose', description: 'Falling rose petals with romance', emoji: '🌹', component: ProposeRose },
  { key: 'sorry-heartbreak', name: "I'm Sorry", category: 'sorry', description: 'A broken heart that mends itself', emoji: '💔', component: SorryHeartbreak },
  { key: 'birthday-cake', name: 'Happy Birthday!', category: 'birthday', description: 'Flickering candles and confetti', emoji: '🎂', component: BirthdayCake },
  { key: 'birthday-confetti', name: "It's Your Day!", category: 'birthday', description: 'Explosive confetti celebration', emoji: '🎉', component: BirthdayConfetti },
  { key: 'hi-wave', name: 'Hey There!', category: 'hi', description: 'Waving hand with bouncy text', emoji: '👋', component: HiWave },
  { key: 'hi-neon', name: 'Hello!', category: 'hi', description: 'Neon sign flicker effect', emoji: '💡', component: HiNeon },
  { key: 'thankyou-golden', name: 'Thank You', category: 'thankyou', description: 'Golden shimmer text reveal', emoji: '🙏', component: ThankYouGolden },
  { key: 'missyou-moon', name: 'Missing You', category: 'missyou', description: 'Moon glow with twinkling stars', emoji: '🌙', component: MissYouMoon },
  { key: 'congrats-trophy', name: 'Congratulations!', category: 'congrats', description: 'Trophy with achievement badge', emoji: '🏆', component: CongratsTrophy },
  { key: 'propose-box', name: 'Ring Box', category: 'propose', description: 'Ring box opening animation', emoji: '📦', component: ProposeBox },
  { key: 'propose-glow', name: 'Will You?', category: 'propose', description: 'Pulsing glow text proposal', emoji: '✨', component: ProposeGlow },
  { key: 'propose-infinity', name: 'Forever & Always', category: 'propose', description: 'Infinity symbol with particle trail', emoji: '♾️', component: ProposeInfinity },
  { key: 'sorry-kneel', name: 'I\'m So Sorry', category: 'sorry', description: 'Kneeling figure with apology', emoji: '🙇', component: SorryKneel },
  { key: 'sorry-comic', name: 'MY BAD!', category: 'sorry', description: 'Comic-style pop art apology', emoji: '💥', component: SorryComic },
  { key: 'sorry-mend', name: 'Let\'s Mend This', category: 'sorry', description: 'Broken heart stitches together', emoji: '🩹', component: SorryMend },
  { key: 'birthday-balloons', name: 'Up in the Air', category: 'birthday', description: 'Floating balloons with confetti', emoji: '🎈', component: BirthdayBalloons },
  { key: 'birthday-age', name: 'Count It Up', category: 'birthday', description: 'Number counter to your age', emoji: '🔢', component: BirthdayAge },
  { key: 'birthday-candles', name: 'Make a Wish!', category: 'birthday', description: 'Flickering candles with wax drip', emoji: '🕯️', component: BirthdayCandles },
  { key: 'birthday-disco', name: 'Party Time', category: 'birthday', description: 'Disco ball with rotating light rays', emoji: '🪩', component: BirthdayDisco },
  { key: 'hi-ship', name: 'Welcome Aboard', category: 'hi', description: 'Ship sailing on waves', emoji: '🚢', component: HiShip },
  { key: 'hi-sunrise', name: 'Good Morning', category: 'hi', description: 'Sun rising over horizon with glow', emoji: '☀️', component: HiSunrise },
  { key: 'hi-hand', name: 'Hello!', category: 'hi', description: 'Waving hand with bouncing text', emoji: '✋', component: HiHand },
  { key: 'thankyou-heart', name: 'Thank You', category: 'thankyou', description: 'Beating heart with gratitude', emoji: '❤️', component: ThankHeart },
  { key: 'thankyou-trophy', name: 'Top Contributors', category: 'thankyou', description: 'Trophy with gold shimmer', emoji: '🥇', component: ThankTrophy },
  { key: 'thankyou-flowers', name: 'Thank You', category: 'thankyou', description: 'Flower petals falling from above', emoji: '💐', component: ThankFlowers },
  { key: 'missyou-stars', name: 'MISS YOU', category: 'missyou', description: 'Starfield constellation message', emoji: '⭐', component: MissStars },
  { key: 'missyou-calendar', name: 'Missing You Since...', category: 'missyou', description: 'Calendar pages with date highlight', emoji: '📅', component: MissCalendar },
  { key: 'congrats-medal', name: 'Gold Medal', category: 'congrats', description: 'Medal dropping down with ribbon', emoji: '🏅', component: CongratsMedal },
  { key: 'congrats-level', name: 'LEVEL UP!', category: 'congrats', description: 'Progress bar filling to 100%', emoji: '🚀', component: CongratsLevel },
];
