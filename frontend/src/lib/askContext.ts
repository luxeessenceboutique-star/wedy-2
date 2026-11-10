// A page can tell the "Ask Wedy" launcher what is worth asking about *this* screen (e.g. the employee whose folder is open).
// Module-level store read with useSyncExternalStore, so providing prompts never triggers a state update inside an effect.
import { useEffect, useSyncExternalStore } from 'react';

let current: string[] | null = null;
const subs = new Set<() => void>();
const set = (p: string[] | null) => { current = p; subs.forEach(f => f()); };

/** The prompts the current page provides, or null (the launcher then uses its per-section suggestions). */
export function useAskPrompts(): string[] | null {
  return useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => current, () => null);
}

/** Register page-specific prompts while this component is mounted. Pass null while the data they mention is still loading. */
export function useProvideAskPrompts(prompts: string[] | null) {
  const key = prompts ? prompts.join('\u0001') : '';
  useEffect(() => {
    set(key ? key.split('\u0001') : null);
    return () => set(null);
  }, [key]);
}
