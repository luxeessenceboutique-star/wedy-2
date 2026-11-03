// Session timeout from Settings › Security: signs the user out after N minutes without activity.
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useAppSettings } from '@/lib/appSettings';

const EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'] as const;
const KEY = 'wedy_last_activity';

export function useIdleLogout() {
  const { logout, user } = useAuth();
  const { data } = useAppSettings();
  const minutes = data?.security?.session_timeout ?? 0;

  useEffect(() => {
    if (!user || !minutes) return;
    const limit = minutes * 60_000;
    let last = Date.now();
    // Shared across tabs: activity in one tab keeps the others signed in.
    const mark = () => { last = Date.now(); try { localStorage.setItem(KEY, String(last)); } catch { /* private mode */ } };
    mark();
    const throttled = () => { if (Date.now() - last > 15_000) mark(); };
    EVENTS.forEach(e => window.addEventListener(e, throttled, { passive: true }));
    const timer = window.setInterval(() => {
      let shared = last;
      try { shared = Math.max(last, Number(localStorage.getItem(KEY)) || 0); } catch { /* private mode */ }
      if (Date.now() - shared > limit) logout();
    }, 30_000);
    return () => { EVENTS.forEach(e => window.removeEventListener(e, throttled)); window.clearInterval(timer); };
  }, [user, minutes, logout]);
}
