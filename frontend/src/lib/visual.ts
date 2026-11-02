// Small visual helpers shared by several components (kept out of component files so fast-refresh stays happy).

const AVATAR_GRADIENTS = ['var(--av-0)', 'var(--av-1)', 'var(--av-2)', 'var(--av-3)', 'var(--av-4)', 'var(--av-5)'];

/** Avatar gradient picked by name: (name.charCodeAt(0) + name.length) % 6 */
export function avatarGradient(name: string): string {
  const n = name || 'U';
  return AVATAR_GRADIENTS[(n.charCodeAt(0) + n.length) % AVATAR_GRADIENTS.length];
}

export function initialsOf(name: string): string {
  const parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map(w => w[0]).join('') || 'U').toUpperCase();
}

/** Score ring colors: >=85 green, >=70 teal, otherwise amber. */
export function scoreColor(score: number): string {
  if (score >= 85) return 'var(--success)';
  if (score >= 70) return 'var(--primary-400)';
  return 'var(--warning)';
}

export const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

/** Best display name for the signed-in user: full_name, then profile.full_name, then the email's local part. */
export function displayName(user: { full_name?: string; email?: string; profile?: Record<string, unknown> } | null | undefined): string {
  const fromProfile = typeof user?.profile?.full_name === 'string' ? user.profile.full_name : '';
  return user?.full_name || fromProfile || user?.email?.split('@')[0] || 'User';
}
