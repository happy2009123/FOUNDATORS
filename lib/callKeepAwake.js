'use client';

// Keeps a 1:1 call alive while the app is not visible:
// - Web: screen wake-lock so the device/tab doesn't sleep mid-call.
//   (Browsers still freeze a *locked* mobile screen on their own — no web
//   API can prevent that.)
// - Android app: a microphone-type foreground service — the only reliable
//   way to keep mic + WebRTC running while the app is minimized.

let started = false;
let wakeLock = null;
let notifAsked = false;
let removeBtnListener = null;
let hangupFn = null;

async function reacquireWakeLock() {
  try {
    if (typeof navigator !== 'undefined' && navigator.wakeLock?.request && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch {}
}

function onVisibility() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    reacquireWakeLock();
  }
}

export async function beginCallKeepAwake(onHangup) {
  if (onHangup) hangupFn = onHangup;
  if (started) return;
  started = true;
  await reacquireWakeLock();
  try { document.addEventListener('visibilitychange', onVisibility); } catch {}
  try {
    const [{ ForegroundService }, { Capacitor }] = await Promise.all([
      import('@capawesome-team/capacitor-android-foreground-service'),
      import('@capacitor/core'),
    ]);
    if (Capacitor.getPlatform?.() !== 'android') return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default' && !notifAsked) {
      notifAsked = true;
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }
    // 'Hang up' action button on the notification — ends the call without
    // reopening the app (Android emits 'buttonClicked' with the button id).
    if (!removeBtnListener) {
      try {
        const handle = await ForegroundService.addListener('buttonClicked', (data) => {
          if (data?.buttonId === 1 && hangupFn) hangupFn();
        });
        removeBtnListener = () => { try { handle.remove(); } catch {} };
      } catch {}
    }
    await ForegroundService.startForegroundService({
      id: 42,
      title: 'Foundators call in progress',
      body: 'Microphone is on — open the app to hang up.',
      smallIcon: 'ic_call_notification',
      notificationChannelId: 'foundators-call',
      buttons: [{ title: 'Hang up', id: 1 }],
    });
  } catch {}
}

export async function endCallKeepAwake() {
  started = false;
  hangupFn = null;
  if (removeBtnListener) {
    try { removeBtnListener(); } catch {}
    removeBtnListener = null;
  }
  try { document.removeEventListener('visibilitychange', onVisibility); } catch {}
  try {
    if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch {}
  try {
    const { ForegroundService } = await import('@capawesome-team/capacitor-android-foreground-service');
    await ForegroundService.stopForegroundService();
  } catch {}
}
