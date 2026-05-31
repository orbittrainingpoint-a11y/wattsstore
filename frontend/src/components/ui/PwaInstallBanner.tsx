'use client';

/**
 * PWA "Add to Home Screen" install banner.
 *
 * HOW IT WORKS:
 * 1. The browser fires `beforeinstallprompt` when the site meets the PWA installability
 *    criteria (HTTPS, manifest.json, at least one icon, service worker optional but helps).
 *    We intercept and suppress the browser's own mini-infobar by calling e.preventDefault().
 * 2. We store the event in a ref. When the user clicks "Install App" we call
 *    deferredPrompt.prompt() which shows the browser's native install dialog.
 * 3. We track visit count in localStorage. The banner appears on the first visit and
 *    again after every 10 subsequent visits, so it's persistent but not annoying.
 *
 * iOS Safari does NOT fire `beforeinstallprompt`. We detect it via
 * navigator.standalone and show a manual instruction message instead.
 */

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'pwa_install_visits';
const SHOW_EVERY = 10; // re-show every N visits

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return;

    // Track visit count
    const raw = localStorage.getItem(STORAGE_KEY);
    const count = raw ? Number(raw) : 0;
    const next = count + 1;
    localStorage.setItem(STORAGE_KEY, String(next));

    // Show on visit 1 and on every 10th visit thereafter
    const shouldShow = next === 1 || next % SHOW_EVERY === 0;
    if (!shouldShow) return;

    // iOS Safari: no beforeinstallprompt event — show manual guide
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as Window & { MSStream?: unknown }).MSStream;
    if (ios) {
      setIsIos(true);
      setVisible(true);
      return;
    }

    // Chrome/Android/Desktop — intercept the browser prompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    const { outcome } = await deferredPrompt.current.userChoice;
    if (outcome === 'accepted') {
      // Reset counter so banner doesn't re-appear quickly after install
      localStorage.setItem(STORAGE_KEY, '0');
    }
    deferredPrompt.current = null;
    setVisible(false);
  }

  function dismiss() {
    setDismissed(true);
    setVisible(false);
  }

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[100] card shadow-2xl border border-brand-blue/20 p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <img src="/img/icon-192.png" alt="WattsStore" className="h-12 w-12 rounded-xl shrink-0 shadow-sm" onError={(e) => { (e.target as HTMLImageElement).src = '/img/logo.svg'; }} />
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-sm text-brand-dark">Install WattsStore App</div>
          <div className="text-xs text-brand-gray mt-0.5">
            {isIos
              ? <>Tap the share icon <strong>⎙</strong> then <strong>"Add to Home Screen"</strong> to install.</>
              : 'Get instant access to your catalog, quotes and orders — no app store needed.'}
          </div>
        </div>
        <button onClick={dismiss} className="text-brand-gray hover:text-brand-dark text-lg leading-none shrink-0" aria-label="Dismiss">×</button>
      </div>
      {!isIos && (
        <div className="mt-3 flex gap-2">
          <button onClick={() => void install()} className="btn-primary btn-sm flex-1">Install App</button>
          <button onClick={dismiss} className="btn-outline btn-sm">Not now</button>
        </div>
      )}
    </div>
  );
}
